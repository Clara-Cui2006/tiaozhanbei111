<template>
  <div class="home-page">
    <div class="hero-section" style="background-image: url('./images/bg-tech-scale.jpg');">
      <div class="hero-overlay"></div>
      
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            西城区社区法治风险<br />
            <span class="hero-title-accent">智能研判与治理平台</span>
          </h1>
          <p class="hero-subtitle">
            数据驱动 · 精准普法 · 靶向治理 · 智能预警
          </p>
          
          <a-space style="margin-top: 50px" size="large">
            <a-button class="cta-button primary-cta" size="large" @click="$router.push('/dashboard')">
              进入态势盘
            </a-button>
            <a-button class="cta-button secondary-cta" size="large" @click="$router.push('/risk-analysis')">
              风险分析
            </a-button>
          </a-space>
        </div>
        <div class="hero-visual-empty"></div>
      </div>
      
      <div class="hero-bottom-bar">
        <div class="stats-group">
          <div class="hero-stat">
            <span class="hero-stat-number home-hero-bottom-only-color">{{ mapPoints?.length || 15 }}</span>
            <span class="hero-stat-label home-hero-bottom-only-color">监控街道</span>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <span class="hero-stat-number home-hero-bottom-only-color">{{ officialDynamics?.length || 14 }}</span>
            <span class="hero-stat-label home-hero-bottom-only-color">动态资讯</span>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <span class="hero-stat-number home-hero-bottom-only-color">{{ legalRecommendations?.length || 4 }}</span>
            <span class="hero-stat-label home-hero-bottom-only-color">普法方案</span>
          </div>
        </div>
        
        <div class="features-group">
          <div class="hero-feature">
            <span class="feature-title home-hero-bottom-only-color">多维图层</span>
            <span class="feature-desc home-hero-bottom-only-color">10种风险维度</span>
          </div>
          <div class="hero-feature">
            <span class="feature-title home-hero-bottom-only-color">AI 研判</span>
            <span class="feature-desc home-hero-bottom-only-color">智谱大模型</span>
          </div>
          <div class="hero-feature">
            <span class="feature-title home-hero-bottom-only-color">实时预警</span>
            <span class="feature-desc home-hero-bottom-only-color">风险态势感知</span>
          </div>
          <div class="hero-feature">
            <span class="feature-title home-hero-bottom-only-color">检察建议</span>
            <span class="feature-desc home-hero-bottom-only-color">全周期追踪</span>
          </div>
        </div>
      </div>
    </div>

    <a-row :gutter="24" style="margin-top: 24px" class="map-recommend-row">
      <a-col :span="16">
        <div ref="mapPanelRef" class="dark-panel">
          <template v-if="mapPanelVisible">
            <RiskMapPanel :points="mapPoints" :height="620" :zoom-scale="18" :default-center="[116.366, 39.915]" />
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
      <a-col :span="8" class="recommend-col">
        <a-card title="普法方案推荐" :bordered="false" class="recommend-card dark-card">
          <a-list :data="legalRecommendations" :bordered="false">
            <template #item="{ item }">
              <a-list-item class="dark-list-item">
                <div class="recommend-title">{{ item.title }}</div>
                <div class="recommend-meta">适用人群：{{ item.group }} ｜ 场景：{{ item.scene }}</div>
                <div class="recommend-meta">形式：{{ item.type }}</div>
                <div v-if="item.tags?.length" class="recommend-tags">
                  <a-tag v-for="tag in item.tags.slice(0, 3)" :key="tag" size="small" class="dark-tag">{{ tag }}</a-tag>
                </div>
                <a-space style="margin-top: 12px">
                  <a-button size="mini" class="dark-btn" @click="goLegalRecommend">进入方案页</a-button>
                  <a-button size="mini" type="primary" class="dark-btn-primary" @click="goPlan(item.planId ?? item.id)">查看方案</a-button>
                </a-space>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="官方动态文章" :bordered="false" style="margin-top: 24px" class="news-card dark-card">
      <a-list :data="officialDynamics" :bordered="false">
        <template #item="{ item }">
          <a-list-item class="dark-list-item">
            <a-list-item-meta>
              <template #title>
                <a-link :hoverable="true" class="dark-link" @click="goArticle(item.id)">{{ item.title }}</a-link>
              </template>
              <template #description>
                <div class="desc">{{ item.summary }}</div>
                <div class="time">发布时间：{{ item.publishTime }}</div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchCommunityRiskPoints, fetchLegalRecommendationsV2, fetchOfficialDynamics } from '../api/platform'
import type { CommunityRiskPoint, LegalRecommendationV2, OfficialDynamic } from '../types/platform'

const RiskMapPanel = defineAsyncComponent(() => import('../components/risk-map-panel.vue'))
const router = useRouter()
const mapPoints = ref<CommunityRiskPoint[]>([])
const officialDynamics = ref<OfficialDynamic[]>([])
const legalRecommendations = ref<LegalRecommendationV2[]>([])
const mapPanelRef = ref<HTMLElement | null>(null)
const mapPanelVisible = ref(false)
let mapObserver: IntersectionObserver | null = null

const loadHomeData = async () => {
  try {
    const [mapData, newsData, recommendData] = await Promise.all([
      fetchCommunityRiskPoints(),
      fetchOfficialDynamics(),
      fetchLegalRecommendationsV2()
    ])
    mapPoints.value = mapData || []
    officialDynamics.value = newsData || []
    legalRecommendations.value = recommendData || []
  } catch (error) {
    console.error("加载首页数据失败:", error)
  }
}

const goArticle = (id: number) => {
  router.push(`/official-article/${id}`)
}

const goLegalRecommend = () => {
  router.push('/legal-recommend')
}

const goPlan = (planId: number) => {
  router.push(`/legal-plan/${planId}`)
}

onMounted(loadHomeData)

onMounted(() => {
  if (!mapPanelRef.value) return
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
})

onUnmounted(() => {
  mapObserver?.disconnect()
  mapObserver = null
})
</script>

<style scoped>
/* ===== 全局底色设定 ===== */
/* 修改全局底色，使其更接近参考图的深蓝色调 */
.home-page {
  background-color: var(--home-page-bg, #030d1a); /* 根据主题切换首页底色 */
  color: var(--home-page-text, #ffffff);
  min-height: 100vh;
  padding-bottom: 40px;
  animation: fade-in 0.5s ease;
}

/* ===== Hero 区域 (全景图) ===== */
.hero-section {
  position: relative;
  width: 100%;
  /* 【关键修改】：不再使用写死的 580px，改用视口宽度比例 (vw) + 保底最小高度 */
  height: 42vw; 
  min-height: 750px; /* 足够高，确保天平的顶端绝对不会被切掉 */
  max-height: 900px; /* 防止在带鱼屏上变得高得离谱 */
  
  background-size: cover;
  background-position: center bottom; /* 依然保持底部对齐，衔接暗色区 */
  background-repeat: no-repeat;
  display: flex;
  overflow: hidden;
  border-radius: 0 0 18px 18px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
}

/* 保护左侧文字的极淡蒙版 */
.hero-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;

  /* 
  第一层 (90deg): 之前的左侧保护蒙版，从左侧深色向右侧透明过渡，保护标题可读性。
  */
  background: 
    linear-gradient(90deg, rgba(36, 83, 153, 0.7) 0%, rgba(39, 108, 210, 0) 50%)
}

/* 主内容垂直居中靠上一点，给底部的 bar 留出空间 */
.hero-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 48px;
  position: relative;
  z-index: 1;
  /* 【关键修改】：因为外框变高了，内容需要往上提一点，让它处于画面的黄金视觉中心 */
  transform: translateY(-60px); 
}

.hero-text {
  flex: 1;
  max-width: 750px;
}

/* --- 标题增强版 --- */
.hero-title {
  font-size: 72px; /* 进一步放大 */
  font-weight: 900;
  line-height: 1.2;
  margin: 0 0 24px;
  letter-spacing: 6px;
  position: relative;
  
  /* 渐变色：从纯白到更深一点的冰蓝色，增加金属质感 */
  background: linear-gradient(180deg, #FFFFFF 20%, #9dd0ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  /* 关键修改：多重投影，让文字从背景中“浮”出来 */
  filter: 
    drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))        /* 基础阴影，增加可读性 */
    drop-shadow(0 0 15px rgba(0, 160, 255, 0.4));     /* 蓝色光晕，增加科技感 */
}

.hero-title-accent {
  color: #7de7ff;
  text-shadow: 0 0 20px rgba(0, 210, 255, 0.35);
}

.hero-subtitle {
  font-size: 22px;
  color: #e0f5ff;
  margin: 0 0 32px;
  font-weight: 500;
  letter-spacing: 6px;
  text-shadow: 0 2px 8px rgba(0, 40, 80, 0.6);
}

.hero-visual-empty {
  width: 500px;
  flex-shrink: 0;
}

/* 按钮样式 */
.cta-button {
  height: 56px !important;
  padding: 0 40px !important;
  border-radius: 28px !important; 
  font-size: 18px !important;
  font-weight: 600 !important;
  border: none !important;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(0, 20, 50, 0.3);
}

.primary-cta {
  background: linear-gradient(90deg, #1890ff, #00d2ff) !important;
  color: #ffffff !important;
}

.primary-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0, 210, 255, 0.4);
}

.secondary-cta {
  background-color: rgba(255, 255, 255, 0.15) !important;
  color: #3889da !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
}

.secondary-cta:hover {
  background-color: rgba(255, 255, 255, 0.25) !important;
}

/* ===== 底部数据与功能横栏 ===== */
.hero-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 【修改 1】：左右 padding 从 48px 加大到 120px（或者用 10%），把两边内容往中间推 */
  padding: 30px 10%; 
  box-sizing: border-box;
  z-index: 2;
  background: linear-gradient(to top, rgba(3, 13, 26, 0.6) 0%, rgba(3, 13, 26, 0) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.stats-group {
  display: flex;
  align-items: center;
  gap: 50px; /* 【修改 2】：间距从 40px 加大到 50px */
}

.hero-stat {
  display: flex;
  flex-direction: column;
}

.hero-stat-number {
  font-size: 46px; /* 【修改 3】：数字从 36px 放大到 46px */
  font-weight: 800;
  color: #00d2ff;
  text-shadow: 0 2px 8px rgba(0, 210, 255, 0.4);
  line-height: 1.1;
}

.hero-stat-label {
  font-size: 16px; /* 【修改 4】：标签从 14px 放大到 16px */
  color: #c4d8e8; 
  margin-top: 6px;
  font-weight: 500;
}

.hero-stat-divider {
  width: 1px;
  height: 50px; /* 【修改 5】：分割线跟着字体增高，从 40px 变 50px */
  background: rgba(255, 255, 255, 0.15);
}

.features-group {
  display: flex;
  gap: 16px; /* 【调整】把框与框之间的间距缩小，让这组元素更紧凑 */
  
  /* --- 整体向右偏移的调整 --- */
  /* 使用 transform 可以很平滑地将整个组向右推，数值可根据你的屏幕随意增减 */
  transform: translateX(100px); 
}

.hero-feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px; /* 标题和描述贴得更近一点，显得更干练 */
  
  /* --- 质感大升级：深色渐变毛玻璃 --- */
  background: linear-gradient(135deg, rgba(102, 192, 237, 0.1) 0%, rgba(98, 186, 230, 0.1) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  
  /* 边框层次：整体使用极微弱的边框，但顶部加一条稍微亮一点的线，模拟玻璃边缘反光 */
  border: 2px solid rgba(0, 210, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.15); 
  
  border-radius: 8px; /* 圆角稍微改小一点（从12px降到8px），显得更锐利、更有科技感 */
  padding: 12px 20px; /* 【关键】减小内边距，让长方形变得更修长、不那么臃肿 */
  
  
  transition: all 0.3s ease;
}

/* 悬浮时的交互效果也同步优化 */
.hero-feature:hover {
  background: linear-gradient(135deg, rgba(0, 50, 90, 0.5) 0%, rgba(0, 210, 255, 0.15) 100%);
  border-color: rgba(0, 210, 255, 0.3);
  box-shadow: 0 6px 20px rgba(0, 210, 255, 0.2);
  transform: translateY(-2px);
}

.feature-title {
  font-size: 24px; /* 【修改 7】：功能标题从 16px 放大到 20px */
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 1px;
}

.feature-desc {
  font-size: 16px; /* 【修改 8】：功能描述从 12px 放大到 14px */
  color: #9ab3c5;
}

/* ===== 内容区样式优化 ===== */
.map-intro {
  margin: 16px 48px 0;
  padding: 14px 20px;
  font-size: 14px;
  color: #9ca3af;
  background: rgba(0, 210, 255, 0.05);
  border-left: 4px solid #00d2ff;
  border-radius: 0 8px 8px 0;
  backdrop-filter: blur(4px);
}

/* 地图容器也改为透明质感 */
.dark-panel {
  padding: 0 0 0 48px;
  background: transparent;
}

.map-recommend-row {
  align-items: stretch !important;
}

.recommend-col {
  display: flex;
}

.recommend-card {
  width: 100%;
  flex: 1;
}

.map-placeholder {
  height: 620px;
  border-radius: 12px;
  border: 1px solid rgba(95, 193, 255, 0.28);
  background: linear-gradient(180deg, rgba(10, 29, 55, 0.7), rgba(8, 21, 42, 0.86));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #a8d8f0;
}

.map-note {
  margin-top: 12px;
  color: #6b7280;
  font-size: 12px;
}

/* 参考图中“半透明白色卡片”的实现 */
.dark-card {
  background: rgba(255, 255, 255, 0.1) !important; /* 半透明白 */
  backdrop-filter: blur(12px); /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 4px; /* 参考图是直角或微圆角，更有严谨感 */
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

/* 修改卡片标题颜色 */
.dark-card :deep(.arco-card-header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(35, 111, 234, 0.25);
}

.dark-card :deep(.arco-card-header-title) {
  color: #ffffff;
  font-weight: bold;
  letter-spacing: 1px;
  font-size: 20px;
}



/* 确保 List Item 有足够的垂直间距，让分割线位置更自然 */
.dark-list-item {
  border-bottom: 1px solid rgba(69, 135, 206, 0.8) !important; /* 深色模式也稍微加深一点点 */
  padding: 18px 0 !important; /* 稍微加大间距 */
}

.dark-list-item:last-child {
  border-bottom: none !important;
}



.dark-list-item:hover {
  transform: translateX(2px);
}

.recommend-title {
  color: var(--recommend-title-color, #f3f4f6);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.recommend-meta {
  color: var(--recommend-meta-color, #9ca3af);
  font-size: 13px;
  line-height: 1.6;
}

.recommend-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dark-tag {
  background-color: rgba(0, 210, 255, 0.1) !important;
  color: #00d2ff !important;
  border: 1px solid rgba(0, 210, 255, 0.2) !important;
}

.dark-btn {
  background-color: rgba(14, 36, 201, 0.01) !important;
  color: #59bdf3 !important;
  border: none !important;
  border-radius: 8px !important;
  font-weight: bold;
}
.dark-btn:hover { background-color: rgba(9, 108, 229, 0.1) !important; }

.dark-btn-primary {
  background: linear-gradient(90deg, #1890ff, #00d2ff) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 8px !important;
}

.dark-link {
  color: #e5e7eb !important;
  font-size: 16px;
  font-weight: 500;
  transition: color 0.3s;
  font-weight: bold;
}
.dark-link:hover {
  color: #00d2ff !important;
}

.desc {
  color: #3b62a6;
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.5;
}

.time {
  color: #6b7280;
  font-size: 12px;
}

.arco-row {
  padding-right: 48px;
}

@media (max-width: 1440px) {
  .hero-title {
    font-size: 52px;
  }

  .hero-subtitle {
    font-size: 18px;
    letter-spacing: 4px;
  }

  .hero-content {
    transform: translateY(-36px);
  }

  .hero-bottom-bar {
    padding: 24px 6%;
  }

  .stats-group {
    gap: 30px;
  }

  .features-group {
    gap: 30px;
  }
}

@media (max-width: 1200px) {
  .hero-section {
    min-height: 640px;
  }

  .hero-content {
    padding: 0 28px;
  }

  .hero-title {
    font-size: 42px;
  }

  .hero-visual-empty {
    width: 260px;
  }

  .hero-stat-number {
    font-size: 36px;
  }

  .feature-title {
    font-size: 16px;
  }

  .map-intro {
    margin: 14px 24px 0;
  }

  .dark-panel {
    padding: 0 0 0 24px;
  }

  .arco-row {
    padding-right: 24px;
  }
}

@media (max-width: 992px) {
  .hero-section {
    min-height: 560px;
    height: auto;
  }

  .hero-content {
    align-items: flex-start;
    padding-top: 72px;
    transform: none;
  }

  .hero-visual-empty {
    display: none;
  }

  .hero-bottom-bar {
    position: static;
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
    padding: 20px 28px 26px;
    background: linear-gradient(to top, rgba(3, 13, 26, 0.82) 0%, rgba(3, 13, 26, 0.89) 100%);
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-subtitle {
    letter-spacing: 2px;
    font-size: 16px;
  }

  .cta-button {
    height: 48px !important;
    padding: 0 30px !important;
    font-size: 16px !important;
  }

  .hero-stat-number {
    font-size: 30px;
  }

  .hero-stat-label {
    font-size: 14px;
  }

  .hero-stat-divider {
    height: 36px;
  }

  .features-group {
    flex-wrap: wrap;
    gap: 20px 28px;
  }
}

@media (max-width: 768px) {
  .home-page {
    padding-bottom: 20px;
  }

  .hero-section {
    min-height: 280px !important;
    height: auto !important;
    max-height: none !important;
    background-size: cover !important;
    background-position: center !important;
  }

  .hero-overlay {
    background: rgba(3, 13, 26, 0.7) !important;
  }

  .hero-content {
    padding: 24px 16px !important;
    transform: none !important;
    flex-direction: column !important;
  }

  .hero-text {
    max-width: 100% !important;
    text-align: center;
  }

  .hero-title {
    font-size: 22px !important;
    letter-spacing: 1px !important;
  }

  .hero-subtitle {
    font-size: 12px !important;
    letter-spacing: 2px !important;
    margin-bottom: 16px !important;
  }

  .hero-visual-empty {
    display: none !important;
  }

  .cta-button {
    height: 36px !important;
    padding: 0 16px !important;
    font-size: 13px !important;
  }

  .hero-bottom-bar {
    position: static !important;
    flex-direction: column !important;
    padding: 12px 16px !important;
    gap: 10px !important;
    background: rgba(3, 13, 26, 0.85) !important;
  }

  .stats-group {
    justify-content: center !important;
    gap: 20px !important;
  }

  .hero-stat-number {
    font-size: 20px !important;
  }

  .hero-stat-label {
    font-size: 10px !important;
  }

  .hero-stat-divider {
    height: 20px !important;
  }

  .features-group {
    justify-content: center !important;
    gap: 12px !important;
    flex-wrap: wrap !important;
  }

  .feature-title {
    font-size: 11px !important;
  }

  .feature-desc {
    font-size: 9px !important;
  }

  .map-intro {
    display: none !important;
  }

  .dark-panel {
    padding: 0 !important;
  }

  .recommend-title {
    font-size: 13px !important;
  }

  .recommend-meta {
    font-size: 11px !important;
  }

  .arco-row {
    padding-right: 0 !important;
  }
}


@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:global(body.theme-dark) .home-page {
  --home-page-bg: #030d1a;
  --home-page-text: #ffffff;
  --recommend-title-color: #f3f4f6;
  --recommend-meta-color: #9ca3af;
}

:global(body.theme-light) .home-page {
  --home-page-bg: #d6ebff;
  --home-page-text: #103a60;
  --recommend-title-color: #08243b;
  --recommend-meta-color: #1f4f78;
}

:global(body.theme-light) .hero-overlay {
  background: linear-gradient(90deg, rgba(16, 75, 124, 0.26) 0%, rgba(16, 75, 124, 0.04) 62%);
}

:global(body.theme-light) .hero-title {
  color: #f5fbff;
  text-shadow: 0 3px 14px rgba(10, 55, 96, 0.55);
}

:global(body.theme-light) .hero-subtitle {
  color: #d9f3ff;
}

:global(body.theme-light) .hero-stat-label,
:global(body.theme-light) .feature-desc {
  color: #d0ebff;
}

:global(body.theme-light) .hero-bottom-bar {
  background: linear-gradient(to top, rgba(8, 46, 80, 0.82) 0%, rgba(8, 46, 80, 0.48) 58%, rgba(8, 46, 80, 0.14) 100%);
  border-top: 1px solid rgba(181, 226, 255, 0.32);
}

.home-hero-bottom-only-color {
  color: #e8f8ff !important;
  -webkit-text-fill-color: #e8f8ff !important;
  text-shadow: none !important;
}

:global(body.theme-light) .map-intro {
  color: #245983;
  background: rgba(128, 191, 240, 0.2);
  border-left-color: #1c84d7;
}

:global(body.theme-light) .map-note,
:global(body.theme-light) .time,
:global(body.theme-light) .recommend-meta,
:global(body.theme-light) .desc {
  color: #2f638f;
}

:global(body.theme-light) .home-page .dark-card {
  background: linear-gradient(180deg, rgba(228, 243, 255, 0.96), rgba(215, 234, 252, 0.98)) !important;
  border: 1px solid rgba(74, 140, 198, 0.24) !important;
}

:global(body.theme-light) .home-page .dark-card :deep(.arco-card-header) {
  border-bottom: 1px solid rgba(74, 140, 198, 0.24);
  background: linear-gradient(90deg, rgba(152, 204, 245, 0.2), rgba(212, 236, 255, 0.55));
}

:global(body.theme-light) .home-page .dark-card :deep(.arco-card-body),
:global(body.theme-light) .home-page .dark-card :deep(.arco-list),
:global(body.theme-light) .home-page .dark-card :deep(.arco-list-item),
:global(body.theme-light) .home-page .dark-card :deep(.arco-list-item-meta),
:global(body.theme-light) .home-page .dark-card :deep(.arco-list-item-meta-title),
:global(body.theme-light) .home-page .dark-card :deep(.arco-list-item-meta-description) {
  background: transparent !important;
  color:rgba(54, 143, 225, 0.71) !important;
}

:global(body.theme-light) .home-page .dark-card :deep(.arco-card-header-title),
:global(body.theme-light) .home-page .recommend-title,
:global(body.theme-light) .home-page .dark-link {
  color: #0a2f4d !important;
  font-weight: 700;
}

:global(body.theme-light) .home-page .recommend-card .recommend-title,
:global(body.theme-light) .home-page .recommend-card :deep(.arco-list-item-meta-title) {
  color: #08243b !important;
  font-weight: 700 !important;
  width: 100%;
}

:global(body.theme-light) .home-page .recommend-card :deep(.arco-list-item-content .recommend-title) {
  color: #08243b !important;
  font-weight: 700 !important;
}

:global(body.theme-dark) .home-page .recommend-card :deep(.arco-list-item-content .recommend-title) {
  color: #f3f4f6 !important;
  font-weight: 600 !important;
}

/* 优化浅色模式下的分割线可见度 */
:global(body.theme-light) .home-page .dark-list-item {
  /* 增加透明度到 0.4，或者直接使用不透明色，确保在浅蓝背景上清晰可见 */
  border-bottom: 5px solid rgba(4, 19, 33, 0.95) !important;
}

/* 细节优化：移除列表最后一项的分割线，防止多余线段 */
:global(body.theme-light) .home-page .dark-list-item:last-child,
:global(body.theme-dark) .home-page .dark-list-item:last-child {
  border-bottom: none !important;
}

:global(body.theme-light) .home-page .dark-tag {
  background-color: rgba(45, 138, 209, 0.14) !important;
  color: #1267a8 !important;
  border: 1px solid rgba(45, 138, 209, 0.26) !important;
}

:global(body.theme-light) .home-page .dark-btn {
  background-color: rgba(2, 4, 5, 0.9) !important;
  color: #01060a !important;
}
</style>