<template>
  <a-card :bordered="false" class="xrm-card" :class="{ 'xrm-theme-light': isLightTheme, 'xrm-theme-dark': !isLightTheme }">
    <header class="xrm-page-header">
      <div class="xrm-title-group">
        <span class="eyebrow">{{ isPoliticalMode ? '政治安全 · 空间与时间研判' : '西法智治 · 街道空间分析' }}</span>
        <h2>{{ isPoliticalMode ? '西城区政治安全风险空间分布' : '西城区街道法治风险分布' }}</h2>
        <p>{{ isPoliticalMode ? '围绕地点、行为、主体、时间四个维度展示政治安全案件分布与复核状态。' : '颜色仅表示案件数量区间，不表示风险等级；点击街道区域或名称查看详情。' }}</p>
      </div>
      <div class="xrm-header-status" :class="mapBoundaryMode">
        <span class="xrm-status-dot"></span>
        {{ mapBoundaryMode === 'street' ? '街道边界模式' : '区级轮廓兼容模式' }}
      </div>
    </header>

    <div class="xrm-content">
      <section class="xrm-filter-section xrm-section-shell">
        <div class="xrm-section-heading">
          <div>
            <span class="xrm-section-kicker">筛选条件</span>
            <h3>选择统计口径</h3>
          </div>
          <span class="xrm-section-helper">{{ isPoliticalMode ? '点击四维筛选后，仅加载政治安全相关案件' : '筛选变化后，地图和街道详情同步更新' }}</span>
        </div>

        <div v-if="isPoliticalMode" class="xrm-filter-grid political">
          <div class="xrm-filter-item">
            <span class="xrm-filter-label">地点维度</span>
            <div class="xrm-select-wrap">
              <select v-model="filters.locationDimension" class="xrm-filter-select" aria-label="地点维度">
                <option value="all">全部地点</option>
                <option v-for="street in expectedStreetOptions" :key="street" :value="street">{{ street }}</option>
              </select>
              <span class="xrm-select-arrow" aria-hidden="true">⌄</span>
            </div>
          </div>
          <div class="xrm-filter-item">
            <span class="xrm-filter-label">行为内容</span>
            <div class="xrm-select-wrap">
              <select v-model="filters.behaviorContent" class="xrm-filter-select" aria-label="行为内容">
                <option value="all">全部行为</option>
                <option value="涉密材料异常流转">涉密材料异常流转</option>
                <option value="重点人员异常聚集">重点人员异常聚集</option>
                <option value="涉外敏感接触">涉外敏感接触</option>
                <option value="网络政治安全线索">网络政治安全线索</option>
                <option value="重大活动周边异常">重大活动周边异常</option>
              </select>
              <span class="xrm-select-arrow" aria-hidden="true">⌄</span>
            </div>
          </div>
          <div class="xrm-filter-item">
            <span class="xrm-filter-label">涉及主体</span>
            <div class="xrm-select-wrap">
              <select v-model="filters.subjectType" class="xrm-filter-select" aria-label="涉及主体">
                <option value="all">全部主体</option>
                <option value="重点关注人员">重点关注人员</option>
                <option value="涉外关联人员">涉外关联人员</option>
                <option value="重点单位从业人员">重点单位从业人员</option>
                <option value="网络账号主体">网络账号主体</option>
                <option value="群体性诉求参与人员">群体性诉求参与人员</option>
              </select>
              <span class="xrm-select-arrow" aria-hidden="true">⌄</span>
            </div>
          </div>
          <div class="xrm-filter-item">
            <span class="xrm-filter-label">时间维度</span>
            <div class="xrm-select-wrap">
              <select v-model="filters.period" class="xrm-filter-select" aria-label="时间维度">
                <option value="30d">近30天</option>
                <option value="quarter">本季度</option>
                <option value="year">本年度</option>
              </select>
              <span class="xrm-select-arrow" aria-hidden="true">⌄</span>
            </div>
          </div>
          <div class="xrm-filter-item">
            <span class="xrm-filter-label">重点专题与复核状态</span>
            <div class="xrm-select-wrap">
              <select v-model="filters.reviewStatusTopic" class="xrm-filter-select" aria-label="重点专题与复核状态">
                <option value="all">全部专题/状态</option>
                <option value="涉外风险">涉外风险</option>
                <option value="待人工复核">待人工复核</option>
                <option value="人工研判">人工研判</option>
                <option value="研判确认">研判确认</option>
                <option value="纳入统计">纳入统计</option>
                <option value="高风险">高风险</option>
              </select>
              <span class="xrm-select-arrow" aria-hidden="true">⌄</span>
            </div>
          </div>
        </div>

        <div v-else class="xrm-filter-grid">
          <div class="xrm-filter-item">
            <span class="xrm-filter-label">统计周期</span>
            <div class="xrm-select-wrap">
              <select v-model="filters.period" class="xrm-filter-select" aria-label="统计周期">
                <option value="30d">近30天</option>
                <option value="quarter">本季度</option>
                <option value="year">本年度</option>
              </select>
              <span class="xrm-select-arrow" aria-hidden="true">⌄</span>
            </div>
          </div>
          <div class="xrm-filter-item">
            <span class="xrm-filter-label">案件类型</span>
            <div class="xrm-select-wrap">
              <select v-model="filters.caseType" class="xrm-filter-select" aria-label="案件类型">
                <option value="all">全部类型</option>
                <option value="盗窃">盗窃</option>
                <option value="诈骗">诈骗</option>
                <option value="扰乱公共秩序">扰乱公共秩序</option>
                <option value="合同纠纷">合同纠纷</option>
                <option value="其他">其他</option>
              </select>
              <span class="xrm-select-arrow" aria-hidden="true">⌄</span>
            </div>
          </div>
          <div class="xrm-filter-item">
            <span class="xrm-filter-label">治理主题</span>
            <div class="xrm-select-wrap">
              <select v-model="filters.governanceTheme" class="xrm-filter-select" aria-label="治理主题">
                <option value="all">全部主题</option>
                <option value="财产安全">财产安全</option>
                <option value="市场经营">市场经营</option>
                <option value="邻里纠纷">邻里纠纷</option>
                <option value="重点人群">重点人群</option>
                <option value="公共秩序">公共秩序</option>
              </select>
              <span class="xrm-select-arrow" aria-hidden="true">⌄</span>
            </div>
          </div>
        </div>
      </section>

      <section class="xrm-summary-section">
        <div class="xrm-section-heading compact">
          <div>
            <span class="xrm-section-kicker">全区汇总</span>
            <h3>案件归属统计</h3>
          </div>
          <span class="xrm-section-helper">点击卡片查看统计口径说明</span>
        </div>

        <div class="xrm-summary-grid">
          <div
            class="xrm-summary-card total"
            :class="{ active: summaryExplanation === 'total' }"
            role="button"
            tabindex="0"
            @click="showSummaryExplanation('total')"
            @keydown.enter="showSummaryExplanation('total')"
          >
            <div class="xrm-summary-card-top">
              <span class="xrm-summary-symbol">总</span>
              <span class="xrm-summary-label">全区总量</span>
            </div>
            <strong class="xrm-summary-value">{{ overview?.summary.totalCases ?? 0 }}</strong>
            <small>当前筛选条件下的去重案件数</small>
          </div>
          <div
            class="xrm-summary-card confirmed"
            :class="{ active: summaryExplanation === 'confirmed' }"
            role="button"
            tabindex="0"
            @click="showSummaryExplanation('confirmed')"
            @keydown.enter="showSummaryExplanation('confirmed')"
          >
            <div class="xrm-summary-card-top">
              <span class="xrm-summary-symbol">街</span>
              <span class="xrm-summary-label">已归属街道</span>
            </div>
            <strong class="xrm-summary-value">{{ overview?.summary.confirmedCases ?? 0 }}</strong>
            <small>已确认唯一街道归属</small>
          </div>
          <div
            class="xrm-summary-card pending"
            :class="{ active: summaryExplanation === 'pending' }"
            role="button"
            tabindex="0"
            @click="showSummaryExplanation('pending')"
            @keydown.enter="showSummaryExplanation('pending')"
          >
            <div class="xrm-summary-card-top">
              <span class="xrm-summary-symbol">待</span>
              <span class="xrm-summary-label">待确认</span>
            </div>
            <strong class="xrm-summary-value">{{ overview?.summary.pendingCases ?? 0 }}</strong>
            <small>未计入具体街道统计</small>
          </div>
          <div
            class="xrm-summary-card cross"
            :class="{ active: summaryExplanation === 'crossStreet' }"
            role="button"
            tabindex="0"
            @click="showSummaryExplanation('crossStreet')"
            @keydown.enter="showSummaryExplanation('crossStreet')"
          >
            <div class="xrm-summary-card-top">
              <span class="xrm-summary-symbol">跨</span>
              <span class="xrm-summary-label">跨街道</span>
            </div>
            <strong class="xrm-summary-value">{{ overview?.summary.crossStreetCases ?? 0 }}</strong>
            <small>未重复计入关联街道</small>
          </div>
          <div
            class="xrm-summary-card excluded"
            :class="{ active: summaryExplanation === 'notInStreet' }"
            role="button"
            tabindex="0"
            @click="showSummaryExplanation('notInStreet')"
            @keydown.enter="showSummaryExplanation('notInStreet')"
          >
            <div class="xrm-summary-card-top">
              <span class="xrm-summary-symbol">外</span>
              <span class="xrm-summary-label">不纳入街道统计</span>
            </div>
            <strong class="xrm-summary-value">{{ overview?.summary.notInStreetCases ?? 0 }}</strong>
            <small>辖区外或无治理关联</small>
          </div>
        </div>

        <transition name="fade-slide">
          <div v-if="summaryExplanationText" class="xrm-summary-callout">
            <span class="xrm-callout-mark">i</span>
            <span>{{ summaryExplanationText }}</span>
          </div>
        </transition>
      </section>

      <div class="xrm-layout" :style="{ minHeight: `${mapDisplayHeight}px` }">
        <section ref="mapPanelRef" class="xrm-map-panel xrm-section-shell">
          <div class="xrm-panel-heading">
            <div>
              <span class="xrm-section-kicker">空间分布</span>
              <h3>街道案件数量分布</h3>
            </div>
          </div>

          <div class="xrm-map-stage">
            <div ref="mapRef" class="xrm-map-box" :style="{ height: `${mapDisplayHeight}px` }"></div>

            <div v-if="mapLoading || overviewLoading" class="xrm-map-state">
              <a-spin />
              <strong>数据加载中</strong>
              <span>正在准备边界与街道统计数据...</span>
            </div>
            <div v-else-if="mapError || overviewError" class="xrm-map-state xrm-map-state-error">
              <strong>数据加载失败，请重试</strong>
              <span>{{ overviewError ? '平台数据接口加载失败。' : mapErrorMessage }}</span>
              <a-button size="small" type="primary" @click="reloadAll">重新加载</a-button>
            </div>

            <div class="xrm-map-controls">
              <button class="xrm-map-ctrl-btn" title="放大" @click="zoomIn">＋</button>
              <button class="xrm-map-ctrl-btn" title="缩小" @click="zoomOut">－</button>
              <button class="xrm-map-ctrl-btn home" title="恢复全区" @click="resetMap">⌂</button>
            </div>

            <div v-if="legendVisible" class="xrm-map-legend">
              <div class="xrm-legend-header">
                <div class="xrm-legend-title">案件数量区间</div>
                <button
                  type="button"
                  class="xrm-legend-toggle"
                  title="收起图例"
                  aria-label="收起图例"
                  @click.stop="legendVisible = false"
                >
                  <span>收起</span>
                  <span class="xrm-legend-arrow" aria-hidden="true">▼</span>
                </button>
              </div>
              <div class="xrm-legend-gradient"></div>
              <div class="xrm-legend-scale">
                <span>数量较少</span>
                <span>数量较多</span>
              </div>
              <div class="xrm-legend-ranges">
                <span v-for="item in quantityLegendItems" :key="`${item.min}-${item.max}`">
                  <i :style="{ backgroundColor: item.color }"></i>
                  {{ item.label }}
                </span>
              </div>
              <p class="xrm-legend-difference">颜色仅表示数量差异</p>
              <p class="xrm-legend-rule">按当前筛选结果中的街道最大案件数，以 20% 为间隔划分五档</p>
            </div>
            <button
              v-else
              type="button"
              class="xrm-legend-open"
              title="展开图例"
              aria-label="展开图例"
              @click.stop="legendVisible = true"
            >
              <span>图例</span>
              <span class="xrm-legend-arrow" aria-hidden="true">▲</span>
            </button>

          </div>

          <div class="xrm-map-caption">
            <span class="xrm-caption-main">地图展示精度为街道，不展示社区、门牌号和具体案发点位</span>
            <span>点击地图空白区域可恢复全区视图</span>
          </div>
        </section>

        <aside class="xrm-detail-panel" :style="{ height: `${detailPanelHeight || mapDisplayHeight + 96}px`, maxHeight: `${detailPanelHeight || mapDisplayHeight + 96}px` }">
          <template v-if="activeStreetName">
            <div class="xrm-detail-header">
              <div class="xrm-detail-title-row">
                <span class="xrm-street-avatar">{{ getShortStreetName(activeStreetName).slice(0, 1) }}</span>
                <div>
                  <span class="xrm-section-kicker">街道详情</span>
                  <h3>{{ activeStreetName }}</h3>
                </div>
              </div>
              <button class="xrm-close-button" title="关闭详情" @click="clearSelection">×</button>
              <div class="xrm-detail-meta">
                <span class="xrm-detail-filter-summary">
                  <span>统计周期：{{ currentPeriodLabel }}</span>
                <span v-if="isPoliticalMode">地点维度：{{ filters.locationDimension === 'all' ? '全部地点' : filters.locationDimension }}</span>
                <span v-if="isPoliticalMode">行为内容：{{ filters.behaviorContent === 'all' ? '全部行为' : filters.behaviorContent }}</span>
                <span v-if="isPoliticalMode">涉及主体：{{ filters.subjectType === 'all' ? '全部主体' : filters.subjectType }}</span>
                <span v-if="!isPoliticalMode">案件类型：{{ filters.caseType === 'all' ? '全部类型' : filters.caseType }}</span>
                <span v-if="!isPoliticalMode">治理主题：{{ filters.governanceTheme === 'all' ? '全部主题' : filters.governanceTheme }}</span>
              </span>
              <span>更新时间：{{ detail?.updatedAt || overview?.updatedAt || '暂无数据' }}</span>
            </div>
            <div class="xrm-detail-tabs">
              <button :class="{ active: activeDetailTab === 'metrics' }" @click="activeDetailTab = 'metrics'">指标详情</button>
              <button :class="{ active: activeDetailTab === 'charts' }" @click="activeDetailTab = 'charts'">图表详情</button>
            </div>
            </div>

            <div v-if="detailLoading" class="xrm-detail-state">
              <a-spin />
              <strong>详情加载中</strong>
              <span>正在更新街道统计指标...</span>
            </div>
            <div v-else-if="detailError" class="xrm-detail-state xrm-detail-error">
              <strong>数据加载失败，请重试</strong>
              <a-button size="small" type="primary" @click="loadStreetDetail">重新加载</a-button>
            </div>
            <template v-else-if="detail">
              <div v-if="detail.caseCount === 0" class="xrm-empty-data">当前筛选条件下暂无数据</div>

              <template v-if="activeDetailTab === 'metrics'">
              <div class="xrm-metric-grid">
                <div class="xrm-metric-card primary">
                  <span class="xrm-metric-label">案件总量</span>
                  <div class="xrm-metric-number-row">
                    <strong>{{ detail.caseCount }}</strong>
                    <span>件</span>
                  </div>
                  <small>当前周期内归属于该街道的去重案件</small>
                </div>
                <div class="xrm-metric-card">
                  <span class="xrm-metric-label">环比变化</span>
                  <strong class="xrm-metric-change">{{ formatMom(detail) }}</strong>
                  <small>与上一相邻周期比较</small>
                </div>
                <div class="xrm-metric-card">
                  <span class="xrm-metric-label">同比变化</span>
                  <strong class="xrm-metric-change">{{ formatYoy(detail) }}</strong>
                  <small>与上年同期比较</small>
                </div>
              </div>

              <section class="xrm-detail-section-card">
                <div class="xrm-detail-xrm-section-heading">
                  <span class="xrm-section-index">01</span>
                  <div>
                    <h4>高频案件类型</h4>
                    <p>按案件数量展示靠前类型及占比</p>
                  </div>
                </div>
                <div v-if="detail.topCaseTypes.length" class="xrm-rank-list">
                  <div v-for="(item, index) in detail.topCaseTypes" :key="item.name" class="xrm-rank-row">
                    <div class="xrm-rank-content">
                      <span class="xrm-rank-number">{{ index + 1 }}</span>
                      <span class="xrm-rank-name">{{ item.name }}</span>
                      <span class="xrm-rank-value">{{ item.count }} 件 · {{ formatRate(item.rate) }}</span>
                    </div>
                    <div class="xrm-rank-track">
                      <span :style="{ width: getRateBarWidth(item.rate) }"></span>
                    </div>
                  </div>
                </div>
                <div v-else class="xrm-section-empty">当前筛选条件下暂无数据</div>
              </section>

              <section class="xrm-detail-section-card">
                <div class="xrm-detail-xrm-section-heading">
                  <span class="xrm-section-index">02</span>
                  <div>
                    <h4>高频治理问题</h4>
                    <p>客观展示重复出现的治理问题</p>
                  </div>
                </div>
                <ul v-if="detail.topGovernanceIssues.length" class="xrm-plain-list">
                  <li v-for="item in detail.topGovernanceIssues" :key="item.name">
                    <span>{{ item.name }}</span>
                    <em v-if="item.count !== null">关联 {{ item.count }} 件</em>
                  </li>
                </ul>
                <div v-else class="xrm-section-empty">当前筛选条件下暂无数据</div>
              </section>

              <section class="xrm-detail-section-card">
                <div class="xrm-detail-xrm-section-heading">
                  <span class="xrm-section-index">03</span>
                  <div>
                    <h4>重点风险人群</h4>
                    <p>仅展示脱敏、汇总后的人群特征</p>
                  </div>
                </div>
                <ul v-if="detail.keyGroups.length" class="xrm-tag-list">
                  <li v-for="item in detail.keyGroups" :key="item.label">
                    <span>{{ item.label }}</span>
                    <em v-if="item.count !== null">{{ item.count }} 件</em>
                  </li>
                </ul>
                <div v-else class="xrm-section-empty">当前筛选条件下暂无数据</div>
              </section>

              <section class="xrm-detail-section-card">
                <div class="xrm-detail-xrm-section-heading">
                  <span class="xrm-section-index">04</span>
                  <div>
                    <h4>{{ isPoliticalMode ? '重点案发情形' : '重点行业领域' }}</h4>
                    <p>{{ isPoliticalMode ? '政治安全风险较集中的具体案发情形' : '案件较集中的行业或生活场景' }}</p>
                  </div>
                </div>
                <ul v-if="detail.keyIndustries.length" class="xrm-plain-list xrm-compact-list">
                  <li v-for="item in detail.keyIndustries" :key="item.name">
                    <span>{{ item.name }}</span>
                    <em v-if="item.count !== null">{{ item.count }} 件</em>
                  </li>
                </ul>
                <div v-else class="xrm-section-empty">当前筛选条件下暂无数据</div>
              </section>

              <section class="xrm-detail-section-card">
                <div class="xrm-detail-xrm-section-heading">
                  <span class="xrm-section-index">05</span>
                  <div>
                    <h4>近期新增风险</h4>
                    <p>标明变化依据和比较周期</p>
                  </div>
                </div>
                <ul v-if="detail.newRisks.length" class="xrm-timeline-list">
                  <li v-for="item in detail.newRisks" :key="`${item.name}-${item.comparisonPeriod}`">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.basis }}</span>
                    <em>{{ item.comparisonPeriod }}</em>
                  </li>
                </ul>
                <div v-else class="xrm-section-empty">当前筛选条件下暂无数据</div>
              </section>

              <section class="xrm-detail-section-card">
                <div class="xrm-detail-xrm-section-heading">
                  <span class="xrm-section-index">06</span>
                  <div>
                    <h4>内部移送线索</h4>
                    <p>详情依据用户权限控制</p>
                  </div>
                </div>
                <div class="xrm-clue-grid">
                  <div>
                    <span>线索数量</span>
                    <strong>{{ detail.transferClues.count }}</strong>
                  </div>
                  <div>
                    <span>办理状态</span>
                    <strong>{{ detail.transferClues.statusSummary || '暂无数据' }}</strong>
                  </div>
                </div>
                <p v-if="!detail.transferClues.canViewDetails" class="xrm-permission-note">仅展示汇总数量，详情按权限控制</p>
              </section>

              <section class="xrm-detail-section-card xrm-attention-card">
                <div class="xrm-detail-xrm-section-heading">
                  <span class="xrm-section-index">07</span>
                  <div>
                    <h4>推荐关注事项</h4>
                    <p>仅提供中性、可解释的关注建议</p>
                  </div>
                </div>
                <ul v-if="detail.attentionItems.length" class="xrm-attention-list">
                  <li v-for="item in detail.attentionItems" :key="item">{{ normalizeAttentionItem(item) }}</li>
                </ul>
                <div v-else class="xrm-section-empty">当前筛选条件下暂无数据</div>
              </section>
              </template>

              <template v-else>
                <section class="xrm-detail-section-card">
                  <div class="xrm-detail-xrm-section-heading">
                    <span class="xrm-section-index">图1</span>
                    <div>
                      <h4>涉及主体分析</h4>
                      <p>不同主体类型案件占比</p>
                    </div>
                  </div>
                  <div ref="subjectChartRef" class="xrm-detail-chart"></div>
                </section>
                <section class="xrm-detail-section-card">
                  <div class="xrm-detail-xrm-section-heading">
                    <span class="xrm-section-index">图2</span>
                    <div>
                      <h4>行为内容类型分析</h4>
                      <p>不同政治安全风险行为类型占比</p>
                    </div>
                  </div>
                  <div ref="behaviorChartRef" class="xrm-detail-chart"></div>
                </section>
                <section class="xrm-detail-section-card">
                  <div class="xrm-detail-xrm-section-heading">
                    <span class="xrm-section-index">图3</span>
                    <div>
                      <h4>时间趋势分析</h4>
                      <p>政治安全案件数量随时间变化</p>
                    </div>
                  </div>
                  <div ref="timeTrendChartRef" class="xrm-detail-chart line"></div>
                </section>
              </template>
            </template>
            <div v-else class="xrm-detail-state">当前筛选条件下暂无数据</div>
          </template>

          <div v-else class="xrm-empty-tip">
            <div class="xrm-empty-symbol">街</div>
            <h3>请选择街道查看详情</h3>
            <p>点击地图中的街道区域或名称，可查看案件总量、变化趋势及治理关注事项。</p>
            <div class="xrm-empty-steps">
              <span><b>1</b> 选择街道</span>
              <span><b>2</b> 查看指标</span>
              <span><b>3</b> 查看图表</span>
              <span><b>4</b> 切换对比</span>
            </div>
            <div class="xrm-detail-filter-summary xrm-empty-filter-summary">
              <span>统计周期：{{ currentPeriodLabel }}</span>
              <span v-if="isPoliticalMode">地点维度：{{ filters.locationDimension === 'all' ? '全部地点' : filters.locationDimension }}</span>
              <span v-if="isPoliticalMode">行为内容：{{ filters.behaviorContent === 'all' ? '全部行为' : filters.behaviorContent }}</span>
              <span v-if="isPoliticalMode">涉及主体：{{ filters.subjectType === 'all' ? '全部主体' : filters.subjectType }}</span>
              <span v-if="!isPoliticalMode">案件类型：{{ filters.caseType === 'all' ? '全部类型' : filters.caseType }}</span>
              <span v-if="!isPoliticalMode">治理主题：{{ filters.governanceTheme === 'all' ? '全部主题' : filters.governanceTheme }}</span>
            </div>
          </div>
        </aside>
      </div>

      <footer class="xrm-footer">
        <div class="xrm-footer-copy">
          <span>
            当前按照平台现有案件去重口径统计
            <template v-if="mapBoundaryMode === 'district'">；{{ loadedMapFileName }} 仅含区级轮廓</template>
          </span>
          <span v-if="mapBoundaryMode === 'district'" class="xrm-footer-compat-line">
            <b>兼容展示</b>
            当前使用区级轮廓兼容展示；xicheng_streets.overpassql 只是查询脚本，需导出为 xicheng_streets.geojson 后才能绘制街道边界。
          </span>
        </div>
        <span class="xrm-footer-time">{{ overview?.dataPeriod || '当前统计周期' }} ｜ 更新时间：{{ overview?.updatedAt || '暂无数据' }}</span>
      </footer>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type {
  StreetMapDetail,
  StreetMapFilters,
  StreetMapOverview,
  StreetMapSummaryKey
} from '../api/platform'
import {
  fetchXichengStreetMapDetail,
  fetchXichengStreetMapOverview
} from '../api/platform'

const props = withDefaults(
  defineProps<{
    points?: unknown[]
    height?: number
    zoomScale?: number
    defaultCenter?: [number, number]
    defaultOverlayPolitical?: boolean
  }>(),
  {
    points: () => [],
    height: 420,
    zoomScale: 1,
    defaultCenter: undefined,
    defaultOverlayPolitical: false
  }
)

const STREET_MAP_NAME = 'xicheng-street-map'
const MAP_FILE_NAMES = ['xicheng_streets.geojson', 'xicheng_full.json', 'beijing_full.json'] as const
const EMBEDDED_XICHENG_GEOJSON = {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"adcode":110102,"name":"西城区","center":[116.366794,39.915309],"centroid":[116.36567,39.912028],"childrenNum":0,"level":"district","parent":{"adcode":110000},"subFeatureIndex":1,"acroutes":[100000,110000]},"geometry":{"type":"MultiPolygon","coordinates":[[[[116.325799,39.896789],[116.32582,39.891111],[116.320759,39.881512],[116.321324,39.875199],[116.326636,39.876859],[116.335273,39.875183],[116.341567,39.876159],[116.344286,39.873653],[116.349472,39.873588],[116.35058,39.86869],[116.38059,39.871148],[116.399097,39.872205],[116.397612,39.898675],[116.396086,39.89944],[116.395563,39.907995],[116.392259,39.907881],[116.392175,39.92242],[116.399474,39.923574],[116.396692,39.928306],[116.396169,39.94006],[116.394266,39.940629],[116.393346,39.957355],[116.38678,39.957014],[116.387658,39.96093],[116.390084,39.968406],[116.394162,39.969397],[116.394099,39.972858],[116.380903,39.972712],[116.380401,39.968178],[116.370384,39.967902],[116.371974,39.948594],[116.356206,39.944092],[116.352023,39.950854],[116.352421,39.943832],[116.341442,39.941979],[116.332889,39.944092],[116.327953,39.942369],[116.333056,39.938565],[116.334645,39.922664],[116.335356,39.898448],[116.337301,39.89739],[116.325799,39.896789]]]]}}]}

const buildMapSourceCandidates = () => {
  const baseUrl = String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const origin = typeof window === 'undefined' ? 'http://localhost/' : `${window.location.origin}/`
  const candidates: Array<{ fileName: string; url: string }> = []
  const seen = new Set<string>()

  MAP_FILE_NAMES.forEach((fileName) => {
    const sourcePaths = [`${baseUrl}maps/${fileName}`, `/maps/${fileName}`]
    sourcePaths.forEach((sourcePath) => {
      const url = new URL(sourcePath, origin).toString()
      if (seen.has(url)) return
      seen.add(url)
      candidates.push({ fileName, url })
    })
  })

  return candidates
}
const EXPECTED_STREETS = [
  '西长安街街道', '新街口街道', '月坛街道', '展览路街道', '德胜街道',
  '金融街街道', '什刹海街道', '大栅栏街道', '天桥街道', '椿树街道',
  '陶然亭街道', '广安门内街道', '牛街街道', '白纸坊街道', '广安门外街道'
]
const EXPECTED_STREET_SET = new Set(EXPECTED_STREETS)
const QUANTITY_COLORS = ['#1D4ED8', '#0284C7', '#059669', '#F59E0B', '#EA580C']

const STREET_COORDINATES: Record<string, [number, number]> = {
  西长安街街道: [116.375, 39.912],
  新街口街道: [116.370, 39.945],
  月坛街道: [116.345, 39.915],
  展览路街道: [116.345, 39.925],
  德胜街道: [116.378, 39.955],
  金融街街道: [116.360, 39.915],
  什刹海街道: [116.392, 39.938],
  大栅栏街道: [116.395, 39.895],
  天桥街道: [116.398, 39.882],
  椿树街道: [116.385, 39.892],
  陶然亭街道: [116.385, 39.878],
  广安门内街道: [116.365, 39.892],
  牛街街道: [116.362, 39.885],
  白纸坊街道: [116.358, 39.880],
  广安门外街道: [116.332, 39.885]
}

type LabelPosition = 'top' | 'bottom' | 'left' | 'right'
type StreetLabelConfig = {
  position: LabelPosition
  offset: [number, number]
  align?: 'left' | 'center' | 'right'
}

const STREET_LABEL_CONFIG: Record<string, StreetLabelConfig> = {
  德胜街道: { position: 'top', offset: [0, -4] },
  新街口街道: { position: 'left', offset: [-5, -2], align: 'right' },
  什刹海街道: { position: 'right', offset: [5, -4], align: 'left' },
  展览路街道: { position: 'left', offset: [-5, -5], align: 'right' },
  月坛街道: { position: 'left', offset: [-5, 7], align: 'right' },
  金融街街道: { position: 'top', offset: [0, -5] },
  西长安街街道: { position: 'right', offset: [5, 1], align: 'left' },
  广安门外街道: { position: 'left', offset: [-5, -2], align: 'right' },
  广安门内街道: { position: 'top', offset: [-2, -6] },
  牛街街道: { position: 'bottom', offset: [-4, 5] },
  白纸坊街道: { position: 'left', offset: [-5, 7], align: 'right' },
  椿树街道: { position: 'right', offset: [5, -5], align: 'left' },
  大栅栏街道: { position: 'right', offset: [5, -5], align: 'left' },
  天桥街道: { position: 'right', offset: [5, 7], align: 'left' },
  陶然亭街道: { position: 'bottom', offset: [0, 5] }
}

type MapBoundaryMode = 'street' | 'district'

const mapRef = ref<HTMLDivElement | null>(null)
const mapPanelRef = ref<HTMLElement | null>(null)
const subjectChartRef = ref<HTMLDivElement | null>(null)
const behaviorChartRef = ref<HTMLDivElement | null>(null)
const timeTrendChartRef = ref<HTMLDivElement | null>(null)
const filters = reactive<StreetMapFilters>({
  period: '30d',
  caseType: 'all',
  governanceTheme: 'all',
  locationDimension: 'all',
  behaviorContent: 'all',
  subjectType: 'all',
  timeDimension: 'all',
  reviewStatusTopic: 'all',
  politicalOnly: false
})
const currentPeriodLabel = computed(() => {
  if (filters.period === 'quarter') return '本季度'
  if (filters.period === 'year') return '本年度'
  return '近30天'
})
const overview = ref<StreetMapOverview | null>(null)
const overviewLoading = ref(false)
const overviewError = ref(false)
const mapLoading = ref(false)
const mapError = ref(false)
const mapErrorMessage = ref('未找到可读取的地图数据文件。')
const mapBoundaryMode = ref<MapBoundaryMode>('street')
const loadedMapFileName = ref('')
const activeStreetName = ref('')
const detail = ref<StreetMapDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref(false)
const activeDetailTab = ref<'metrics' | 'charts'>('metrics')
const summaryExplanation = ref<StreetMapSummaryKey | ''>('')
const mapDisplayHeight = computed(() => Math.max(460, Math.min(620, Number(props.height) || 520)))
const detailPanelHeight = ref(0)
const isLightTheme = ref(false)
const mapZoom = ref(1)
const legendVisible = ref(true)

let chart: echarts.ECharts | null = null
let subjectChart: echarts.ECharts | null = null
let behaviorChart: echarts.ECharts | null = null
let timeTrendChart: echarts.ECharts | null = null
let mapRegistered = false
let themeObserver: MutationObserver | null = null
let mapPanelResizeObserver: ResizeObserver | null = null

const detectLightTheme = () => {
  if (typeof document === 'undefined') return false
  const body = document.body
  const root = document.documentElement
  const classTokens = new Set([
    ...Array.from(body.classList),
    ...Array.from(root.classList)
  ].map((item) => item.toLowerCase()))
  const dataTheme = `${body.dataset.theme || ''} ${root.dataset.theme || ''}`.toLowerCase()

  if (classTokens.has('theme-light') || classTokens.has('light') || dataTheme.includes('light')) return true
  if (classTokens.has('theme-dark') || classTokens.has('dark') || dataTheme.includes('dark')) return false
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
}

const isPoliticalMode = computed(() => props.defaultOverlayPolitical)
const expectedStreetOptions = EXPECTED_STREETS

watch(isPoliticalMode, (enabled) => {
  filters.politicalOnly = enabled
}, { immediate: true })

const syncTheme = () => {
  isLightTheme.value = detectLightTheme()
}

const getChartTheme = () => isLightTheme.value
  ? {
      tooltipBg: 'rgba(255, 255, 255, 0.98)',
      tooltipBorder: '#4B8DB8',
      tooltipText: '#123B59',
      tooltipHint: '#3C789A',
      mapArea: '#B8D8EE',
      mapBorder: '#246B91',
      mapShadow: 'rgba(44, 111, 151, 0.24)',
      labelText: '#0B3552',
      labelBg: 'rgba(255, 255, 255, 0.90)',
      labelBorder: 'rgba(35, 103, 143, 0.58)',
      labelStroke: 'rgba(255, 255, 255, 0.96)',
      selectedLabelText: '#FFFFFF',
      selectedLabelBg: '#D95724',
      selectedLabelBorder: '#8E2F0D',
      selectedLabelStroke: 'rgba(79, 24, 4, 0.72)',
      pointBorder: '#FFFFFF'
    }
  : {
      tooltipBg: 'rgba(7, 24, 46, 0.96)',
      tooltipBorder: 'rgba(113, 216, 240, 0.7)',
      tooltipText: '#EAFAFF',
      tooltipHint: '#8FC6DC',
      mapArea: '#123A66',
      mapBorder: '#B9F1FF',
      mapShadow: 'rgba(45, 161, 204, 0.2)',
      labelText: '#DFF8FF',
      labelBg: 'rgba(3, 18, 36, 0.82)',
      labelBorder: 'rgba(193, 241, 255, 0.52)',
      labelStroke: 'rgba(2, 12, 27, 0.98)',
      selectedLabelText: '#FFFFFF',
      selectedLabelBg: '#E7652C',
      selectedLabelBorder: '#FFD1B8',
      selectedLabelStroke: 'rgba(55, 16, 2, 0.92)',
      pointBorder: '#9FE8F7'
    }

const selectedStreetStat = computed(() => {
  return overview.value?.streets.find((item) => item.streetName === activeStreetName.value) || null
})

const summaryExplanationText = computed(() => {
  if (!summaryExplanation.value) return ''
  const texts: Record<StreetMapSummaryKey, string> = {
    total: '全区总量由已归属街道、待确认、跨街道和不纳入街道统计四类案件共同构成。',
    confirmed: '已归属街道案件已明确归入唯一街道，并计入对应街道统计。',
    pending: '待确认案件未计入具体街道统计。',
    crossStreet: '跨街道案件未重复计入各关联街道。',
    notInStreet: '与西城无地域关联或不形成西城治理关联的数据保留在全区口径中，但不进入街道地图。'
  }
  return texts[summaryExplanation.value]
})

const getShortStreetName = (name: string) => String(name || '').replace(/街道$/, '')

const normalizeStreetName = (rawName: unknown) => {
  const name = String(rawName || '').trim()
  if (EXPECTED_STREET_SET.has(name)) return name
  const withSuffix = name.endsWith('街道') ? name : `${name}街道`
  return EXPECTED_STREET_SET.has(withSuffix) ? withSuffix : name
}

const normalizeFeature = (feature: any, index: number) => {
  const properties = feature?.properties || {}
  const rawName = properties.name ?? properties.street_name ?? properties.NAME ?? properties.Name ?? properties.街道名称
  const name = normalizeStreetName(rawName)
  const streetCode = String(
    properties.street_code ?? properties.adcode ?? properties.code ?? properties.CODE ?? index + 1
  )
  return {
    ...feature,
    properties: {
      ...properties,
      name,
      street_code: streetCode
    }
  }
}

const prepareMapGeoJson = (source: any) => {
  const features = Array.isArray(source?.features) ? source.features : []
  if (!features.length) throw new Error('边界文件中没有可用图形')

  const normalizedFeatures = features.map(normalizeFeature)
  const streetFeatureMap = new Map<string, any>()

  normalizedFeatures.forEach((feature: any) => {
    const name = feature.properties?.name
    const geometryType = feature.geometry?.type
    if (!EXPECTED_STREET_SET.has(name)) return
    if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') return
    if (!streetFeatureMap.has(name)) streetFeatureMap.set(name, feature)
  })

  const streetFeatures = EXPECTED_STREETS
    .map((streetName) => streetFeatureMap.get(streetName))
    .filter(Boolean)

  if (streetFeatures.length === EXPECTED_STREETS.length) {
    return {
      mode: 'street' as MapBoundaryMode,
      geoJson: { ...source, features: streetFeatures }
    }
  }

  const xichengFeature = normalizedFeatures.find((feature: any) => {
    const properties = feature?.properties || {}
    return properties.name === '西城区' || String(properties.adcode || '') === '110102'
  })
  if (!xichengFeature) throw new Error('边界文件中未找到西城区')

  return {
    mode: 'district' as MapBoundaryMode,
    geoJson: { type: 'FeatureCollection', features: [xichengFeature] }
  }
}

const loadStreetGeoJson = async () => {
  if (mapRegistered) return
  mapLoading.value = true
  mapError.value = false
  mapErrorMessage.value = '未找到可读取的地图数据文件。'
  let lastError: unknown = null

  try {
    for (const source of buildMapSourceCandidates()) {
      try {
        const response = await fetch(`${source.url}${source.url.includes('?') ? '&' : '?'}v=${Date.now()}`, {
          cache: 'no-store'
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const rawText = await response.text()
        if (!rawText.trim()) throw new Error('文件内容为空')
        if (rawText.trimStart().startsWith('<')) {
          throw new Error('服务器返回了 HTML，地图文件路径未命中')
        }

        const prepared = prepareMapGeoJson(JSON.parse(rawText))
        echarts.registerMap(STREET_MAP_NAME, prepared.geoJson)
        mapBoundaryMode.value = prepared.mode
        loadedMapFileName.value = source.fileName
        mapRegistered = true
        return
      } catch (error) {
        lastError = error
        console.warn(`地图文件不可用：${source.url}`, error)
      }
    }

    // public/maps 路径配置不一致时，仍使用用户已提供的真实西城区区级轮廓兜底，
    // 避免整个地图区域白屏；该兜底不会伪造街道行政边界。
    const prepared = prepareMapGeoJson(EMBEDDED_XICHENG_GEOJSON)
    echarts.registerMap(STREET_MAP_NAME, prepared.geoJson)
    mapBoundaryMode.value = 'district'
    loadedMapFileName.value = '内置西城区轮廓（兼容展示）'
    mapRegistered = true
    console.warn('未读取到 public/maps 中的地图文件，已启用内置区级轮廓。', lastError)
  } catch (error) {
    console.error('加载西城区地图边界失败', error)
    mapErrorMessage.value = error instanceof Error ? error.message : '地图边界解析失败。'
    mapError.value = true
  } finally {
    mapLoading.value = false
  }
}

const loadOverview = async () => {
  overviewLoading.value = true
  overviewError.value = false
  try {
    overview.value = await fetchXichengStreetMapOverview({ ...filters })
    if (activeStreetName.value && !selectedStreetStat.value) clearSelection()
  } catch (error) {
    console.error('加载街道地图汇总失败', error)
    overviewError.value = true
  } finally {
    overviewLoading.value = false
  }
}

const loadStreetDetail = async () => {
  if (!activeStreetName.value) {
    detail.value = null
    return
  }
  detailLoading.value = true
  detailError.value = false
  try {
    detail.value = await fetchXichengStreetMapDetail(activeStreetName.value, { ...filters })
    activeDetailTab.value = 'metrics'
  } catch (error) {
    console.error('加载街道详情失败', error)
    detail.value = null
    detailError.value = true
  } finally {
    detailLoading.value = false
  }
}

const disposeDetailCharts = () => {
  subjectChart?.dispose()
  behaviorChart?.dispose()
  timeTrendChart?.dispose()
  subjectChart = null
  behaviorChart = null
  timeTrendChart = null
}

const renderPieChart = (
  container: HTMLDivElement | null,
  current: echarts.ECharts | null,
  title: string,
  data: Array<{ name: string; count: number; rate?: number }>
) => {
  if (!container) return current
  current?.dispose()
  const instance = echarts.init(container)
  const chartTheme = getChartTheme()
  instance.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: chartTheme.tooltipBg,
      borderColor: chartTheme.tooltipBorder,
      textStyle: { color: chartTheme.tooltipText },
      formatter: (params: any) => `${params.name}<br/>政治安全案件数量：${params.value} 件<br/>占比：${params.percent}%`
    },
    series: [{
      name: title,
      type: 'pie',
      radius: ['38%', '68%'],
      center: ['50%', '54%'],
      avoidLabelOverlap: true,
      label: {
        color: chartTheme.labelText,
        fontSize: 11,
        formatter: '{b}\n{d}%'
      },
      labelLine: { lineStyle: { color: chartTheme.labelText } },
      data: data.map((item) => ({ name: item.name, value: item.count }))
    }]
  })
  return instance
}

const renderDetailCharts = async () => {
  if (activeDetailTab.value !== 'charts' || !detail.value) return
  await nextTick()
  const chartTheme = getChartTheme()
  subjectChart = renderPieChart(subjectChartRef.value, subjectChart, '涉及主体分析', detail.value.subjectBreakdown || [])
  behaviorChart = renderPieChart(behaviorChartRef.value, behaviorChart, '行为内容类型分析', detail.value.behaviorBreakdown || [])
  timeTrendChart?.dispose()
  timeTrendChart = null
  if (timeTrendChartRef.value) {
    timeTrendChart = echarts.init(timeTrendChartRef.value)
    const trend = detail.value.timeTrend || []
    timeTrendChart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.tooltipText },
        formatter: (params: any) => {
          const item = params?.[0]
          return `${item?.axisValue || ''}<br/>政治安全案件数量：${item?.data ?? 0}`
        }
      },
      grid: { left: 38, right: 14, top: 24, bottom: 34 },
      xAxis: {
        type: 'category',
        data: trend.map((item) => item.period),
        axisLabel: { color: chartTheme.tooltipHint, fontSize: 10 },
        axisLine: { lineStyle: { color: chartTheme.tooltipBorder } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: chartTheme.tooltipHint, fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(120, 198, 230, 0.16)' } }
      },
      series: [{
        name: '政治安全案件数量',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: trend.map((item) => item.count),
        lineStyle: { color: '#ff7a7a', width: 3 },
        itemStyle: { color: '#ff7a7a' },
        areaStyle: { color: 'rgba(255, 122, 122, 0.16)' }
      }]
    })
  }
}

const getMaxCaseCount = () => {
  const values = overview.value?.streets.map((item) => item.caseCount) || []
  return Math.max(0, ...values)
}

type QuantityRange = {
  min: number
  max: number
  color: string
  label: string
}

const buildQuantityRanges = (maxValue: number): QuantityRange[] => {
  const normalizedMax = Math.max(0, Math.floor(Number(maxValue) || 0))
  if (normalizedMax === 0) {
    return [{ min: 0, max: 0, color: QUANTITY_COLORS[0] ?? '#dbeafe', label: '0 件' }]
  }

  const starts = [
    0,
    Math.ceil(normalizedMax * 0.2),
    Math.ceil(normalizedMax * 0.4),
    Math.ceil(normalizedMax * 0.6),
    Math.ceil(normalizedMax * 0.8)
  ]

  return starts
    .map((min, index) => {
      const nextStart = starts[index + 1] ?? normalizedMax
      const max = index === starts.length - 1 ? normalizedMax : Math.min(normalizedMax, nextStart - 1)
      return {
        min,
        max,
        color: QUANTITY_COLORS[index] ?? QUANTITY_COLORS[0] ?? '#dbeafe',
        label: min === max ? `${min} 件` : `${min}–${max} 件`
      }
    })
    .filter((item) => item.min <= item.max)
}

const getQuantityColor = (value: number, maxValue: number) => {
  const normalizedValue = Math.max(0, Math.floor(Number(value) || 0))
  return buildQuantityRanges(maxValue).find((item) => normalizedValue >= item.min && normalizedValue <= item.max)?.color ?? QUANTITY_COLORS[0] ?? '#dbeafe'
}

const quantityLegendItems = computed(() => buildQuantityRanges(getMaxCaseCount()))

const getTooltipOption = () => {
  const theme = getChartTheme()
  return {
    trigger: 'item',
    backgroundColor: theme.tooltipBg,
    borderColor: theme.tooltipBorder,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: theme.tooltipText, fontSize: 14 }
  }
}

const renderMap = async () => {
  await nextTick()
  if (!mapRef.value || !mapRegistered || !overview.value) return

  if (!chart) {
    chart = echarts.init(mapRef.value)
    chart.on('click', (params: any) => {
      const name = normalizeStreetName(params?.name ?? params?.data?.name)
      if (EXPECTED_STREET_SET.has(name)) selectStreet(name)
    })
    chart.getZr().on('click', (event: any) => {
      if (!event.target) clearSelection()
    })
  }

  const hasSelection = Boolean(activeStreetName.value)
  const maxCaseCount = getMaxCaseCount()
  const quantityRanges = buildQuantityRanges(maxCaseCount)
  const visualMapPieces = quantityRanges.map((item) => ({
    gte: item.min,
    lte: item.max,
    color: item.color,
    label: item.label
  }))
  const chartTheme = getChartTheme()
  const streetData = overview.value.streets.map((item) => {
    const quantityColor = getQuantityColor(item.caseCount, maxCaseCount)
    return {
      name: item.streetName,
      value: item.caseCount,
      selected: item.streetName === activeStreetName.value,
      itemStyle: {
        areaColor: quantityColor,
        opacity: hasSelection && item.streetName !== activeStreetName.value ? 0.34 : 1
      },
      emphasis: {
        label: { backgroundColor: quantityColor },
        itemStyle: { areaColor: quantityColor }
      },
      select: {
        label: { backgroundColor: quantityColor },
        itemStyle: { areaColor: quantityColor }
      }
    }
  })

  if (mapBoundaryMode.value === 'street') {
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        ...getTooltipOption(),
        formatter: (params: any) => {
          const item = overview.value?.streets.find((street) => street.streetName === params.name)
          if (!item) return params.name
          return `<strong>${item.streetName}</strong><br/>案件数量：${item.caseCount} 件<br/><span style="color:${chartTheme.tooltipHint}">点击查看详情</span>`
        }
      },
      visualMap: {
        show: false,
        type: 'piecewise',
        pieces: visualMapPieces
      },
      series: [
        {
          id: 'xrm-street-map-series',
          type: 'map',
          map: STREET_MAP_NAME,
          nameProperty: 'name',
          roam: true,
          scaleLimit: { min: 0.9, max: 5 },
          zoom: mapZoom.value,
          selectedMode: 'single',
          layoutCenter: ['52%', '50%'],
          layoutSize: '96%',
          data: streetData,
          itemStyle: {
            areaColor: QUANTITY_COLORS[0],
            borderColor: chartTheme.mapBorder,
            borderWidth: 1.8
          },
          emphasis: {
            label: {
              color: chartTheme.selectedLabelText,
              borderColor: chartTheme.selectedLabelBorder,
              textBorderColor: chartTheme.selectedLabelStroke,
              fontWeight: 700
            },
            itemStyle: { borderColor: '#FFFFFF', borderWidth: 2.4 }
          },
          select: {
            label: {
              color: chartTheme.selectedLabelText,
              borderColor: chartTheme.selectedLabelBorder,
              textBorderColor: chartTheme.selectedLabelStroke,
              fontWeight: 700
            },
            itemStyle: { borderColor: '#FFFFFF', borderWidth: 3 }
          },
          label: {
            show: true,
            color: chartTheme.labelText,
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 15,
            textBorderColor: chartTheme.labelStroke,
            textBorderWidth: isLightTheme.value ? 2 : 3,
            backgroundColor: chartTheme.labelBg,
            borderColor: chartTheme.labelBorder,
            borderWidth: 1,
            borderRadius: 4,
            padding: [3, 5],
            formatter: (params: any) => getShortStreetName(String(params.name || ''))
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: 'shiftY'
          }
        }
      ]
    }, { notMerge: true })
    return
  }

  const pointData = overview.value.streets.map((item) => {
    const coordinate = STREET_COORDINATES[item.streetName]
    const selected = item.streetName === activeStreetName.value
    const quantityColor = getQuantityColor(item.caseCount, maxCaseCount)
    const labelConfig = STREET_LABEL_CONFIG[item.streetName] || { position: 'top' as LabelPosition, offset: [0, -4] as [number, number] }
    return {
      name: item.streetName,
      value: coordinate ? [...coordinate, item.caseCount] : [116.366794, 39.915309, item.caseCount],
      symbolSize: selected ? 20 : Math.max(11, Math.min(17, 10 + item.caseCount / Math.max(1, maxCaseCount) * 7)),
      itemStyle: {
        color: quantityColor,
        borderColor: selected ? '#ffffff' : chartTheme.pointBorder,
        borderWidth: selected ? 3 : 1.5,
        opacity: hasSelection && !selected ? 0.28 : 0.98,
        shadowBlur: selected ? 14 : 5,
        shadowColor: selected ? 'rgba(115, 226, 240, 0.72)' : 'rgba(83, 191, 220, 0.28)'
      },
      label: {
        show: true,
        position: labelConfig.position,
        offset: labelConfig.offset,
        align: labelConfig.align || 'center',
        formatter: getShortStreetName(item.streetName),
        color: selected ? chartTheme.selectedLabelText : chartTheme.labelText,
        backgroundColor: selected ? quantityColor : chartTheme.labelBg,
        borderColor: selected ? chartTheme.selectedLabelBorder : chartTheme.labelBorder,
        textBorderColor: selected ? chartTheme.selectedLabelStroke : chartTheme.labelStroke,
        fontWeight: selected ? 700 : 600
      },
      emphasis: {
        label: { backgroundColor: quantityColor },
        itemStyle: { color: quantityColor }
      }
    }
  })

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      ...getTooltipOption(),
      formatter: (params: any) => {
        if (params.seriesType !== 'scatter') return '西城区'
        return `<strong>${params.name}</strong><br/>案件数量：${params.value?.[2] ?? 0} 件<br/><span style="color:${chartTheme.tooltipHint}">点击查看详情</span>`
      }
    },
    visualMap: {
      show: false,
      type: 'piecewise',
      pieces: visualMapPieces,
      dimension: 2,
      seriesIndex: 0
    },
    geo: {
      id: 'xrm-district-geo',
      map: STREET_MAP_NAME,
      roam: true,
      scaleLimit: { min: 0.9, max: 5 },
      zoom: mapZoom.value,
      layoutCenter: ['55%', '50%'],
      layoutSize: '105%',
      silent: false,
      itemStyle: {
        areaColor: chartTheme.mapArea,
        borderColor: chartTheme.mapBorder,
        borderWidth: 2.2,
        shadowBlur: 22,
        shadowColor: chartTheme.mapShadow
      },
      emphasis: {
        disabled: true
      }
    },
    series: [
      {
        id: 'xrm-street-point-series',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: pointData,
        z: 5,
        label: {
          show: true,
          distance: 5,
          color: chartTheme.labelText,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 15,
          textBorderColor: chartTheme.labelStroke,
          textBorderWidth: isLightTheme.value ? 2 : 3,
          backgroundColor: chartTheme.labelBg,
          borderColor: chartTheme.labelBorder,
          borderWidth: 1,
          borderRadius: 4,
          padding: [3, 5]
        },
        labelLayout: {
          hideOverlap: true,
          moveOverlap: 'shiftY'
        },
        emphasis: {
          scale: 1.18,
          label: {
            color: chartTheme.selectedLabelText,
            borderColor: chartTheme.selectedLabelBorder,
            textBorderColor: chartTheme.selectedLabelStroke,
            fontWeight: 700
          },
          itemStyle: { borderColor: '#ffffff', borderWidth: 2.5 }
        }
      }
    ]
  }, { notMerge: true })
}

const selectStreet = (streetName: string) => {
  activeStreetName.value = streetName
  summaryExplanation.value = ''
}

const clearSelection = () => {
  activeStreetName.value = ''
  detail.value = null
  detailError.value = false
  mapZoom.value = 1
  renderMap()
}

const showSummaryExplanation = (key: StreetMapSummaryKey) => {
  summaryExplanation.value = summaryExplanation.value === key ? '' : key
  if (key === 'total') clearSelection()
}

const applyMapZoom = (nextZoom: number) => {
  if (!chart) return
  mapZoom.value = Math.max(0.9, Math.min(5, nextZoom))
  if (mapBoundaryMode.value === 'street') {
    chart.setOption({ series: [{ id: 'xrm-street-map-series', zoom: mapZoom.value }] })
  } else {
    chart.setOption({ geo: { id: 'xrm-district-geo', zoom: mapZoom.value } })
  }
  requestAnimationFrame(() => chart?.resize())
}

const zoomIn = () => applyMapZoom(mapZoom.value * 1.2)
const zoomOut = () => applyMapZoom(mapZoom.value / 1.2)
const resetMap = () => {
  activeStreetName.value = ''
  detail.value = null
  detailError.value = false
  mapZoom.value = 1
  renderMap()
}

const formatRate = (rate: number | null) => {
  if (rate === null || Number.isNaN(rate)) return '暂无数据'
  return `${(rate * 100).toFixed(1)}%`
}

const getRateBarWidth = (rate: number | null) => {
  if (rate === null || Number.isNaN(rate)) return '0%'
  return `${Math.max(4, Math.min(100, rate * 100))}%`
}

const formatChange = (count: number | null, rate: number | null, emptyText: string) => {
  if (count === null) return emptyText
  if (rate === null) return count > 0 ? `新增 ${count} 件` : count === 0 ? '持平' : `减少 ${Math.abs(count)} 件`
  const countText = count > 0 ? `增加 ${count} 件` : count < 0 ? `减少 ${Math.abs(count)} 件` : '持平'
  return count === 0 ? countText : `${countText}（${formatRate(Math.abs(rate))}）`
}

const formatMom = (item: StreetMapDetail) => formatChange(item.momChangeCount, item.momRate, '暂无环比数据')
const formatYoy = (item: StreetMapDetail) => formatChange(item.yoyChangeCount, item.yoyRate, '暂无同比数据')
const normalizeAttentionItem = (item: string) => item.startsWith('建议关注') ? item : `建议关注${item}`

const reloadAll = async () => {
  await Promise.all([loadStreetGeoJson(), loadOverview()])
  await renderMap()
  if (activeStreetName.value) await loadStreetDetail()
}

const syncDetailPanelHeight = () => {
  if (!mapPanelRef.value) return
  detailPanelHeight.value = Math.ceil(mapPanelRef.value.getBoundingClientRect().height)
}

const handleResize = () => {
  chart?.resize()
  subjectChart?.resize()
  behaviorChart?.resize()
  timeTrendChart?.resize()
  syncDetailPanelHeight()
}

watch(filters, async () => {
  await loadOverview()
  await renderMap()
  if (activeStreetName.value) await loadStreetDetail()
}, { deep: true })

watch(activeStreetName, async () => {
  await renderMap()
  await loadStreetDetail()
})

watch(activeDetailTab, async () => {
  if (activeDetailTab.value === 'charts') {
    await renderDetailCharts()
  } else {
    disposeDetailCharts()
  }
})

watch(detail, async () => {
  await renderDetailCharts()
})

watch(mapDisplayHeight, () => nextTick(() => {
  chart?.resize()
  subjectChart?.resize()
  behaviorChart?.resize()
  timeTrendChart?.resize()
  syncDetailPanelHeight()
}))

watch(isLightTheme, async () => {
  await renderMap()
  await renderDetailCharts()
})

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  syncTheme()
  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
  if (typeof ResizeObserver !== 'undefined' && mapPanelRef.value) {
    mapPanelResizeObserver = new ResizeObserver(syncDetailPanelHeight)
    mapPanelResizeObserver.observe(mapPanelRef.value)
  }
  await reloadAll()
  await nextTick()
  syncDetailPanelHeight()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  themeObserver?.disconnect()
  themeObserver = null
  mapPanelResizeObserver?.disconnect()
  mapPanelResizeObserver = null
  chart?.dispose()
  chart = null
  disposeDetailCharts()
})
</script>

<style scoped>
.xrm-card {
  --page-bg: #091a31;
  --surface-1: rgba(13, 35, 66, 0.78);
  --surface-2: rgba(15, 43, 78, 0.72);
  --surface-3: rgba(20, 55, 92, 0.52);
  --surface-solid: #0d2848;
  --line: rgba(101, 193, 239, 0.24);
  --line-strong: rgba(101, 207, 239, 0.48);
  --text-1: #edfaff;
  --text-2: #b7dced;
  --text-3: #82b6ce;
  --title: #5ad6ff;
  --input-bg: rgba(7, 28, 53, 0.78);
  --shadow: 0 14px 40px rgba(0, 7, 20, 0.22);
  overflow: hidden;
  border: 1px solid var(--line) !important;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(10, 29, 53, 0.98), rgba(7, 22, 42, 0.98)) !important;
  color: var(--text-1);
  box-shadow: var(--shadow);
}

.xrm-card :deep(.arco-card-body) {
  padding: 0;
  background: transparent;
}

.xrm-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(90, 214, 255, 0.2);
  background:
    linear-gradient(90deg, rgba(0, 110, 196, 0.52), rgba(17, 68, 148, 0.42)),
    radial-gradient(circle at 12% 0%, rgba(90, 214, 255, 0.2), transparent 35%);
}

.xrm-title-group h2,
.xrm-section-heading h3,
.xrm-panel-heading h3,
.xrm-detail-header h3,
.xrm-empty-tip h3 {
  margin: 0;
  color: var(--text-1);
}

.xrm-title-group h2 {
  margin-top: 3px;
  font-size: 23px;
  line-height: 1.35;
  letter-spacing: 0.3px;
}

.xrm-title-group p {
  margin: 7px 0 0;
  color: #b9deef;
  font-size: 14px;
  line-height: 1.6;
}

.eyebrow,
.xrm-section-kicker {
  color: var(--title);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
}

.xrm-header-status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(126, 224, 237, 0.35);
  border-radius: 999px;
  background: rgba(4, 27, 52, 0.4);
  color: #dff9ff;
  font-size: 13px;
  font-weight: 600;
}

.xrm-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #72e0ed;
  box-shadow: 0 0 10px rgba(114, 224, 237, 0.78);
}

.xrm-header-status.district .xrm-status-dot {
  background: #ffbe63;
  box-shadow: 0 0 10px rgba(255, 190, 99, 0.72);
}

.xrm-content {
  padding: 18px;
}

.xrm-section-shell {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-1);
}

.xrm-filter-section {
  padding: 16px;
  margin-bottom: 18px;
}

.xrm-section-heading,
.xrm-panel-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.xrm-section-heading.compact {
  margin-bottom: 12px;
}

.xrm-section-heading h3,
.xrm-panel-heading h3 {
  margin-top: 3px;
  font-size: 17px;
  line-height: 1.4;
}

.xrm-section-helper {
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.5;
  text-align: right;
}

.xrm-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.xrm-filter-grid.political {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.xrm-filter-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.xrm-filter-label {
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
}

.xrm-select-wrap {
  position: relative;
  min-width: 0;
}

.xrm-filter-select {
  width: 100%;
  height: 40px;
  padding: 0 38px 0 12px;
  border: 1px solid var(--line);
  border-radius: 7px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background: var(--input-bg);
  color: var(--text-1);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 38px;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  color-scheme: dark;
}

.xrm-filter-select:hover,
.xrm-filter-select:focus {
  border-color: var(--line-strong);
  box-shadow: 0 0 0 3px rgba(90, 214, 255, 0.10);
}

.xrm-filter-select option {
  background: #0d2848;
  color: #edfaff;
}

.xrm-select-arrow {
  position: absolute;
  top: 50%;
  right: 13px;
  z-index: 1;
  color: var(--text-2);
  font-size: 17px;
  line-height: 1;
  pointer-events: none;
  transform: translateY(-54%);
}

.xrm-filter-select :deep(.arco-select-view) {
  height: 38px !important;
  border: 1px solid var(--line) !important;
  border-radius: 7px !important;
  background: var(--input-bg) !important;
  color: var(--text-1) !important;
  box-shadow: none !important;
}

.xrm-filter-select :deep(.arco-select-view:hover),
.xrm-filter-select :deep(.arco-select-view-focus) {
  border-color: var(--line-strong) !important;
  box-shadow: 0 0 0 2px rgba(90, 214, 255, 0.08) !important;
}

.xrm-filter-select :deep(.arco-select-view-value),
.xrm-filter-select :deep(.arco-select-view-input),
.xrm-filter-select :deep(.arco-select-view-suffix) {
  color: var(--text-1) !important;
  font-size: 14px;
}

.xrm-summary-section {
  margin-bottom: 18px;
}

.xrm-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.xrm-summary-card {
  --accent: #5ad6ff;
  --accent-soft: rgba(90, 214, 255, 0.12);
  position: relative;
  min-height: 126px;
  padding: 15px 16px 14px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
  outline: none;
  background:
    linear-gradient(140deg, var(--accent-soft), transparent 64%),
    var(--surface-1);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.xrm-summary-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: var(--accent);
}

.xrm-summary-card::after {
  content: '';
  position: absolute;
  right: -22px;
  top: -34px;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: var(--accent-soft);
}

.xrm-summary-card:hover,
.xrm-summary-card.active,
.xrm-summary-card:focus-visible {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 10px 24px rgba(0, 12, 30, 0.18);
}

.xrm-summary-card.confirmed {
  --accent: #4f9dff;
  --accent-soft: rgba(79, 157, 255, 0.14);
}

.xrm-summary-card.pending {
  --accent: #ffb85c;
  --accent-soft: rgba(255, 184, 92, 0.14);
}

.xrm-summary-card.cross {
  --accent: #a78bfa;
  --accent-soft: rgba(167, 139, 250, 0.14);
}

.xrm-summary-card.excluded {
  --accent: #94a3b8;
  --accent-soft: rgba(148, 163, 184, 0.14);
}

.xrm-summary-card-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
}

.xrm-summary-symbol {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  font-weight: 800;
}

.xrm-summary-label {
  color: var(--text-2);
  font-size: 14px;
  font-weight: 600;
}

.xrm-summary-value {
  position: relative;
  z-index: 1;
  display: block;
  margin: 12px 0 6px;
  color: var(--text-1);
  font-size: 31px;
  line-height: 1;
}

.xrm-summary-card small {
  position: relative;
  z-index: 1;
  color: var(--text-3);
  font-size: 12px;
}

.xrm-summary-callout {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(90, 214, 255, 0.24);
  border-radius: 8px;
  background: rgba(90, 214, 255, 0.07);
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
}

.xrm-callout-mark {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #48bddd;
  color: #06213b;
  font-size: 13px;
  font-weight: 800;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.18s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.xrm-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(500px, 1fr);
  gap: 14px;
  align-items: stretch;
}

.xrm-map-panel {
  min-width: 0;
  padding: 15px;
}

.xrm-panel-heading {
  align-items: center;
}

.xrm-map-source {
  display: flex;
  max-width: 260px;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--text-3);
  font-size: 11px;
  text-align: right;
}

.xrm-map-source strong {
  overflow: hidden;
  max-width: 100%;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xrm-map-stage {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(95, 193, 255, 0.32);
  border-radius: 10px;
  background:
    radial-gradient(circle at 18% 18%, rgba(80, 181, 255, 0.15), transparent 33%),
    linear-gradient(180deg, #0d2948, #07182e 88%);
  box-shadow: inset 0 0 38px rgba(53, 156, 219, 0.08);
}

.xrm-map-box {
  width: 100%;
}

.xrm-map-state {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(6, 20, 40, 0.9);
  color: #dff7ff;
  text-align: center;
}

.xrm-map-state strong {
  margin-top: 4px;
  font-size: 16px;
}

.xrm-map-state span {
  color: #8fbdd2;
  font-size: 13px;
}

.xrm-map-state-error strong {
  color: #ffd2d2;
}

.xrm-map-controls {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.xrm-map-ctrl-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid rgba(116, 213, 240, 0.35);
  border-radius: 7px;
  background: rgba(6, 25, 48, 0.88);
  color: #bdefff;
  font-size: 18px;
  font-weight: 700;
  line-height: 32px;
  cursor: pointer;
  transition: 0.18s ease;
}

.xrm-map-ctrl-btn:hover {
  border-color: rgba(126, 224, 237, 0.78);
  background: rgba(43, 130, 172, 0.48);
  color: #ffffff;
}

.xrm-map-ctrl-btn.home {
  font-size: 16px;
}

.xrm-map-legend {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 5;
  width: 200px;
  padding: 11px 12px;
  border: 1px solid rgba(113, 216, 240, 0.25);
  border-radius: 8px;
  background: rgba(5, 23, 45, 0.82);
  backdrop-filter: blur(5px);
}

.xrm-legend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 2px;
}

.xrm-legend-toggle,
.xrm-legend-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(113, 216, 240, 0.52);
  background: linear-gradient(180deg, rgba(26, 91, 132, 0.96), rgba(10, 49, 82, 0.96));
  color: #effcff;
  font-family: inherit;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 5px 14px rgba(0, 12, 30, 0.22);
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.xrm-legend-toggle {
  min-height: 26px;
  flex: 0 0 auto;
  gap: 2px;
  padding: 4px 6px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.xrm-legend-arrow {
  display: inline-block;
  flex: 0 0 auto;
  font-size: 10px;
  line-height: 1;
}

.xrm-legend-chevron {
  display: inline-block;
  width: 0;
  height: 0;
  flex: 0 0 auto;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
}

.xrm-legend-chevron-up {
  border-bottom: 6px solid currentColor;
}

.xrm-legend-chevron-down {
  border-top: 6px solid currentColor;
}

.xrm-legend-toggle:hover,
.xrm-legend-open:hover {
  border-color: rgba(126, 224, 237, 0.92);
  background: linear-gradient(180deg, rgba(42, 129, 170, 0.98), rgba(16, 69, 109, 0.98));
  color: #ffffff;
  transform: translateY(-1px);
}

.xrm-legend-open {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 5;
  gap: 7px;
  min-height: 36px;
  padding: 7px 13px;
  border-radius: 9px;
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  backdrop-filter: blur(5px);
}

.xrm-legend-title {
  color: #dff8ff;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  flex: 0 0 auto;
}

.xrm-legend-gradient {
  height: 8px;
  margin: 9px 0 5px;
  border-radius: 999px;
  background: linear-gradient(90deg, #1d4ed8 0%, #0284c7 24%, #059669 48%, #f59e0b 73%, #ea580c 100%);
}

.xrm-legend-scale {
  display: flex;
  justify-content: space-between;
  color: #94c5d9;
  font-size: 11px;
}

.xrm-legend-ranges {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 7px;
}

.xrm-legend-ranges span {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 5px;
  color: #b8dceb;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
}

.xrm-legend-ranges i {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 2px;
}

.xrm-map-legend p {
  color: #7eafc5;
  font-size: 11px;
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
}

.xrm-legend-difference {
  margin: 7px 0 0;
  font-weight: 600;
}

.xrm-legend-rule {
  margin: 3px 0 0;
}

.xrm-compat-tip {
  position: absolute;
  left: 168px;
  right: 60px;
  bottom: 16px;
  z-index: 5;
  padding: 8px 10px;
  border: 1px solid rgba(255, 190, 99, 0.28);
  border-radius: 7px;
  background: rgba(34, 29, 22, 0.78);
  color: #e8c68f;
  font-size: 11px;
  line-height: 1.55;
  text-align: center;
}

.xrm-compat-badge {
  margin-right: 6px;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(255, 184, 92, 0.18);
  color: #ffd18f;
  font-weight: 700;
}

.xrm-map-caption {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 10px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.55;
}

.xrm-caption-main {
  color: var(--text-2);
  font-weight: 600;
}

.xrm-detail-panel {
  min-width: 0;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: linear-gradient(180deg, var(--surface-1), var(--surface-2));
  color: var(--text-1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.xrm-detail-panel::-webkit-scrollbar {
  width: 7px;
}

.xrm-detail-panel::-webkit-scrollbar-thumb {
  border-radius: 99px;
  background: rgba(104, 190, 224, 0.35);
}

.xrm-detail-header {
  position: sticky;
  top: 0;
  z-index: 4;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-solid);
  box-shadow: 0 8px 20px rgba(1, 13, 29, 0.14);
}

.xrm-detail-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}

.xrm-street-avatar {
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(90, 214, 255, 0.42);
  border-radius: 11px;
  background: rgba(90, 214, 255, 0.1);
  color: var(--title);
  font-size: 19px;
  font-weight: 800;
}

.xrm-detail-header h3 {
  overflow: hidden;
  margin-top: 3px;
  font-size: 19px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xrm-close-button {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: transparent;
  color: var(--text-2);
  font-size: 21px;
  line-height: 27px;
  cursor: pointer;
}

.xrm-close-button:hover {
  border-color: var(--line-strong);
  background: rgba(90, 214, 255, 0.08);
  color: var(--text-1);
}

.xrm-detail-meta {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 12px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
  color: var(--text-3);
  font-size: 11px;
}

.xrm-detail-tabs {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.xrm-detail-tabs button {
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.xrm-detail-tabs button.active,
.xrm-detail-tabs button:hover {
  border-color: var(--line-strong);
  background: rgba(90, 214, 255, 0.14);
  color: var(--text-1);
}

.xrm-detail-chart {
  width: 100%;
  height: 230px;
}

.xrm-detail-chart.line {
  height: 220px;
}

.xrm-detail-filter-summary {
  display: flex;
  min-width: 0;
  flex: 1 1 360px;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.xrm-detail-filter-summary > span {
  white-space: nowrap;
}

.xrm-detail-state,
.xrm-empty-tip {
  min-height: 330px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-2);
  text-align: center;
}

.xrm-detail-state strong {
  color: var(--text-1);
  font-size: 15px;
}

.xrm-detail-state span {
  color: var(--text-3);
  font-size: 12px;
}

.xrm-detail-error strong {
  color: #ffcfcf;
}

.xrm-empty-symbol {
  display: flex;
  width: 72px;
  height: 72px;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  border: 1px solid rgba(90, 214, 255, 0.35);
  border-radius: 20px;
  background: rgba(90, 214, 255, 0.08);
  color: var(--title);
  font-size: 29px;
  font-weight: 800;
  box-shadow: 0 12px 30px rgba(0, 21, 45, 0.18);
}

.xrm-empty-tip h3 {
  font-size: 18px;
}

.xrm-empty-tip p {
  max-width: 300px;
  margin: 2px 0 14px;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.7;
}

.xrm-empty-steps {
  display: grid;
  width: 100%;
  max-width: 480px;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.xrm-empty-steps span {
  display: flex;
  min-height: 96px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 16px 10px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface-3);
  color: var(--text-2);
  font-size: 17px;
  font-weight: 600;
}

.xrm-empty-steps b {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(90, 214, 255, 0.14);
  color: var(--title);
  font-size: 16px;
}

.xrm-empty-filter-summary {
  width: 100%;
  max-width: 480px;
  flex: none;
  justify-content: center;
  margin-top: 2px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
  color: var(--text-3);
  font-size: 14px;
  font-weight: 600;
}

.xrm-empty-data {
  margin: 14px 14px 0;
  padding: 10px;
  border: 1px dashed var(--line-strong);
  border-radius: 8px;
  background: rgba(90, 214, 255, 0.05);
  color: var(--text-2);
  font-size: 13px;
  text-align: center;
}

.xrm-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  padding: 14px;
}

.xrm-metric-card {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface-3);
}

.xrm-metric-card.primary {
  grid-column: 1 / -1;
  background:
    linear-gradient(120deg, rgba(90, 214, 255, 0.12), transparent 70%),
    var(--surface-3);
}

.xrm-metric-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
}

.xrm-metric-number-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.xrm-metric-number-row strong {
  color: var(--text-1);
  font-size: 33px;
  line-height: 1;
}

.xrm-metric-number-row span {
  color: var(--text-2);
  font-size: 13px;
}

.xrm-metric-change {
  display: block;
  min-height: 36px;
  color: var(--text-1);
  font-size: 14px;
  line-height: 1.5;
}

.xrm-metric-card small {
  display: block;
  margin-top: 7px;
  color: var(--text-3);
  font-size: 10px;
  line-height: 1.45;
}

.xrm-detail-section-card {
  margin: 0 14px 12px;
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(5, 27, 51, 0.22);
}

.xrm-detail-xrm-section-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 11px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--line);
}

.xrm-section-index {
  display: inline-flex;
  width: 29px;
  height: 23px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(90, 214, 255, 0.1);
  color: var(--title);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.xrm-detail-xrm-section-heading h4 {
  margin: 0;
  color: var(--text-1);
  font-size: 14px;
  line-height: 1.4;
}

.xrm-detail-xrm-section-heading p {
  margin: 3px 0 0;
  color: var(--text-3);
  font-size: 10px;
  line-height: 1.45;
}

.xrm-rank-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.xrm-rank-content {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
}

.xrm-rank-number {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(90, 214, 255, 0.1);
  color: var(--title);
  font-size: 10px;
  font-weight: 700;
}

.xrm-rank-name {
  overflow: hidden;
  color: var(--text-2);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xrm-rank-value {
  color: var(--text-3);
  font-size: 10px;
  white-space: nowrap;
}

.xrm-rank-track {
  height: 5px;
  margin: 6px 0 0 27px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(109, 185, 214, 0.14);
}

.xrm-rank-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2f8eb8, #6bd7e7);
}

.xrm-plain-list,
.xrm-tag-list,
.xrm-timeline-list,
.xrm-attention-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.xrm-plain-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.xrm-plain-list li {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 9px;
  border-radius: 7px;
  background: var(--surface-3);
  color: var(--text-2);
  font-size: 11px;
  line-height: 1.55;
}

.xrm-plain-list li::before {
  content: '';
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  margin-top: 5px;
  border-radius: 50%;
  background: #5ad6ff;
}

.xrm-plain-list li span {
  flex: 1;
}

.xrm-plain-list em,
.xrm-tag-list em {
  color: var(--text-3);
  font-size: 10px;
  font-style: normal;
  white-space: nowrap;
}

.xrm-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.xrm-tag-list li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-2);
  font-size: 11px;
}

.xrm-timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.xrm-timeline-list li {
  position: relative;
  display: grid;
  gap: 3px;
  padding: 8px 8px 8px 15px;
  border-left: 2px solid rgba(90, 214, 255, 0.35);
  background: var(--surface-3);
}

.xrm-timeline-list li::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 13px;
  width: 8px;
  height: 8px;
  border: 2px solid var(--surface-solid);
  border-radius: 50%;
  background: #5ad6ff;
}

.xrm-timeline-list strong {
  color: var(--text-1);
  font-size: 11px;
}

.xrm-timeline-list span {
  color: var(--text-2);
  font-size: 10px;
  line-height: 1.55;
}

.xrm-timeline-list em {
  color: var(--text-3);
  font-size: 10px;
  font-style: normal;
}

.xrm-clue-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.xrm-clue-grid > div {
  padding: 9px;
  border-radius: 7px;
  background: var(--surface-3);
}

.xrm-clue-grid span {
  display: block;
  margin-bottom: 5px;
  color: var(--text-3);
  font-size: 10px;
}

.xrm-clue-grid strong {
  color: var(--text-1);
  font-size: 13px;
  line-height: 1.5;
}

.xrm-permission-note {
  margin: 8px 0 0;
  color: var(--text-3);
  font-size: 10px;
  line-height: 1.5;
}

.xrm-attention-card {
  border-color: rgba(255, 190, 99, 0.24);
  background: linear-gradient(135deg, rgba(255, 184, 92, 0.06), rgba(5, 27, 51, 0.22));
}

.xrm-attention-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.xrm-attention-list li {
  position: relative;
  padding: 8px 9px 8px 27px;
  border-radius: 7px;
  background: var(--surface-3);
  color: var(--text-2);
  font-size: 11px;
  line-height: 1.55;
}

.xrm-attention-list li::before {
  content: '→';
  position: absolute;
  left: 9px;
  color: #ffbd67;
  font-weight: 700;
}

.xrm-section-empty {
  padding: 12px;
  border: 1px dashed var(--line);
  border-radius: 7px;
  color: var(--text-3);
  font-size: 11px;
  text-align: center;
}

.xrm-footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-top: 12px;
  padding: 10px 12px;
  border-top: 1px dashed var(--line);
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.6;
}

:global(body.theme-light) .xrm-card {
  --page-bg: #f3f8fd;
  --surface-1: #ffffff;
  --surface-2: #f7fbff;
  --surface-3: #f2f7fc;
  --surface-solid: #f7fbff;
  --line: #c7dff0;
  --line-strong: #70b6dc;
  --text-1: #0a2f4d;
  --text-2: #315d78;
  --text-3: #668ca4;
  --title: #087aa8;
  --input-bg: #f8fbfe;
  --shadow: 0 12px 32px rgba(36, 90, 128, 0.12);
  background: #f4f9fd !important;
}

:global(body.theme-light) .xrm-page-header {
  border-bottom-color: #b9d9ec;
  background:
    linear-gradient(90deg, rgba(102, 174, 224, 0.88), rgba(126, 166, 218, 0.86)),
    #78a9d4;
}

:global(body.theme-light) .xrm-title-group h2,
:global(body.theme-light) .xrm-title-group p,
:global(body.theme-light) .xrm-header-status {
  color: #0a2f4d;
}

:global(body.theme-light) .xrm-header-status {
  border-color: rgba(10, 80, 125, 0.28);
  background: rgba(255, 255, 255, 0.38);
}

:global(body.theme-light) .xrm-status-dot {
  background: #087aa8;
  box-shadow: 0 0 8px rgba(8, 122, 168, 0.38);
}

:global(body.theme-light) .xrm-summary-card:hover,
:global(body.theme-light) .xrm-summary-card.active,
:global(body.theme-light) .xrm-summary-card:focus-visible {
  box-shadow: 0 10px 22px rgba(28, 93, 136, 0.12);
}

:global(body.theme-light) .xrm-callout-mark {
  color: #ffffff;
}

:global(body.theme-light) .xrm-detail-panel,
:global(body.theme-light) .xrm-map-panel,
:global(body.theme-light) .xrm-filter-section {
  box-shadow: 0 5px 18px rgba(39, 100, 139, 0.06);
}

:global(body.theme-light) .xrm-detail-header {
  box-shadow: 0 8px 18px rgba(46, 97, 129, 0.08);
}

:global(body.theme-light) .xrm-detail-section-card {
  background: #ffffff;
}

:global(body.theme-light) .xrm-timeline-list li::before {
  border-color: #ffffff;
}

:global(body.theme-light) .xrm-filter-select :deep(.arco-select-view) {
  background: #ffffff !important;
}

:global(body.theme-light) .xrm-filter-select :deep(.arco-select-view-value),
:global(body.theme-light) .xrm-filter-select :deep(.arco-select-view-input),
:global(body.theme-light) .xrm-filter-select :deep(.arco-select-view-suffix) {
  color: #0a2f4d !important;
}


/* 防止项目中旧地图样式使用同名选择器覆盖本组件，并强化深浅主题文字对比。 */
.xrm-card,
.xrm-card * {
  box-sizing: border-box;
}

.xrm-card .xrm-page-header {
  min-height: 108px !important;
  height: auto !important;
  overflow: visible !important;
  padding: 20px 24px !important;
}

.xrm-card .xrm-title-group,
.xrm-card .xrm-title-group > *,
.xrm-card .xrm-section-heading,
.xrm-card .xrm-panel-heading {
  opacity: 1 !important;
  visibility: visible !important;
}

.xrm-card .eyebrow,
.xrm-card .xrm-section-kicker {
  display: block !important;
  color: var(--title) !important;
}

.xrm-card .xrm-title-group h2,
.xrm-card .xrm-section-heading h3,
.xrm-card .xrm-panel-heading h3,
.xrm-card .xrm-detail-header h3,
.xrm-card .xrm-empty-tip h3 {
  color: var(--text-1) !important;
  text-shadow: 0 1px 2px rgba(0, 8, 22, 0.28);
}

.xrm-card .xrm-title-group p,
.xrm-card .xrm-section-helper,
.xrm-card .xrm-filter-label,
.xrm-card .xrm-summary-label,
.xrm-card .xrm-map-source,
.xrm-card .xrm-footer {
  color: var(--text-2) !important;
}

.xrm-card .xrm-summary-value,
.xrm-card .xrm-metric-card strong,
.xrm-card .xrm-rank-name {
  color: var(--text-1) !important;
}

.xrm-card :deep(.arco-select-view),
.xrm-card :deep(.arco-select-view-single) {
  color: var(--text-1) !important;
}

.xrm-card :deep(.arco-select-view-value),
.xrm-card :deep(.arco-select-view-placeholder),
.xrm-card :deep(.arco-select-view-input),
.xrm-card :deep(.arco-select-view-input input),
.xrm-card :deep(.arco-select-view-suffix),
.xrm-card :deep(.arco-select-view-icon),
.xrm-card :deep(.arco-icon) {
  color: var(--text-1) !important;
  -webkit-text-fill-color: var(--text-1) !important;
  opacity: 1 !important;
}

.xrm-card .xrm-map-stage {
  background:
    radial-gradient(circle at 20% 18%, rgba(39, 139, 255, 0.24), transparent 34%),
    radial-gradient(circle at 82% 78%, rgba(0, 201, 181, 0.12), transparent 30%),
    linear-gradient(180deg, #0a2546 0%, #06162d 100%) !important;
}

.xrm-card .xrm-map-legend {
  border-color: rgba(204, 244, 255, 0.52) !important;
  background: rgba(3, 18, 36, 0.92) !important;
}

.xrm-card .xrm-legend-title {
  color: #ffffff !important;
}

.xrm-card .xrm-legend-scale,
.xrm-card .xrm-legend-ranges span,
.xrm-card .xrm-map-legend p {
  color: #c1e8f7 !important;
}

:global(body.theme-light) .xrm-card .xrm-title-group h2,
:global(body.theme-light) .xrm-card .xrm-section-heading h3,
:global(body.theme-light) .xrm-card .xrm-panel-heading h3,
:global(body.theme-light) .xrm-card .xrm-detail-header h3,
:global(body.theme-light) .xrm-card .xrm-empty-tip h3 {
  color: #082f4e !important;
  text-shadow: none;
}

:global(body.theme-light) .xrm-card :deep(.arco-select-view-value),
:global(body.theme-light) .xrm-card :deep(.arco-select-view-placeholder),
:global(body.theme-light) .xrm-card :deep(.arco-select-view-input),
:global(body.theme-light) .xrm-card :deep(.arco-select-view-input input),
:global(body.theme-light) .xrm-card :deep(.arco-select-view-suffix),
:global(body.theme-light) .xrm-card :deep(.arco-select-view-icon),
:global(body.theme-light) .xrm-card :deep(.arco-icon) {
  color: #082f4e !important;
  -webkit-text-fill-color: #082f4e !important;
}


/* 组件自身检测主题，避免 scoped/global 选择器或页面外层类名变化导致浅色模式仍套用深色背景。 */
.xrm-card.xrm-theme-light {
  --page-bg: #eef6fc;
  --surface-1: #ffffff;
  --surface-2: #f5faff;
  --surface-3: #edf5fb;
  --surface-solid: #f8fcff;
  --line: #b9d7e9;
  --line-strong: #3d96c3;
  --text-1: #092f4d;
  --text-2: #285b78;
  --text-3: #587f98;
  --title: #087cae;
  --input-bg: #ffffff;
  --shadow: 0 12px 32px rgba(31, 88, 124, 0.13);
  background: #eef6fc !important;
  color: var(--text-1) !important;
}

.xrm-card.xrm-theme-light .xrm-page-header {
  border-bottom-color: #aad0e7 !important;
  background:
    linear-gradient(90deg, #66afe0 0%, #8caed8 100%) !important;
}

.xrm-card.xrm-theme-light .xrm-title-group h2,
.xrm-card.xrm-theme-light .xrm-title-group p,
.xrm-card.xrm-theme-light .xrm-header-status {
  color: #082f4e !important;
  text-shadow: none !important;
}

.xrm-card.xrm-theme-light .eyebrow,
.xrm-card.xrm-theme-light .xrm-section-kicker {
  color: #075f89 !important;
}

.xrm-card.xrm-theme-light .xrm-header-status {
  border-color: rgba(16, 83, 124, 0.32) !important;
  background: rgba(255, 255, 255, 0.48) !important;
}

.xrm-card.xrm-theme-light .xrm-filter-section,
.xrm-card.xrm-theme-light .xrm-map-panel,
.xrm-card.xrm-theme-light .xrm-detail-panel,
.xrm-card.xrm-theme-light .xrm-summary-card {
  background-color: #ffffff !important;
  color: var(--text-1) !important;
  box-shadow: 0 5px 18px rgba(39, 100, 139, 0.08);
}

.xrm-card.xrm-theme-light .xrm-summary-card {
  background:
    linear-gradient(140deg, var(--accent-soft), transparent 64%),
    #ffffff !important;
}

.xrm-card.xrm-theme-light .xrm-detail-header {
  background: #f8fcff !important;
  box-shadow: 0 8px 18px rgba(46, 97, 129, 0.09);
}

.xrm-card.xrm-theme-light .xrm-detail-section-card,
.xrm-card.xrm-theme-light .xrm-metric-card,
.xrm-card.xrm-theme-light .xrm-plain-list li,
.xrm-card.xrm-theme-light .xrm-tag-list li,
.xrm-card.xrm-theme-light .xrm-timeline-list li,
.xrm-card.xrm-theme-light .xrm-clue-grid > div,
.xrm-card.xrm-theme-light .xrm-attention-list li,
.xrm-card.xrm-theme-light .xrm-empty-steps span {
  background: #f4f9fd !important;
}

.xrm-card.xrm-theme-light .xrm-map-stage {
  background:
    radial-gradient(circle at 18% 18%, rgba(67, 151, 205, 0.20), transparent 35%),
    radial-gradient(circle at 82% 78%, rgba(30, 166, 156, 0.12), transparent 32%),
    linear-gradient(180deg, #dceefa 0%, #c8e2f3 100%) !important;
  box-shadow: inset 0 0 34px rgba(54, 126, 173, 0.10);
}

.xrm-card.xrm-theme-light .xrm-map-ctrl-btn {
  border-color: #72aecd !important;
  background: rgba(255, 255, 255, 0.92) !important;
  color: #155b80 !important;
  box-shadow: 0 4px 12px rgba(31, 92, 128, 0.12);
}

.xrm-card.xrm-theme-light .xrm-map-ctrl-btn:hover {
  border-color: #237ca8 !important;
  background: #e8f5fc !important;
  color: #073f60 !important;
}

.xrm-card.xrm-theme-light .xrm-map-legend {
  border-color: #6ba2c0 !important;
  background: rgba(255, 255, 255, 0.94) !important;
}

.xrm-card.xrm-theme-light .xrm-legend-title {
  color: #092f4d !important;
}

.xrm-card.xrm-theme-light .xrm-legend-toggle,
.xrm-card.xrm-theme-light .xrm-legend-open {
  border-color: #5f9fc2 !important;
  background: linear-gradient(180deg, #ffffff 0%, #eaf6fd 100%) !important;
  color: #0d5278 !important;
  box-shadow: 0 5px 14px rgba(31, 92, 128, 0.16);
}

.xrm-card.xrm-theme-light .xrm-legend-toggle:hover,
.xrm-card.xrm-theme-light .xrm-legend-open:hover {
  border-color: #237ca8 !important;
  background: linear-gradient(180deg, #f7fcff 0%, #dceff9 100%) !important;
  color: #073f60 !important;
}

.xrm-card.xrm-theme-light .xrm-legend-scale,
.xrm-card.xrm-theme-light .xrm-legend-ranges span,
.xrm-card.xrm-theme-light .xrm-map-legend p {
  color: #416d86 !important;
}

.xrm-card.xrm-theme-light .xrm-compat-tip {
  border-color: #d89a3c !important;
  background: rgba(255, 249, 235, 0.96) !important;
  color: #865713 !important;
}

.xrm-card.xrm-theme-light .xrm-compat-badge {
  background: #f8dfaf !important;
  color: #744400 !important;
}

.xrm-card.xrm-theme-light .xrm-filter-select {
  border-color: #a9cadf;
  background: #ffffff;
  color: #092f4d;
  color-scheme: light;
}

.xrm-card.xrm-theme-light .xrm-filter-select option {
  background: #ffffff;
  color: #092f4d;
}

.xrm-card.xrm-theme-light .xrm-select-arrow {
  color: #315f79;
}

.xrm-card.xrm-theme-light .xrm-map-state {
  background: rgba(233, 245, 252, 0.94);
  color: #123d59;
}

.xrm-card.xrm-theme-light .xrm-map-state span {
  color: #587f98;
}

/* 页头、筛选区和汇总区在现有基础上统一放大 2px。 */
.xrm-page-header .eyebrow {
  font-size: 14px;
}

.xrm-page-header .xrm-title-group h2 {
  font-size: 25px;
}

.xrm-page-header .xrm-title-group p {
  font-size: 16px;
}

.xrm-page-header .xrm-header-status {
  font-size: 15px;
}

.xrm-filter-section .xrm-section-kicker,
.xrm-summary-section .xrm-section-kicker,
.xrm-map-panel .xrm-section-kicker {
  font-size: 14px;
}

.xrm-filter-section .xrm-section-heading h3,
.xrm-summary-section .xrm-section-heading h3,
.xrm-map-panel .xrm-panel-heading h3 {
  font-size: 19px;
}

.xrm-filter-section .xrm-section-helper,
.xrm-summary-section .xrm-section-helper {
  font-size: 15px;
}

.xrm-filter-section .xrm-filter-label {
  font-size: 15px;
}

.xrm-filter-section .xrm-filter-select,
.xrm-filter-section .xrm-filter-select :deep(.arco-select-view-value),
.xrm-filter-section .xrm-filter-select :deep(.arco-select-view-input),
.xrm-filter-section .xrm-filter-select :deep(.arco-select-view-suffix) {
  font-size: 16px;
}

.xrm-filter-section .xrm-select-arrow {
  font-size: 19px;
}

.xrm-summary-section .xrm-summary-symbol {
  font-size: 15px;
}

.xrm-summary-section .xrm-summary-label {
  font-size: 16px;
}

.xrm-summary-section .xrm-summary-value {
  font-size: 33px;
}

.xrm-summary-section .xrm-summary-card small {
  font-size: 14px;
}

.xrm-summary-section .xrm-summary-callout,
.xrm-summary-section .xrm-callout-mark {
  font-size: 15px;
}

/* 右侧详情栏提高可读性。 */
.xrm-detail-panel {
  font-size: 16px;
  line-height: 1.72;
}

.xrm-detail-header {
  padding: 20px;
}

.xrm-detail-header h3 {
  font-size: 25px;
}

.xrm-detail-meta {
  font-size: 14px;
}

.xrm-metric-grid {
  gap: 11px;
  padding: 16px;
}

.xrm-metric-card {
  padding: 14px;
}

.xrm-metric-label {
  font-size: 15px;
}

.xrm-metric-change {
  min-height: 42px;
  font-size: 18px;
}

.xrm-metric-card small {
  font-size: 13.5px;
  line-height: 1.6;
}

.xrm-detail-section-card {
  margin: 0 16px 16px;
  padding: 17px;
}

.xrm-detail-xrm-section-heading h4 {
  font-size: 18px;
}

.xrm-detail-xrm-section-heading p {
  font-size: 13.5px;
  line-height: 1.55;
}

.xrm-section-index {
  width: 32px;
  height: 26px;
  font-size: 12px;
}

.xrm-rank-name,
.xrm-plain-list li,
.xrm-tag-list li,
.xrm-attention-list li {
  font-size: 15px;
}

.xrm-rank-value,
.xrm-plain-list em,
.xrm-tag-list em,
.xrm-timeline-list em,
.xrm-clue-grid span,
.xrm-permission-note {
  font-size: 13.5px;
}

.xrm-timeline-list strong,
.xrm-timeline-list span {
  font-size: 14.5px;
}

.xrm-clue-grid strong {
  font-size: 16px;
}

.xrm-section-empty,
.xrm-empty-data {
  font-size: 14px;
}


.xrm-footer-copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 5px;
}

.xrm-footer-compat-line {
  color: #e8bd79;
  font-size: 12px;
  line-height: 1.65;
}

.xrm-footer-compat-line b {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 184, 92, 0.16);
  color: #ffd18f;
}

.xrm-footer-time {
  flex: 0 0 auto;
  align-self: flex-start;
  white-space: nowrap;
}

.xrm-card.xrm-theme-light .xrm-footer-compat-line {
  color: #82520c !important;
}

.xrm-card.xrm-theme-light .xrm-footer-compat-line b {
  background: #f6dfb5 !important;
  color: #6f4100 !important;
}

@media (max-width: 1360px) {
  .xrm-layout {
    grid-template-columns: minmax(0, 1.1fr) minmax(460px, 1fr);
  }

  .xrm-map-source {
    max-width: 200px;
  }
}

@media (max-width: 1080px) {
  .xrm-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .xrm-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .xrm-layout {
    grid-template-columns: 1fr;
  }

  .xrm-detail-panel {
    max-height: 620px !important;
  }
}

@media (max-width: 720px) {
  .xrm-page-header,
  .xrm-section-heading,
  .xrm-panel-heading,
  .xrm-map-caption,
  .xrm-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .xrm-page-header,
  .xrm-content {
    padding-left: 14px;
    padding-right: 14px;
  }

  .xrm-header-status {
    align-self: flex-start;
  }

  .xrm-filter-grid,
  .xrm-summary-grid {
    grid-template-columns: 1fr;
  }

  .xrm-section-helper,
  .xrm-map-source {
    align-items: flex-start;
    text-align: left;
  }

  .xrm-compat-tip {
    left: 14px;
    right: 14px;
    bottom: 88px;
  }

  .xrm-map-legend {
    width: 192px;
  }

  .xrm-metric-grid {
    grid-template-columns: 1fr;
  }

  .xrm-metric-card.primary {
    grid-column: auto;
  }
}
</style>
