/*
 * 生成 public/maps/xicheng_streets.geojson
 * 数据来源：OpenStreetMap Nominatim（众包数据，正式展示前请与官方底图核验）
 * 运行位置：项目根目录
 * 命令：node tools/download-xicheng-streets.cjs
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

const STREETS = [
  ['110102001', '西长安街街道'],
  ['110102003', '新街口街道'],
  ['110102007', '月坛街道'],
  ['110102009', '展览路街道'],
  ['110102010', '德胜街道'],
  ['110102011', '金融街街道'],
  ['110102012', '什刹海街道'],
  ['110102013', '大栅栏街道'],
  ['110102014', '天桥街道'],
  ['110102015', '椿树街道'],
  ['110102016', '陶然亭街道'],
  ['110102017', '广安门内街道'],
  ['110102018', '牛街街道'],
  ['110102019', '白纸坊街道'],
  ['110102020', '广安门外街道']
]

const OUTPUT_FILE = path.resolve(__dirname, '../public/maps/xicheng_streets.geojson')
const USER_AGENT = 'XifaZhizhi-MapBoundaryGenerator/1.0 (student-project; one-time boundary download)'
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function requestJson(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/geo+json, application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.5'
      },
      timeout: 30000
    }, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume()
        if (redirectCount >= 3) {
          reject(new Error('重定向次数过多'))
          return
        }
        resolve(requestJson(new URL(response.headers.location, url).toString(), redirectCount + 1))
        return
      }

      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { text += chunk })
      response.on('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${text.slice(0, 180)}`))
          return
        }
        try {
          resolve(JSON.parse(text))
        } catch (error) {
          reject(new Error(`返回内容不是有效 JSON：${error.message}`))
        }
      })
    })

    request.on('timeout', () => request.destroy(new Error('请求超时')))
    request.on('error', reject)
  })
}

function isPolygon(feature) {
  return feature && ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase()
}

function selectBoundary(features, streetName) {
  const target = normalizeText(streetName)
  const polygonFeatures = (features || []).filter(isPolygon)

  return polygonFeatures.find((feature) => {
    const properties = feature.properties || {}
    const candidates = [
      properties.name,
      properties.display_name,
      properties.namedetails?.name,
      properties.namedetails?.['name:zh'],
      properties.namedetails?.['name:zh-Hans']
    ].map(normalizeText)
    const addressText = normalizeText(JSON.stringify(properties.address || {}))
    return candidates.some((text) => text === target || text.includes(target)) &&
      (addressText.includes('西城区') || normalizeText(properties.display_name).includes('西城区'))
  }) || polygonFeatures.find((feature) => {
    const properties = feature.properties || {}
    return normalizeText(properties.display_name).includes(target)
  })
}

async function fetchStreetBoundary(code, streetName) {
  const params = new URLSearchParams({
    q: `${streetName}, 西城区, 北京市, 中国`,
    format: 'geojson',
    polygon_geojson: '1',
    polygon_threshold: '0.000015',
    addressdetails: '1',
    namedetails: '1',
    limit: '10',
    countrycodes: 'cn',
    layer: 'address'
  })
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`
  const result = await requestJson(url)
  const selected = selectBoundary(result.features, streetName)

  if (!selected) {
    throw new Error(`未找到 ${streetName} 的 Polygon/MultiPolygon 边界。可能是 OSM 当前未收录该街道面。`)
  }

  return {
    type: 'Feature',
    properties: {
      ...(selected.properties || {}),
      name: streetName,
      street_name: streetName,
      street_code: code,
      adcode: code,
      data_source: 'OpenStreetMap Nominatim',
      source_osm_type: selected.properties?.osm_type || '',
      source_osm_id: selected.properties?.osm_id || ''
    },
    geometry: selected.geometry
  }
}

async function main() {
  console.log('开始获取西城区 15 个街道边界。为遵守公共服务频率限制，每次请求间隔约 1.3 秒。')
  const features = []
  const failures = []

  for (let index = 0; index < STREETS.length; index += 1) {
    const [code, streetName] = STREETS[index]
    process.stdout.write(`[${index + 1}/${STREETS.length}] ${streetName} ... `)
    try {
      const feature = await fetchStreetBoundary(code, streetName)
      features.push(feature)
      console.log('完成')
    } catch (error) {
      failures.push(`${streetName}：${error.message}`)
      console.log('失败')
    }
    if (index < STREETS.length - 1) await delay(1300)
  }

  if (failures.length) {
    console.error('\n以下街道未能取得完整面边界：')
    failures.forEach((item) => console.error(`- ${item}`))
    console.error('\n未写入不完整的 GeoJSON。可稍后重试，或使用 Overpass Turbo 查询后导出。')
    process.exitCode = 1
    return
  }

  const uniqueNames = new Set(features.map((feature) => feature.properties.name))
  if (features.length !== STREETS.length || uniqueNames.size !== STREETS.length) {
    throw new Error(`边界校验失败：应为 15 个街道，实际为 ${features.length} 个，唯一名称 ${uniqueNames.size} 个。`)
  }

  const output = {
    type: 'FeatureCollection',
    name: '北京市西城区街道边界',
    source: 'OpenStreetMap contributors, ODbL 1.0',
    generated_at: new Date().toISOString(),
    features
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output)}\n`, 'utf8')
  console.log(`\n已生成：${OUTPUT_FILE}`)
  console.log('请重新启动开发服务器并按 Ctrl + F5。正式展示前请对照北京市民政部门发布的行政区域界线底图核验。')
}

main().catch((error) => {
  console.error(`生成失败：${error.stack || error.message}`)
  process.exitCode = 1
})
