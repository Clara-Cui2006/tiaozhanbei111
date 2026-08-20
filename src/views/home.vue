<template>
  <div class="home-page" :class="{ 'home-page--light': appTheme === 'light' }">
    <section class="hero-section">
      <!--
        底层始终是完整静态背景；上层 SVG 只在湖水路径内复制同一背景并做 displacement。
        白塔、岛岸、道路、建筑、城市灯光都不进入 lake-water-clip，因此不会跟着动画变形。
      -->
      <svg
        ref="waterSvgRef"
        class="water-effect"
        viewBox="0 0 1672 941"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <!--
            湖面路径按 1672×941 原始背景图上的红线边界重新描制，
            并向水域内部轻微收边，避免白塔底座、树木、岸线和陆地参与形变。
          -->
          <path
            id="lake-water-shape"
            d="M732 594
               L743 597 L750 610 L781 614 L858 596 L870 609
               L893 619 L945 621 L972 630 L992 645 L1022 649
               L1041 667 L1073 670 L1078 687 L1111 694 L1132 693
               L1157 680 L1204 680 L1216 667 L1208 660 L1216 642
               L1297 604 L1331 603 L1327 597 L1269 575 L1253 562
               L1219 560 L1185 540 L1130 544 L1094 540 L1080 523
               L1055 518 L1015 493 L950 487 L916 500 L890 503
               L846 495 L825 482 L800 476 L784 479 L759 494
               L743 515 L745 538 L741 543 L758 554 L759 573
               L744 591 Z"
          />
          <clipPath id="lake-water-clip">
            <use href="#lake-water-shape" />
          </clipPath>

          <filter
            id="lake-water-distortion"
            x="-4%"
            y="-8%"
            width="108%"
            height="116%"
            color-interpolation-filters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.024"
              numOctaves="2"
              seed="7"
              result="waterNoise"
            >
              <animate
                attributeName="baseFrequency"
                dur="10s"
                values="0.008 0.024;0.011 0.020;0.009 0.027;0.008 0.024"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="waterNoise"
              scale="7"
              xChannelSelector="R"
              yChannelSelector="B"
            >
              <animate
                attributeName="scale"
                dur="9s"
                values="5;7;6;5"
                repeatCount="indefinite"
              />
            </feDisplacementMap>
          </filter>

          <pattern id="water-glint-pattern" width="232" height="55" patternUnits="userSpaceOnUse">
            <path
              d="M-24 17 C18 7 52 27 96 17 S168 8 205 19"
              fill="none"
              stroke="rgba(117, 224, 255, .34)"
              stroke-width="1.2"
            />
            <path
              d="M-16 31 C22 23 58 38 104 30 S167 23 198 32"
              fill="none"
              stroke="rgba(47, 157, 219, .26)"
              stroke-width="1"
            />
            <animateTransform
              attributeName="patternTransform"
              type="translate"
              values="-44 0;44 4;-44 0"
              dur="13s"
              repeatCount="indefinite"
            />
          </pattern>
        </defs>

        <image
          pointer-events="none"
          href="/images/home-bg-approved.png"
          x="0"
          y="0"
          width="1672"
          height="941"
          preserveAspectRatio="none"
          clip-path="url(#lake-water-clip)"
          filter="url(#lake-water-distortion)"
          opacity=".88"
        />

        <rect
          pointer-events="none"
          x="715"
          y="470"
          width="635"
          height="240"
          fill="url(#water-glint-pattern)"
          clip-path="url(#lake-water-clip)"
          opacity=".22"
        />

        <g class="water-click-ripples" clip-path="url(#lake-water-clip)" pointer-events="none">
          <g
            v-for="ripple in waterRipples"
            :key="ripple.id"
            class="water-ripple-burst"
            :transform="`translate(${ripple.x} ${ripple.y}) scale(1 .34)`"
          >
            <circle class="water-ripple-ring water-ripple-ring-1" cx="0" cy="0" r="5" />
            <circle class="water-ripple-ring water-ripple-ring-2" cx="0" cy="0" r="5" />
            <circle class="water-ripple-ring water-ripple-ring-3" cx="0" cy="0" r="5" />
            <circle class="water-ripple-center" cx="0" cy="0" r="4" />
          </g>
        </g>

        <!-- 只有真实湖面区域响应点击；点击后会连续扩散三圈水波。 -->
        <use
          href="#lake-water-shape"
          class="water-hit-area"
          @click.stop="createWaterRipple"
        />
      </svg>

      <div class="hero-overlay" aria-hidden="true"></div>

      <div class="hero-copy">
        <div class="hero-title-block">
          <p class="hero-kicker">红墙智检：</p>
          <h1 class="hero-title">基层法治风险智能研判与治理模型</h1>
        </div>
        <p class="hero-subtitle">数据驱动 · 智能研判 · 精准治理 · 协同联动</p>

        <button
          v-if="firstAccessibleBusiness"
          type="button"
          class="enter-platform-btn"
          @click="enterPlatform"
        >
          <span>进入平台</span>
          <span class="enter-arrow" aria-hidden="true">→</span>
        </button>
        <div v-else class="no-access-inline">暂无可访问模块</div>
      </div>

      <div v-if="availableBusinessItems.length" class="feature-strip">
        <div class="feature-grid" :class="`feature-count-${availableBusinessItems.length}`">
          <button
            v-for="item in availableBusinessItems"
            :key="item.key"
            type="button"
            class="feature-card"
            @click="router.push(item.key)"
          >
            <span class="feature-icon-wrap" aria-hidden="true">
              <svg class="feature-icon" viewBox="0 0 48 48" fill="none" focusable="false">
                <template v-if="item.homeCard?.icon === 'dashboard'">
                  <rect x="8" y="10" width="32" height="23" rx="2.5" />
                  <path d="M18 39h12M24 33v6" />
                  <path d="M13 27l6-6 5 4 9-10 3 3" />
                </template>

                <template v-else-if="item.homeCard?.icon === 'risk'">
                  <path d="M24 6l14 6v10c0 9.4-5.4 16.1-14 20-8.6-3.9-14-10.6-14-20V12l14-6Z" />
                  <path d="m17.5 24 4.5 4.5L31.5 19" />
                </template>

                <template v-else-if="item.homeCard?.icon === 'political'">
                  <path d="M9 39h30" />
                  <rect x="12" y="27" width="6" height="10" rx="1" />
                  <rect x="22" y="20" width="6" height="17" rx="1" />
                  <rect x="32" y="13" width="6" height="24" rx="1" />
                  <path d="M12 20l9-8 7 4 10-9" />
                  <path d="M32 7h6v6" />
                </template>

                <template v-else-if="item.homeCard?.icon === 'alert'">
                  <path d="M14 34h20l-2.5-4V21c0-5-3.2-8.6-7.5-9.4V8" />
                  <path d="M24 8h0M16.5 34c.8 4.2 3.2 6 7.5 6s6.7-1.8 7.5-6" />
                  <path d="M8 20h4M36 20h4M11 11l3 3M37 11l-3 3" />
                </template>

                <template v-else-if="item.homeCard?.icon === 'suggestion'">
                  <circle cx="24" cy="12" r="5" />
                  <circle cx="12" cy="34" r="5" />
                  <circle cx="36" cy="34" r="5" />
                  <path d="M21.5 16.5 14.5 29M26.5 16.5 33.5 29M17 34h14" />
                </template>

                <template v-else-if="item.homeCard?.icon === 'petition'">
                  <path d="M9 12h30v23H18l-7 6v-6H9V12Z" />
                  <path d="M16 20h16M16 26h11" />
                  <circle cx="34" cy="31" r="6" />
                  <path d="m31.5 31 1.7 1.8 3.4-4" />
                </template>

                <template v-else>
                  <path d="M12 7h18l7 7v27H12V7Z" />
                  <path d="M30 7v8h7M18 23h13M18 29h13M18 35h8" />
                  <path d="M9 12H7v29h24" />
                </template>
              </svg>
            </span>

            <span class="feature-copy">
              <strong>{{ item.label }}</strong>
              <small>{{ item.homeCard?.descriptions[0] }}</small>
              <small>{{ item.homeCard?.descriptions[1] }}</small>
            </span>
            <span class="feature-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div v-else class="empty-business-state">
        暂无可访问业务模块，请联系管理员开通权限
      </div>
    </section>

    <section v-if="false" class="home-data-section">
      <a-row :gutter="24" class="map-recommend-row">
        <a-col v-if="canViewRiskMap" :span="24">
          <div ref="mapPanelRef" class="dark-panel">
            <template v-if="mapPanelVisible">
              <RiskMapPanel
                :points="mapPoints"
                :height="620"
                :zoom-scale="18"
                :default-center="[116.366, 39.915]"
              />
            </template>
            <template v-else>
              <div class="map-placeholder">
                <a-spin dot />
                <span>地图组件滚动到可视区域后加载</span>
              </div>
            </template>
            <div class="map-note">
              * 以上数据仅为预测结果，不代表真实情况；地区数据不反映治理能力评估。
            </div>
          </div>
        </a-col>

        <a-col
          v-if="canViewLegalRecommendations"
          :span="24"
          class="recommend-col"
          :class="{ 'recommend-col--stacked': canViewRiskMap }"
        >
          <a-card title="普法方案推荐" :bordered="false" class="recommend-card dark-card">
            <a-list :data="legalRecommendations" :bordered="false">
              <template #item="{ item }">
                <a-list-item class="dark-list-item">
                  <div class="recommend-title">{{ item.title }}</div>
                  <div class="recommend-meta">适用人群：{{ item.group }} ｜ 场景：{{ item.scene }}</div>
                  <div class="recommend-meta">形式：{{ item.type }}</div>
                  <div v-if="item.tags?.length" class="recommend-tags">
                    <a-tag v-for="tag in item.tags.slice(0, 3)" :key="tag" size="small" class="dark-tag">
                      {{ tag }}
                    </a-tag>
                  </div>
                  <a-space style="margin-top: 12px">
                    <a-button size="mini" class="dark-btn" @click="goLegalRecommend">进入方案页</a-button>
                    <a-button size="mini" type="primary" class="dark-btn-primary" @click="goPlan(item.planId ?? item.id)">
                      查看方案
                    </a-button>
                  </a-space>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <section v-if="false" class="home-data-section news-section">
      <a-card :bordered="false" class="news-card dark-card home-alert-card">
        <template #title><div class="home-alert-title"><span><i></i>重点预警条目</span><a-button size="small" type="outline" @click="router.push('/alert-push')">查看全部</a-button></div></template>
        <PriorityTagStrip v-model="selectedPriorityTag" :alerts="priorityAlerts" title="首页重点预警" />
        <PriorityAlertList :alerts="priorityAlerts" :tag="selectedPriorityTag" compact :limit="4" />
      </a-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, inject, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchCommunityRiskPoints, fetchLegalRecommendationsV2, fetchPriorityAlerts } from '../api/platform'
import { HOME_BUSINESS_ITEMS, PERMISSION_RULES } from '../config/navigation'
import { hasPermissions } from '../services/auth'
import type { CommunityRiskPoint, LegalRecommendationV2 } from '../types/platform'
import PriorityTagStrip from '../components/priority-tag-strip.vue'
import PriorityAlertList from '../components/priority-alert-list.vue'
import { PRIORITY_TAGS, type PriorityAlert, type PriorityTag } from '../features/priority-alerts'

const RiskMapPanel = defineAsyncComponent(() => import('../components/risk-map-panel.vue'))
const router = useRouter()
const appTheme = inject<Ref<'dark' | 'light'>>('appTheme', ref('dark'))

const mapPoints = ref<CommunityRiskPoint[]>([])
const priorityAlerts = ref<PriorityAlert[]>([])
const selectedPriorityTag = ref<PriorityTag>(PRIORITY_TAGS[0])
const legalRecommendations = ref<LegalRecommendationV2[]>([])
const mapPanelRef = ref<HTMLElement | null>(null)
const mapPanelVisible = ref(false)
const waterSvgRef = ref<SVGSVGElement | null>(null)
type WaterRipple = { id: number; x: number; y: number }
const waterRipples = ref<WaterRipple[]>([])
let rippleId = 0
const rippleTimers = new Map<number, ReturnType<typeof setTimeout>>()
let mapObserver: IntersectionObserver | null = null

const availableBusinessItems = computed(() =>
  HOME_BUSINESS_ITEMS.filter((item) => hasPermissions(item.permissions, item.permissionMode))
)
const firstAccessibleBusiness = computed(() => availableBusinessItems.value[0])

// 首页数据区和导航/卡片使用同一份权限规则：无权限时既不渲染，也不发请求。
const canViewRiskMap = computed(() =>
  hasPermissions(PERMISSION_RULES.dashboardRead.permissions, PERMISSION_RULES.dashboardRead.permissionMode)
)
const canViewLegalRecommendations = computed(() =>
  hasPermissions(PERMISSION_RULES.legalRecommendRead.permissions, PERMISSION_RULES.legalRecommendRead.permissionMode)
)
const canViewPriorityAlerts = computed(() =>
  hasPermissions(PERMISSION_RULES.dashboardRead.permissions, PERMISSION_RULES.dashboardRead.permissionMode)
)

const loadHomeData = async () => {
  const tasks: Promise<void>[] = []

  if (canViewRiskMap.value) {
    tasks.push(
      fetchCommunityRiskPoints()
        .then((data) => { mapPoints.value = data || [] })
        .catch((error) => { console.error('加载首页风险地图数据失败:', error) })
    )
  }

  if (canViewPriorityAlerts.value) {
    tasks.push(
      fetchPriorityAlerts()
        .then((data) => { priorityAlerts.value = data || [] })
        .catch((error) => { console.error('加载首页预警条目失败:', error) })
    )
  }

  if (canViewLegalRecommendations.value) {
    tasks.push(
      fetchLegalRecommendationsV2()
        .then((data) => { legalRecommendations.value = data || [] })
        .catch((error) => { console.error('加载首页普法推荐失败:', error) })
    )
  }

  await Promise.all(tasks)
}

const setupMapObserver = () => {
  if (!canViewRiskMap.value || !mapPanelRef.value) return

  mapObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        mapPanelVisible.value = true
        mapObserver?.disconnect()
        mapObserver = null
      }
    },
    {
      root: null,
      rootMargin: '220px 0px',
      threshold: 0.01
    }
  )
  mapObserver.observe(mapPanelRef.value)
}

const createWaterRipple = (event: MouseEvent | PointerEvent) => {
  const svg = waterSvgRef.value
  const matrix = svg?.getScreenCTM()
  if (!svg || !matrix) return

  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const local = point.matrixTransform(matrix.inverse())
  const id = ++rippleId

  waterRipples.value.push({ id, x: local.x, y: local.y })
  const timer = setTimeout(() => {
    waterRipples.value = waterRipples.value.filter((item) => item.id !== id)
    rippleTimers.delete(id)
  }, 2700)
  rippleTimers.set(id, timer)
}

const enterPlatform = () => {
  if (firstAccessibleBusiness.value) router.push(firstAccessibleBusiness.value.key)
}

const goLegalRecommend = () => router.push('/legal-recommend')
const goPlan = (planId: number) => router.push(`/legal-plan/${planId}`)

onMounted(() => {})

onUnmounted(() => {
  mapObserver?.disconnect()
  mapObserver = null
  rippleTimers.forEach((timer) => clearTimeout(timer))
  rippleTimers.clear()
})
</script>

<style scoped>
.home-page {
  height: calc(100vh - 104px);
  min-height: 0;
  overflow: hidden;
  color: #f4fbff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  background: #020914;
}

.hero-section {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  background-image: url('/images/home-bg-approved.png');
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    linear-gradient(
      90deg,
      rgba(1, 8, 18, 0.72) 0%,
      rgba(1, 8, 18, 0.48) 28%,
      rgba(1, 8, 18, 0.12) 48%,
      rgba(1, 8, 18, 0.02) 70%
    ),
    linear-gradient(
      180deg,
      rgba(1, 6, 16, 0.03) 0%,
      transparent 58%,
      rgba(1, 6, 16, 0.40) 82%,
      rgba(1, 6, 16, 0.68) 100%
    );
}

.water-effect {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

.water-effect > image,
.water-effect > rect,
.water-click-ripples {
  pointer-events: none;
}

.water-hit-area {
  fill: rgba(0, 0, 0, 0.001);
  pointer-events: fill;
  cursor: pointer;
}

.water-click-ripples {
  mix-blend-mode: screen;
}

.water-ripple-ring {
  fill: none;
  stroke: rgba(139, 235, 255, 0.64);
  stroke-width: 2.1;
  vector-effect: non-scaling-stroke;
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
  animation: water-click-ring 1.9s cubic-bezier(0.12, 0.55, 0.28, 1) forwards;
}

.water-ripple-ring-2 {
  stroke: rgba(83, 199, 240, 0.54);
  animation-delay: 0.24s;
}

.water-ripple-ring-3 {
  stroke: rgba(170, 241, 255, 0.44);
  animation-delay: 0.48s;
}

.water-ripple-center {
  fill: rgba(173, 241, 255, 0.23);
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: water-click-center 0.72s ease-out forwards;
}

@keyframes water-click-ring {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  10% {
    opacity: 0.62;
  }
  58% {
    opacity: 0.28;
  }
  100% {
    opacity: 0;
    transform: scale(13.5);
  }
}

@keyframes water-click-center {
  0% {
    opacity: 0.30;
    transform: scale(0.65);
  }
  100% {
    opacity: 0;
    transform: scale(3.1);
  }
}

.hero-copy {
  position: absolute;
  z-index: 4;
  top: clamp(125px, 14vh, 160px);
  left: clamp(72px, 5.2vw, 104px);
  width: 1080px;
  max-width: 70vw;
}

.hero-title-block {
  width: max-content;
  max-width: 100%;
  transform: skewX(-7deg);
  transform-origin: left center;
}

.hero-kicker,
.hero-title {
  margin: 0;
  color: #f8fbff !important;
  font-family: "Microsoft YaHei UI", "Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", sans-serif;
  font-weight: 900;
  letter-spacing: -0.025em;
  text-shadow:
    2px 2px 0 rgba(59, 166, 220, 0.45),
    0 4px 10px rgba(0, 0, 0, 0.65);
}

.hero-kicker {
  font-size: clamp(62px, 3.45vw, 68px);
  line-height: 1.05;
}

.hero-title {
  margin-top: 10px;
  font-size: clamp(54px, 3vw, 60px);
  line-height: 1.1;
  white-space: nowrap;
}

.hero-subtitle {
  margin: 27px 0 0;
  color: rgba(238, 244, 249, 0.88) !important;
  font-size: clamp(22px, 1.2vw, 24px);
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0.025em;
  text-shadow: none;
}

.enter-platform-btn {
  appearance: none;
  display: inline-flex;
  width: 190px;
  height: 56px;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-top: 42px;
  border: 1px solid rgba(121, 239, 255, 0.9);
  border-radius: 2px;
  color: #06233b;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  background: linear-gradient(105deg, rgba(77, 220, 245, 0.92), rgba(157, 244, 249, 0.90));
  box-shadow:
    inset 0 0 18px rgba(255, 255, 255, 0.18),
    0 0 14px rgba(35, 213, 247, 0.22);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.enter-platform-btn:hover,
.enter-platform-btn:focus-visible {
  outline: none;
  transform: translateY(-1px);
  box-shadow:
    inset 0 0 18px rgba(255, 255, 255, 0.24),
    0 0 19px rgba(35, 213, 247, 0.30);
}

.enter-arrow {
  margin-top: -1px;
  font-size: 29px;
  font-weight: 300;
  line-height: 1;
}

.no-access-inline {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  margin-top: 40px;
  padding: 0 18px;
  border: 1px solid rgba(91, 186, 236, 0.3);
  color: rgba(214, 236, 250, 0.78);
  background: rgba(4, 22, 41, 0.58);
}

.feature-strip {
  position: absolute;
  z-index: 5;
  right: 48px;
  bottom: 28px;
  left: 48px;
}

.feature-grid {
  display: grid;
  gap: 18px;
  align-items: stretch;
  justify-content: center;
}

.feature-count-6 { grid-template-columns: repeat(6, minmax(172px, 1fr)); }
.feature-count-5 { grid-template-columns: repeat(5, minmax(250px, 290px)); }
.feature-count-4 { grid-template-columns: repeat(4, minmax(250px, 290px)); }
.feature-count-3 { grid-template-columns: repeat(3, minmax(250px, 290px)); }
.feature-count-2 { grid-template-columns: repeat(2, minmax(250px, 290px)); }
.feature-count-1 { grid-template-columns: minmax(250px, 290px); }

.feature-card {
  position: relative;
  appearance: none;
  display: grid;
  height: 154px;
  min-width: 0;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding: 19px 19px 19px 18px;
  overflow: hidden;
  border: 1px solid rgba(139, 190, 218, 0.48);
  border-radius: 4px;
  color: #f5f6f4;
  text-align: left;
  cursor: pointer;
  background: linear-gradient(180deg, rgba(4, 20, 39, 0.80), rgba(1, 11, 26, 0.91));
  box-shadow: inset 0 0 22px rgba(31, 148, 219, 0.045), 0 8px 20px rgba(0, 0, 0, 0.18);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.feature-card::before,
.feature-card::after {
  position: absolute;
  width: 20px;
  height: 1px;
  content: '';
  background: rgba(225, 196, 146, 0.85);
}

.feature-card::before { top: 0; left: 0; }
.feature-card::after { right: 0; bottom: 0; }

.feature-card:hover,
.feature-card:focus-visible {
  outline: none;
  transform: translateY(-3px);
  border-color: rgba(116, 211, 242, 0.72);
  box-shadow: inset 0 0 24px rgba(35, 166, 224, 0.07), 0 10px 24px rgba(0, 0, 0, 0.24);
}

.feature-icon-wrap {
  position: relative;
  display: grid;
  width: 64px;
  height: 72px;
  place-items: center;
  clip-path: polygon(50% 0, 94% 24%, 94% 76%, 50% 100%, 6% 76%, 6% 24%);
  background: linear-gradient(180deg, rgba(4, 54, 104, 0.96), rgba(1, 22, 53, 0.98));
  box-shadow: inset 0 0 0 1px rgba(50, 185, 235, 0.48);
}

.feature-icon-wrap::before {
  position: absolute;
  inset: 7px;
  content: '';
  clip-path: inherit;
  border: 1px solid rgba(61, 210, 255, 0.42);
  background: rgba(5, 47, 83, 0.22);
}

.feature-icon {
  position: relative;
  z-index: 1;
  width: 38px;
  height: 38px;
  stroke: #a9efff;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 4px rgba(55, 205, 255, 0.36));
}

.feature-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  padding-right: 16px;
}

.feature-copy strong {
  margin-bottom: 2px;
  overflow: hidden;
  color: #f5f6f4 !important;
  font-size: clamp(18px, 1.08vw, 21px);
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.feature-copy small {
  overflow: hidden;
  color: rgba(222, 207, 187, 0.82) !important;
  font-size: clamp(13px, 0.78vw, 15px);
  line-height: 1.42;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.feature-arrow {
  position: absolute;
  right: 16px;
  bottom: 14px;
  color: #e8c994 !important;
  font-size: 24px;
  font-weight: 300;
  line-height: 1;
}

.empty-business-state {
  position: absolute;
  z-index: 5;
  right: 8%;
  bottom: 48px;
  left: 8%;
  max-width: 620px;
  margin: 0 auto;
  padding: 19px 26px;
  border: 1px solid rgba(93, 184, 232, 0.30);
  border-radius: 4px;
  color: rgba(221, 239, 251, 0.82);
  font-size: 16px;
  text-align: center;
  background: rgba(3, 19, 37, 0.76);
}

.home-data-section {
  padding: 24px 24px 0;
}

.map-recommend-row {
  max-width: 1680px;
  margin: 0 auto;
}

.dark-panel,
.dark-card {
  border: 1px solid rgba(77, 169, 229, 0.20);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(8, 27, 52, 0.92), rgba(4, 17, 36, 0.96));
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.22);
}

.dark-panel {
  position: relative;
  min-height: 620px;
  overflow: hidden;
}

.map-placeholder {
  display: flex;
  min-height: 620px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(191, 222, 242, 0.78);
}

.map-note {
  position: absolute;
  right: 14px;
  bottom: 10px;
  z-index: 5;
  padding: 6px 10px;
  color: rgba(197, 223, 240, 0.62);
  font-size: 12px;
  background: rgba(1, 10, 22, 0.66);
  border-radius: 4px;
}

.recommend-col {
  display: flex;
}

.recommend-col--stacked {
  margin-top: 24px;
}

.recommend-card {
  width: 100%;
}

.recommend-card :deep(.arco-list-content) {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding: 16px;
}

.recommend-card .dark-list-item {
  min-height: 220px;
  align-items: stretch;
  padding: 18px !important;
  border: 1px solid rgba(91, 193, 238, 0.30) !important;
  border-radius: 10px;
  background: linear-gradient(145deg, rgba(32, 105, 158, 0.16), rgba(4, 25, 48, 0.28));
  box-shadow: inset 0 1px 0 rgba(222, 249, 255, 0.05);
}

.recommend-card .dark-list-item:hover {
  transform: translateY(-2px);
  border-color: rgba(105, 220, 255, 0.62) !important;
  box-shadow:
    inset 0 1px 0 rgba(225, 250, 255, 0.08),
    0 12px 24px rgba(0, 10, 28, 0.18);
}

.recommend-title {
  color: #eaf8ff;
  font-size: 16px;
  font-weight: 700;
}

.recommend-meta,
.desc,
.time {
  margin-top: 7px;
  color: rgba(185, 216, 235, 0.72);
  line-height: 1.6;
}

.time { font-size: 12px; }

.recommend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}

.dark-list-item {
  border-color: rgba(83, 162, 216, 0.13) !important;
}

.dark-list-item:hover {
  background: rgba(23, 102, 157, 0.08);
}

.dark-tag {
  color: #9ee9ff !important;
  border-color: rgba(70, 194, 238, 0.30) !important;
  background: rgba(17, 105, 151, 0.16) !important;
}

.dark-btn {
  color: #b8e8ff !important;
  border-color: rgba(83, 187, 235, 0.30) !important;
  background: rgba(8, 64, 102, 0.16) !important;
}

.dark-btn-primary {
  border-color: rgba(42, 197, 246, 0.54) !important;
  background: linear-gradient(90deg, #0d86c9, #12b8d4) !important;
}

.news-section {
  padding-bottom: 30px;
}

.news-card {
  max-width: 1680px;
  margin: 0 auto;
}

.dark-link {
  color: #8fe6ff !important;
  font-weight: 650;
}

:deep(.arco-card-header) {
  border-bottom-color: rgba(89, 171, 224, 0.17) !important;
}

:deep(.arco-card-header-title) {
  color: #eaf8ff !important;
}


/* ===== 浅色模式：首页保留确认背景，但 UI 使用高对比亮色层 ===== */
:global(body.theme-light) .home-page {
  color: #173f5f;
  background: #eef7ff;
}

:global(body.theme-light) .home-data-section {
  background: #eef7ff;
}

/* 不再把整张图压黑；左侧只保留很轻的冷色遮罩，保证白色标题清楚。 */
:global(body.theme-light) .hero-overlay {
  background:
    linear-gradient(
      90deg,
      rgba(1, 12, 27, 0.48) 0%,
      rgba(1, 13, 27, 0.28) 28%,
      rgba(4, 22, 39, 0.08) 48%,
      rgba(238, 249, 255, 0.03) 72%
    ),
    linear-gradient(
      180deg,
      rgba(226, 246, 255, 0.035) 0%,
      transparent 58%,
      rgba(3, 21, 38, 0.16) 84%,
      rgba(2, 17, 33, 0.30) 100%
    );
}

/* 首页大标题在浅色模式仍保持亮白，不再被全局浅色文字规则改成深蓝。 */
:global(body.theme-light) .hero-kicker,
:global(body.theme-light) .hero-title {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  text-shadow:
    2px 2px 0 rgba(57, 171, 220, 0.72),
    0 4px 10px rgba(0, 10, 24, 0.70) !important;
}

:global(body.theme-light) .hero-subtitle {
  color: rgba(250, 253, 255, 0.98) !important;
  text-shadow: 0 2px 6px rgba(0, 11, 25, 0.72) !important;
}

/* 浅色模式的卡片改成亮色磨砂面板：背景亮、文字深，和主视觉明显分层。 */
:global(body.theme-light) .feature-card {
  border-color: rgba(123, 192, 224, 0.72) !important;
  background: linear-gradient(180deg, rgba(246, 252, 255, 0.94), rgba(220, 240, 251, 0.92)) !important;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.60),
    0 8px 22px rgba(4, 37, 61, 0.18) !important;
  backdrop-filter: blur(5px);
}

:global(body.theme-light) .feature-card:hover,
:global(body.theme-light) .feature-card:focus-visible {
  border-color: rgba(32, 165, 211, 0.86) !important;
  background: linear-gradient(180deg, rgba(252, 255, 255, 0.98), rgba(226, 245, 253, 0.97)) !important;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.76),
    0 11px 26px rgba(4, 44, 72, 0.22) !important;
}

:global(body.theme-light) .feature-copy strong {
  color: #123f60 !important;
  -webkit-text-fill-color: #123f60 !important;
  text-shadow: none !important;
}

:global(body.theme-light) .feature-copy small {
  color: #557084 !important;
  -webkit-text-fill-color: #557084 !important;
}

:global(body.theme-light) .feature-icon {
  stroke: #d9fbff !important;
  filter: drop-shadow(0 0 4px rgba(20, 171, 215, 0.30));
}

:global(body.theme-light) .feature-icon-wrap {
  background: linear-gradient(180deg, #168fca, #075d9e) !important;
  box-shadow: inset 0 0 0 1px rgba(109, 228, 255, 0.72) !important;
}

:global(body.theme-light) .feature-arrow {
  color: #b27a28 !important;
}

:global(body.theme-light) .no-access-inline,
:global(body.theme-light) .empty-business-state {
  color: #173f5f !important;
  border-color: rgba(83, 158, 202, 0.44) !important;
  background: rgba(241, 250, 255, 0.94) !important;
}

:global(body.theme-light) .dark-panel,
:global(body.theme-light) .dark-card {
  border-color: rgba(61, 138, 194, 0.30) !important;
  background: linear-gradient(180deg, rgba(250, 253, 255, 0.99), rgba(229, 242, 252, 0.99)) !important;
  box-shadow: 0 14px 30px rgba(53, 112, 157, 0.12) !important;
}

:global(body.theme-light) .recommend-title,
:global(body.theme-light) .dark-link {
  color: #0b5f91 !important;
}

:global(body.theme-light) .recommend-meta,
:global(body.theme-light) .desc,
:global(body.theme-light) .time {
  color: #496b84 !important;
}

:global(body.theme-light) .dark-list-item {
  border-color: rgba(62, 132, 181, 0.16) !important;
}

:global(body.theme-light) .dark-list-item:hover {
  background: rgba(62, 161, 214, 0.08) !important;
}

:global(body.theme-light) .map-note {
  color: #365a74 !important;
  background: rgba(242, 250, 255, 0.94) !important;
}

:global(body.theme-light) .dark-tag {
  color: #0879a8 !important;
  border-color: rgba(30, 144, 190, 0.28) !important;
  background: rgba(69, 180, 220, 0.10) !important;
}


/* ===== 首页浅色模式最终覆盖 =====
   直接使用 App provide 下来的主题，不再依赖 body.theme-light。
   这样浅色模式一定能命中首页内部元素。 */
.home-page--light {
  color: #163f60;
  background: #edf7ff !important;
}

.home-page--light .hero-section {
  /* 保留最终确认背景图，但抬高暗部，避免浅色模式仍像一整块黑屏。 */
  background-color: #b8dcf3;
  box-shadow: inset 0 0 0 9999px rgba(126, 194, 231, 0.055);
}

.home-page--light .hero-overlay {
  /* 浅色态不再使用深黑压暗蒙层，改为轻微冷蓝提亮 + 左侧可读性层。 */
  background:
    linear-gradient(
      90deg,
      rgba(8, 28, 48, 0.34) 0%,
      rgba(8, 31, 52, 0.20) 28%,
      rgba(128, 191, 226, 0.08) 52%,
      rgba(213, 239, 253, 0.10) 100%
    ),
    linear-gradient(
      180deg,
      rgba(199, 230, 248, 0.08) 0%,
      rgba(178, 218, 241, 0.06) 62%,
      rgba(8, 33, 57, 0.18) 100%
    );
}

.home-page--light .hero-kicker,
.home-page--light .hero-title {
  color: #f8fdff !important;
  -webkit-text-fill-color: #f8fdff !important;
  text-shadow:
    2px 2px 0 rgba(34, 137, 190, 0.72),
    0 3px 9px rgba(0, 12, 28, 0.82) !important;
}

.home-page--light .hero-subtitle {
  color: rgba(247, 252, 255, 0.98) !important;
  -webkit-text-fill-color: rgba(247, 252, 255, 0.98) !important;
  text-shadow: 0 2px 7px rgba(0, 15, 31, 0.82) !important;
}

.home-page--light .feature-card {
  border-color: rgba(101, 170, 210, 0.76) !important;
  background: linear-gradient(180deg, rgba(249, 253, 255, 0.97), rgba(220, 239, 251, 0.95)) !important;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.72),
    0 8px 22px rgba(22, 79, 118, 0.18) !important;
  backdrop-filter: blur(4px);
}

.home-page--light .feature-card:hover,
.home-page--light .feature-card:focus-visible {
  border-color: rgba(14, 143, 193, 0.84) !important;
  background: linear-gradient(180deg, #ffffff, #e6f5fd) !important;
}

.home-page--light .feature-copy strong {
  color: #0d4267 !important;
  -webkit-text-fill-color: #0d4267 !important;
  text-shadow: none !important;
}

.home-page--light .feature-copy small {
  color: #476b84 !important;
  -webkit-text-fill-color: #476b84 !important;
}

.home-page--light .feature-icon-wrap {
  background: linear-gradient(180deg, #1599cc, #0763a1) !important;
  box-shadow: inset 0 0 0 1px rgba(126, 231, 255, 0.78) !important;
}

.home-page--light .feature-icon {
  stroke: #e9fcff !important;
}

.home-page--light .feature-arrow {
  color: #a66f23 !important;
}

.home-page--light .home-data-section {
  background: #edf7ff !important;
}

.home-page--light .dark-panel,
.home-page--light .dark-card {
  border-color: rgba(73, 144, 193, 0.32) !important;
  background: linear-gradient(180deg, #fbfdff, #e5f2fb) !important;
  box-shadow: 0 14px 30px rgba(41, 99, 139, 0.13) !important;
}

.home-page--light .recommend-title,
.home-page--light .dark-link,
.home-page--light :deep(.arco-card-header-title) {
  color: #0b4b74 !important;
}

.home-page--light .recommend-meta,
.home-page--light .desc,
.home-page--light .time,
.home-page--light .map-placeholder {
  color: #456b84 !important;
}

.home-page--light .dark-list-item {
  border-color: rgba(72, 137, 181, 0.16) !important;
}

.home-page--light .dark-list-item:hover {
  background: rgba(43, 154, 209, 0.07) !important;
}

:global(body.theme-light) .home-page .recommend-card .dark-list-item,
.home-page--light .recommend-card .dark-list-item {
  border: 1px solid rgba(62, 132, 190, 0.34) !important;
  background: linear-gradient(145deg, rgba(245, 251, 255, 0.98), rgba(216, 237, 252, 0.92)) !important;
}

.home-page--light .map-note {
  color: #355c77 !important;
  background: rgba(244, 251, 255, 0.94) !important;
}

.home-page--light .no-access-inline,
.home-page--light .empty-business-state {
  color: #153f60 !important;
  border-color: rgba(77, 151, 196, 0.42) !important;
  background: rgba(244, 251, 255, 0.96) !important;
}

@media (max-width: 1500px) {
  .hero-copy {
    left: 72px;
    max-width: 72vw;
  }

  .hero-kicker {
    font-size: 58px;
  }

  .hero-title {
    font-size: 50px;
  }

  .hero-subtitle {
    font-size: 21px;
  }

  .feature-strip {
    right: 32px;
    left: 32px;
  }

  .feature-grid {
    gap: 16px;
  }

  .feature-card {
    height: 148px;
    grid-template-columns: 68px minmax(0, 1fr);
    gap: 14px;
    padding: 17px 16px;
  }

  .feature-icon-wrap {
    width: 60px;
    height: 68px;
  }

  .feature-icon {
    width: 35px;
    height: 35px;
  }

  .feature-copy strong {
    font-size: 18px;
  }

  .feature-copy small {
    font-size: 13px;
  }

  .feature-count-6 {
    grid-template-columns: repeat(3, minmax(250px, 1fr));
  }
}

@media (max-width: 1180px) {
  .hero-section {
    height: calc(100vh - 86px);
    min-height: 820px;
    background-position: 58% center;
  }

  .hero-copy {
    top: 105px;
    left: 48px;
    width: calc(100% - 96px);
    max-width: none;
  }

  .hero-kicker { font-size: 51px; }
  .hero-title { font-size: 43px; }

  .feature-count-6,
  .feature-count-5,
  .feature-count-4 {
    grid-template-columns: repeat(3, minmax(240px, 1fr));
  }

  .recommend-card :deep(.arco-list-content) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .hero-section {
    height: auto;
    min-height: 1040px;
    background-position: 63% center;
  }

  .hero-copy {
    top: 64px;
    left: 24px;
    width: calc(100% - 48px);
  }

  .hero-title-block {
    width: 100%;
  }

  .hero-kicker { font-size: 40px; }
  .hero-title {
    font-size: 34px;
    white-space: normal;
  }

  .hero-subtitle {
    max-width: 520px;
    font-size: 17px;
  }

  .feature-strip {
    right: 18px;
    bottom: 22px;
    left: 18px;
  }

  .feature-count-6,
  .feature-count-5,
  .feature-count-4,
  .feature-count-3,
  .feature-count-2 {
    grid-template-columns: repeat(2, minmax(240px, 1fr));
  }

  .home-data-section {
    padding-right: 12px;
    padding-left: 12px;
  }

  .recommend-card :deep(.arco-list-content) {
    grid-template-columns: 1fr;
    padding: 10px;
  }

  .recommend-card .dark-list-item {
    min-height: 0;
  }
}

@media (max-width: 560px) {
  .hero-section {
    min-height: 1350px;
  }

  .hero-copy {
    top: 50px;
  }

  .hero-kicker { font-size: 34px; }
  .hero-title { font-size: 29px; }
  .hero-subtitle { font-size: 15px; }

  .feature-count-6,
  .feature-count-5,
  .feature-count-4,
  .feature-count-3,
  .feature-count-2,
  .feature-count-1 {
    grid-template-columns: minmax(250px, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .water-effect {
    display: none;
  }

  .feature-card,
  .enter-platform-btn {
    transition: none;
  }
}
</style>
