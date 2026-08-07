/**
 * echarts-gl 2.0.9 map3D 运行时补丁
 *
 * 原生 map3D 只能通过 data.regionHeight 改变单个街道区块的高度，没有“整块平移”能力。
 * 这里在运行时替换 Geo3DBuilder 的关键方法：
 *   1. 支持 data.offset：把整个立体块（底面/顶面/侧面/棱边高光/名称引线）整体向上平移，
 *      而不是把区块拉高；
 *   2. 高光线从“只画顶面一圈”扩展为 顶面轮廓 + 底面轮廓 + 每个顶点的竖向棱边，
 *      让每个立体块的上表面、下表面、侧面的所有边都有高光；
 *   3. 名称标签锚点跟随 offset 上升，保证街道名称和引线随选中街道一起抬起。
 *
 * 该补丁只依赖 echarts-gl 2.x 的内部实现，patch 失败时组件会回退到旧行为。
 */
import Geo3DBuilder from 'echarts-gl/lib/component/common/Geo3DBuilder'
import glmatrix from 'claygl/src/dep/glmatrix'

const vec3 = glmatrix.vec3

let patched = false

const readRegionOffset = (componentModel: any, dataIndex: number): number => {
  try {
    const regionModel = componentModel.getRegionModel(dataIndex)
    const raw = regionModel.get('offset', true) ?? regionModel.get('regionOffset', true) ?? 0
    const value = Number(raw)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

const patchPolygonGeometry = (proto: any) => {
  const original = proto._updatePolygonGeometry
  if (typeof original !== 'function') return false

  proto._updatePolygonGeometry = function (
    componentModel: any,
    geometry: any,
    dataIndex: number,
    regionHeight: number,
    vertexOffset: number,
    triangleOffset: number,
    color: number[]
  ) {
    const regionOffset = readRegionOffset(componentModel, dataIndex)
    const projectUVOnGround = componentModel.get('projectUVOnGround')

    const positionAttr = geometry.attributes.position
    const normalAttr = geometry.attributes.normal
    const texcoordAttr = geometry.attributes.texcoord0
    const colorAttr = geometry.attributes.color
    const polygons = this._triangulationResults[dataIndex - this._startIndex]
    const hasColor = !!colorAttr.value && !!color
    const indices = geometry.indices
    const extrudeCoordIndex = this.extrudeY ? 1 : 2
    const sideCoordIndex = this.extrudeY ? 2 : 1
    const scale = [
      this.rootNode.worldTransform.x.len(),
      this.rootNode.worldTransform.y.len(),
      this.rootNode.worldTransform.z.len()
    ]
    const min = vec3.mul([], this._geoBoundingBox[0], scale)
    const max = vec3.mul([], this._geoBoundingBox[1], scale)
    const maxDimSize = Math.max(max[0] - min[0], max[2] - min[2])

    const addVertices = (polygon: any, y: number) => {
      const points = polygon.points
      const pointsLen = points.length
      const currentPosition: number[] = []
      const uv: number[] = []

      for (let k = 0; k < pointsLen; k += 3) {
        currentPosition[0] = points[k]
        currentPosition[extrudeCoordIndex] = y + regionOffset
        currentPosition[sideCoordIndex] = points[k + 2]
        uv[0] = (points[k] * scale[0] - min[0]) / maxDimSize
        uv[1] = (points[k + 2] * scale[sideCoordIndex] - min[2]) / maxDimSize
        positionAttr.set(vertexOffset, currentPosition)

        if (hasColor) {
          colorAttr.set(vertexOffset, color)
        }

        texcoordAttr.set(vertexOffset++, uv)
      }
    }

    const buildTopBottom = (polygon: any, y: number) => {
      const startVertexOffset = vertexOffset
      addVertices(polygon, y)
      const len = polygon.indices.length

      for (let k = 0; k < len; k++) {
        indices[triangleOffset * 3 + k] = polygon.indices[k] + startVertexOffset
      }

      triangleOffset += polygon.indices.length / 3
    }

    const normalTop = this.extrudeY ? [0, 1, 0] : [0, 0, 1]
    const normalBottom = vec3.negate([], normalTop)

    for (let p = 0; p < polygons.length; p++) {
      const startVertexOffset = vertexOffset
      const polygon = polygons[p]
      // BOTTOM
      buildTopBottom(polygon, 0)
      // TOP
      buildTopBottom(polygon, regionHeight)
      const ringVertexCount = polygon.points.length / 3

      for (let v = 0; v < ringVertexCount; v++) {
        normalAttr.set(startVertexOffset + v, normalBottom)
        normalAttr.set(startVertexOffset + v + ringVertexCount, normalTop)
      }

      const quadToTriangle = [0, 3, 1, 1, 3, 2]
      const quadPos: number[][] = [[], [], [], []]
      const a: number[] = []
      const b: number[] = []
      const normal: number[] = []
      const uv: number[] = []
      let len = 0

      for (let v = 0; v < ringVertexCount; v++) {
        const next = (v + 1) % ringVertexCount
        const dx = (polygon.points[next * 3] - polygon.points[v * 3]) * scale[0]
        const dy = (polygon.points[next * 3 + 2] - polygon.points[v * 3 + 2]) * scale[sideCoordIndex]
        const sideLen = Math.sqrt(dx * dx + dy * dy)

        for (let k = 0; k < 4; k++) {
          const isCurrent = k === 0 || k === 3
          const idx3 = (isCurrent ? v : next) * 3
          quadPos[k]![0] = polygon.points[idx3]
          quadPos[k]![extrudeCoordIndex] = (k > 1 ? regionHeight : 0) + regionOffset
          quadPos[k]![sideCoordIndex] = polygon.points[idx3 + 2]
          positionAttr.set(vertexOffset + k, quadPos[k]!)

          if (projectUVOnGround) {
            uv[0] = (polygon.points[idx3] * scale[0] - min[0]) / maxDimSize
            uv[1] = (polygon.points[idx3 + 2] * scale[sideCoordIndex] - min[sideCoordIndex]) / maxDimSize
          } else {
            uv[0] = (isCurrent ? len : len + sideLen) / maxDimSize
            uv[1] = (quadPos[k]![extrudeCoordIndex]! * scale[extrudeCoordIndex]! - min[extrudeCoordIndex]!) / maxDimSize
          }

          texcoordAttr.set(vertexOffset + k, uv)
        }

        vec3.sub(a, quadPos[1], quadPos[0])
        vec3.sub(b, quadPos[3], quadPos[0])
        vec3.cross(normal, a, b)
        vec3.normalize(normal, normal)

        for (let k = 0; k < 4; k++) {
          normalAttr.set(vertexOffset + k, normal)

          if (hasColor) {
            colorAttr.set(vertexOffset + k, color)
          }
        }

        for (let k = 0; k < 6; k++) {
          indices[triangleOffset * 3 + k] = quadToTriangle[k]! + vertexOffset
        }

        vertexOffset += 4
        triangleOffset += 2
        len += sideLen
      }
    }

    geometry.dirty()
    return {
      vertexOffset,
      triangleOffset
    }
  }
  return true
}

const patchLinesInfo = (proto: any) => {
  const original = proto._getRegionLinesInfo
  if (typeof original !== 'function') return false

  proto._getRegionLinesInfo = function (idx: number, componentModel: any, geometry: any) {
    let vertexCount = 0
    let triangleCount = 0
    const regionModel = componentModel.getRegionModel(idx)
    const itemStyleModel = regionModel.getModel('itemStyle')
    const lineWidth = itemStyleModel.get('borderWidth')

    if (lineWidth > 0) {
      const polygonCoords = componentModel.getRegionPolygonCoords(idx)
      polygonCoords.forEach((coords: any) => {
        const rings = [coords.exterior].concat(coords.interiors || [])
        rings.forEach((ring: any) => {
          // 顶面轮廓 + 底面轮廓
          vertexCount += geometry.getPolylineVertexCount(ring) * 2
          triangleCount += geometry.getPolylineTriangleCount(ring) * 2
          // 每个顶点的竖向棱边（每个棱边是一条 2 点折线）
          vertexCount += ring.length * geometry.getPolylineVertexCount(2)
          triangleCount += ring.length * geometry.getPolylineTriangleCount(2)
        })
      })
    }

    return {
      vertexCount,
      triangleCount
    }
  }
  return true
}

const patchLinesGeometry = (proto: any) => {
  const original = proto._updateLinesGeometry
  if (typeof original !== 'function') return false

  proto._updateLinesGeometry = function (
    geometry: any,
    componentModel: any,
    dataIndex: number,
    regionHeight: number,
    lineWidth: number,
    transform: any
  ) {
    const regionOffset = readRegionOffset(componentModel, dataIndex)
    const topY = regionHeight + regionOffset + 0.1
    const bottomY = regionOffset + 0.1

    const buildRingPoints = (polygon: any, y: number) => {
      const points = new Float64Array(polygon.length * 3)
      const pos: number[] = []

      for (let i = 0; i < polygon.length; i++) {
        pos[0] = polygon[i][0]
        pos[1] = y
        pos[2] = polygon[i][1]

        if (transform) {
          vec3.transformMat4(pos, pos, transform)
        }

        points[i * 3] = pos[0]!
        points[i * 3 + 1] = pos[1]!
        points[i * 3 + 2] = pos[2]!
      }

      return points
    }

    const buildVerticalPoints = (polygon: any, i: number) => {
      const points = new Float64Array(6)
      const p0: number[] = [polygon[i][0], bottomY, polygon[i][1]]
      const p1: number[] = [polygon[i][0], topY, polygon[i][1]]

      if (transform) {
        vec3.transformMat4(p0, p0, transform)
        vec3.transformMat4(p1, p1, transform)
      }

      points[0] = p0[0]!
      points[1] = p0[1]!
      points[2] = p0[2]!
      points[3] = p1[0]!
      points[4] = p1[1]!
      points[5] = p1[2]!
      return points
    }

    const whiteColor = [1, 1, 1, 1]
    const coords = componentModel.getRegionPolygonCoords(dataIndex)
    coords.forEach((geo: any) => {
      const rings = [geo.exterior].concat(geo.interiors || [])
      rings.forEach((ring: any) => {
        // 顶面轮廓 + 底面轮廓
        geometry.addPolyline(buildRingPoints(ring, topY), whiteColor, lineWidth)
        geometry.addPolyline(buildRingPoints(ring, bottomY), whiteColor, lineWidth)
        // 每个顶点的竖向棱边
        for (let i = 0; i < ring.length; i++) {
          geometry.addPolyline(buildVerticalPoints(ring, i), whiteColor, lineWidth)
        }
      })
    })
  }
  return true
}

const patchLabelRise = (proto: any) => {
  const originalUpdate = proto.update
  if (typeof originalUpdate !== 'function') return false

  proto.update = function (componentModel: any, ecModel: any, api: any, start: number, end: number) {
    const result = originalUpdate.apply(this, arguments)

    const labelsBuilder = this._labelsBuilder
    if (labelsBuilder && typeof labelsBuilder.getLabelPosition === 'function') {
      const originalGetLabelPosition = labelsBuilder.getLabelPosition
      labelsBuilder.getLabelPosition = function (dataIndex: number, positionDesc: any, distance: number) {
        const pos = originalGetLabelPosition(dataIndex, positionDesc, distance)
        const offset = readRegionOffset(componentModel, dataIndex)
        if (Array.isArray(pos)) {
          // dataToPoint 会把 regionHeight 加进高度且忽略 distance，
          // 这里直接以 label.distance + offset 作为名称锚点高度，保证引线/名称随块抬起。
          pos[1] = Number(distance) + offset
        }
        return pos
      }
      if (typeof labelsBuilder.updateLabels === 'function') {
        labelsBuilder.updateLabels()
      }
    }

    // 棱边高光不随街道半透明衰减：把高线材质固定为亮青白、完全不透明，
    // 保证顶/底/侧棱边在真实 GPU 上也清晰可见。
    if (this._linesMesh && this._linesMesh.material && typeof this._linesMesh.material.set === 'function') {
      this._linesMesh.material.set('color', [0.86, 0.97, 1, 1])
    }

    return result
  }
  return true
}

export const isMap3DLiftPatched = () => patched

export const patchMap3DStreetLift = (): boolean => {
  if (patched) return true

  const proto = Geo3DBuilder?.prototype
  if (!proto) return false

  const ok =
    patchPolygonGeometry(proto) &&
    patchLinesInfo(proto) &&
    patchLinesGeometry(proto) &&
    patchLabelRise(proto)

  patched = ok
  return ok
}
