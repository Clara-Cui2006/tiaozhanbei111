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
      <section v-if="isPoliticalMode" class="xrm-method-section xrm-section-shell">
        <div class="xrm-section-heading">
          <div>
            <span class="xrm-section-kicker">四维研判</span>
            <h3>政治安全四维研判</h3>
          </div>
          <span class="xrm-section-helper">围绕哪里发生、发生什么、涉及谁、什么时候变化进行综合分析</span>
        </div>

        <div class="xrm-method-grid">
          <div v-for="item in politicalMethodCards" :key="item.name" class="xrm-method-card">
            <strong>{{ item.name }}</strong>
            <span>{{ item.description }}</span>
          </div>
        </div>

        <div class="xrm-political-filter-bar" aria-label="政治安全专题和复核状态筛选">
          <div class="xrm-filter-item compact">
            <span class="xrm-filter-label">重点专题</span>
            <div class="xrm-select-wrap">
              <select v-model="politicalTopicFilter" class="xrm-filter-select" aria-label="重点专题">
                <option value="all">全部专题</option>
                <option value="涉外风险">涉外风险</option>
              </select>
              <span class="xrm-select-arrow" aria-hidden="true">⌄</span>
            </div>
          </div>
          <div class="xrm-filter-item compact">
            <span class="xrm-filter-label">复核状态</span>
            <div class="xrm-select-wrap">
              <select v-model="politicalReviewFilter" class="xrm-filter-select" aria-label="复核状态">
                <option value="all">全部状态</option>
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
      </section>

      <section v-else class="xrm-filter-section xrm-section-shell">
        <div class="xrm-section-heading">
          <div>
            <span class="xrm-section-kicker">筛选条件</span>
            <h3>选择统计口径</h3>
          </div>
          <span class="xrm-section-helper">{{ isPoliticalMode ? '点击四维筛选后，仅加载政治安全相关案件' : '筛选变化后，地图和街道详情同步更新' }}</span>
        </div>

        <div class="xrm-filter-grid">
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

      <section v-if="!isPoliticalMode" class="xrm-summary-section">
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
            <div class="xrm-map-mode-switch" role="group" aria-label="地图视图切换">
              <button
                type="button"
                :class="{ active: mapViewMode === '3d' }"
                :disabled="mapBoundaryMode !== 'street'"
                @click="setMapViewMode('3d')"
              >3D</button>
              <button
                type="button"
                :class="{ active: mapViewMode === '2d' }"
                :disabled="mapBoundaryMode !== 'street'"
                @click="setMapViewMode('2d')"
              >2D</button>
            </div>
          </div>

          <div class="xrm-map-stage" :style="{ height: `${mapDisplayHeight}px` }">
            <XichengThreeMap
              v-if="mapBoundaryMode === 'street' && mapViewMode === '3d' && overview"
              ref="threeMapRef"
              :streets="overview.streets"
              :selected-street-name="activeStreetName"
              @select="selectStreetFromThree"
              @clear="clearSelection"
              @error="handleThreeMapError"
            />
            <div
              v-else
              ref="mapRef"
              class="xrm-map-box"
              :style="{ height: `${mapDisplayHeight}px` }"
              @wheel.capture.prevent.stop="handleMapWheel"
            ></div>

            <div v-if="mapViewMode === '2d'" class="xrm-map-breath-overlay" aria-hidden="true"></div>

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
              <div class="xrm-legend-gradient" :style="legendGradientStyle"></div>
              <div class="xrm-legend-scale">
                <span>相对最少</span>
                <span>相对最多</span>
              </div>
              <div class="xrm-legend-ranges">
                <span v-for="(item, index) in quantityLegendItems" :key="index">
                  <i :style="{ backgroundColor: item.color }"></i>
                  {{ item.label }}
                </span>
              </div>
              <p class="xrm-legend-difference">颜色表示15个街道的相对数量差异</p>
              <p class="xrm-legend-rule">最低值映射为蓝色，最高值映射为红色，中间值连续渐变</p>
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
              <button class="xrm-close-button" title="关闭详情" @click="clearSelection()">×</button>
              <div class="xrm-detail-meta">
                <span class="xrm-detail-filter-summary">
                  <span>统计周期：{{ currentPeriodLabel }}</span>
                <span v-if="isPoliticalMode">重点专题：{{ politicalTopicFilter === 'all' ? '全部专题' : politicalTopicFilter }}</span>
                <span v-if="isPoliticalMode">复核状态：{{ politicalReviewFilter === 'all' ? '全部状态' : politicalReviewFilter }}</span>
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
              <span v-if="isPoliticalMode">重点专题：{{ politicalTopicFilter === 'all' ? '全部专题' : politicalTopicFilter }}</span>
              <span v-if="isPoliticalMode">复核状态：{{ politicalReviewFilter === 'all' ? '全部状态' : politicalReviewFilter }}</span>
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
import 'echarts-gl'
import { patchMap3DStreetLift } from './map3d-street-lift'
import XichengThreeMap from './xicheng-three-map/XichengThreeMap.vue'
import {
  QUANTITY_COLORS,
  buildRelativeLegendStops,
  getCaseCountExtent,
  getRelativeCaseColor
} from './xicheng-three-map/case-count-metrics'
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
import {
  CHART_PALETTES,
  areaGradient,
  buildPieDepthLayers,
  raisedPieStyle,
  rgbaHex,
  shadeHex,
  type ChartDatum
} from '../utils/chart-visual'

// 让 map3D 支持“整块平移”而非“拉高”，并为上下表面/侧面补全棱边高光。
const map3DLiftPatched = patchMap3DStreetLift()

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
const MAP_DEFAULT_DISTANCE = 118
const STREET_BASE_HEIGHT = 7.2
// 选中时整个立体块平移的高度，不再改变街道自身厚度。
const STREET_SELECTED_LIFT = 10
// 名称锚点贴在块顶（底面高度）；●││● 引线从名称框连到块顶，补丁会自动叠加 offset。
const STREET_LABEL_ANCHOR = STREET_BASE_HEIGHT
// 小屏保留地图信息密度，但缩短名称框并启用避让，避免 15 个街道名称互相遮挡。
let compactMapLabels = false
// 3D/2D 共用的街道名称框样式：黑底、不透明、白字。
const getStreetLabelBox = (selected: boolean) => ({
  color: selected ? '#FFFFFF' : '#E9F5F9',
  backgroundColor: selected ? 'rgba(8, 31, 53, 1)' : 'rgba(4, 18, 34, 0.98)',
  borderColor: selected ? 'rgba(255, 255, 255, 0.98)' : 'rgba(139, 231, 255, 0.68)',
  borderWidth: selected ? 2 : 1,
  borderRadius: 6,
  padding: compactMapLabels ? [4, 7] : [6, 11],
  fontSize: compactMapLabels ? (selected ? 14 : 13) : (selected ? 17 : 16),
  fontWeight: 800,
  fontFamily: 'Microsoft YaHei UI, PingFang SC, Noto Sans CJK SC, sans-serif',
  lineHeight: compactMapLabels ? 20 : 24
})
const MAP_MIN_ZOOM = 0.28
const MAP_MAX_ZOOM = 5
const MAP_MIN_DISTANCE = 32
const MAP_MAX_DISTANCE = 420

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
type XichengThreeMapExpose = {
  zoomIn(): void
  zoomOut(): void
  reset(): void
  focusStreet(streetName: string): void
}

const mapRef = ref<HTMLDivElement | null>(null)
const threeMapRef = ref<XichengThreeMapExpose | null>(null)
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
const mapViewMode = ref<'3d' | '2d'>('3d')
// 街道多边形质心（2D 名称放在街道内部）与西城区外轮廓折线（2D 外部粗边框）。
// 两者都直接来自 xicheng_streets.geojson，不依赖其他地图文件。
const streetCentroids = ref<Record<string, [number, number]>>({})
const districtOuterPolylines = ref<Array<Array<[number, number]>>>([])
// 记录上一次完整渲染的视图，用于 2D→3D 切换时清掉 2D 残留。
let lastRenderedMapMode: '3d' | '2d' | 'district' | null = null
const detail = ref<StreetMapDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref(false)
const activeDetailTab = ref<'metrics' | 'charts'>('metrics')
const summaryExplanation = ref<StreetMapSummaryKey | ''>('')
const politicalTopicFilter = ref('all')
const politicalReviewFilter = ref('all')
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
let map3DViewInitialized = false
let mapEdgeAnimationFrame = 0
let mapEdgeAnimationStartedAt = 0
let mapEdgeLastPaintAt = 0
let lastStreetClickAt = 0
let mapCameraInteractionUntil = 0
let circuitDetailTexture: HTMLCanvasElement | null = null
const map3DViewState = {
  distance: MAP_DEFAULT_DISTANCE,
  alpha: 46,
  beta: 0,
  center: [0, 0, 0] as [number, number, number]
}

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
const politicalMethodCards = [
  { name: '地点因素', description: '研判案件发生区域、核心区属性和空间聚集情况' },
  { name: '行为内容', description: '识别涉密流转、异常聚集、敏感接触等风险行为' },
  { name: '涉及主体', description: '分析重点关注人员、涉外关联人员等主体结构' },
  { name: '时间因素', description: '观察案件数量在月份、季度和重大活动前后的变化' }
]

watch(isPoliticalMode, (enabled) => {
  filters.politicalOnly = enabled
}, { immediate: true })

watch([politicalTopicFilter, politicalReviewFilter], () => {
  filters.reviewStatusTopic = politicalReviewFilter.value !== 'all'
    ? politicalReviewFilter.value
    : politicalTopicFilter.value
})

const syncTheme = () => {
  isLightTheme.value = detectLightTheme()
}

const getChartTheme = () => isLightTheme.value
  ? {
      tooltipBg: 'rgba(255, 255, 255, 0.98)',
      tooltipBorder: '#4B8DB8',
      tooltipText: '#123B59',
      tooltipHint: '#3C789A',
      mapArea: '#EAF4FF',
      mapBorder: '#6DA4D8',
      mapShadow: 'rgba(44, 111, 151, 0.22)',
      labelText: '#0B3552',
      labelBg: 'rgba(255, 255, 255, 0.90)',
      labelBorder: 'rgba(35, 103, 143, 0.58)',
      labelStroke: 'rgba(255, 255, 255, 0.96)',
      selectedLabelText: '#FFFFFF',
      selectedLabelBg: '#2F7FB9',
      selectedLabelBorder: '#D7EDFF',
      selectedLabelStroke: 'rgba(13, 52, 88, 0.72)',
      pointBorder: '#FFFFFF'
    }
  : {
      tooltipBg: 'rgba(7, 24, 46, 0.96)',
      tooltipBorder: 'rgba(113, 216, 240, 0.7)',
      tooltipText: '#EAFAFF',
      tooltipHint: '#8FC6DC',
      mapArea: '#1B4266',
      mapBorder: '#9BD9F4',
      mapShadow: 'rgba(45, 161, 204, 0.22)',
      labelText: '#DFF8FF',
      labelBg: 'rgba(3, 18, 36, 0.82)',
      labelBorder: 'rgba(193, 241, 255, 0.52)',
      labelStroke: 'rgba(2, 12, 27, 0.98)',
      selectedLabelText: '#FFFFFF',
      selectedLabelBg: '#2F8EC5',
      selectedLabelBorder: '#DFF6FF',
      selectedLabelStroke: 'rgba(4, 30, 55, 0.92)',
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
        if (mapBoundaryMode.value === 'street') {
          const geometryData = buildStreetGeometryData(prepared.geoJson)
          streetCentroids.value = geometryData.centroids
          districtOuterPolylines.value = geometryData.outerPolylines
        }
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

// 从街道 GeoJSON 直接推导：每个街道的质心 + 西城区外轮廓折线。
// 外轮廓 = 只被一个街道使用的边界边（相邻街道共享边被排除），与街道底图天然对齐。
const buildStreetGeometryData = (geoJson: any) => {
  const centroids: Record<string, [number, number]> = {}
  const ringsOf = (geometry: any) => {
    if (!geometry) return []
    if (geometry.type === 'Polygon') return geometry.coordinates
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
    return []
  }
  const round = (value: number) => Math.round(value * 1e6) / 1e6
  const pointKey = (point: [number, number]) => `${round(point[0])},${round(point[1])}`
  const edgeKey = (a: [number, number], b: [number, number]) => {
    const pa = pointKey(a)
    const pb = pointKey(b)
    return pa <= pb ? `${pa}|${pb}` : `${pb}|${pa}`
  }

  const edgeCounts = new Map<string, number>()
  const segments: Array<[[number, number], [number, number]]> = []

  geoJson.features?.forEach((feature: any) => {
    const name = feature?.properties?.name
    const rings = ringsOf(feature?.geometry)
    const exterior = rings.reduce(
      (largest: any, ring: any) => (ring.length >= largest.length ? ring : largest),
      rings[0] || []
    )
    if (exterior.length) {
      const cx = exterior.reduce((sum: number, point: any) => sum + Number(point?.[0] ?? 0), 0) / exterior.length
      const cy = exterior.reduce((sum: number, point: any) => sum + Number(point?.[1] ?? 0), 0) / exterior.length
      if (Number.isFinite(cx) && Number.isFinite(cy)) centroids[name] = [cx, cy]
    }

    rings.forEach((ring: any) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const a: [number, number] = [Number(ring[i]?.[0]), Number(ring[i]?.[1])]
        const b: [number, number] = [Number(ring[i + 1]?.[0]), Number(ring[i + 1]?.[1])]
        if (!Number.isFinite(a[0]) || !Number.isFinite(b[0])) continue
        const key = edgeKey(a, b)
        edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1)
        segments.push([a, b])
      }
    })
  })

  const outerEdges = new Set<string>()
  edgeCounts.forEach((count, key) => {
    if (count === 1) outerEdges.add(key)
  })

  const outerSegments = segments.filter(([a, b]) => outerEdges.has(edgeKey(a, b)))
  const vertexEdges = new Map<string, number[]>()
  outerSegments.forEach((segment, index) => {
    const keys = [pointKey(segment[0]), pointKey(segment[1])]
    keys.forEach((key) => vertexEdges.set(key, [...(vertexEdges.get(key) || []), index]))
  })

  const polylines: Array<Array<[number, number]>> = []
  const used = new Set<number>()
  outerSegments.forEach((segment, startIndex) => {
    if (used.has(startIndex)) return
    used.add(startIndex)
    const line: Array<[number, number]> = [[...segment[0]], [...segment[1]]]
    let current = pointKey(segment[1])
    let currentSegment = startIndex
    const startKey = pointKey(segment[0])

    for (let guard = 0; guard < outerSegments.length; guard++) {
      if (current === startKey) break
      const candidates = (vertexEdges.get(current) || []).filter((index) => !used.has(index))
      if (!candidates.length) break
      const next = candidates[0]!
      used.add(next)
      const seg = outerSegments[next]!
      const nextPoint = pointKey(seg[0]) === current ? seg[1]! : seg[0]!
      line.push([...nextPoint])
      current = pointKey(nextPoint)
      currentSegment = next
    }
    if (line.length >= 3) polylines.push(line)
  })

  return { centroids, outerPolylines: polylines }
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
  data: Array<{ name: string; count: number; rate?: number }>,
  palette: readonly string[]
) => {
  if (!container) return current
  current?.dispose()
  const instance = echarts.init(container)
  const chartTheme = getChartTheme()
  const light = isLightTheme.value
  const center: [string, string] = ['50%', '47%']
  const radius: [string, string] = ['36%', '64%']
  const prepared: ChartDatum[] = data.map((item, index) => {
    const color = light ? shadeHex(palette[index % palette.length]!, -24) : palette[index % palette.length]!
    return { name: item.name, value: item.count, baseColor: color, itemStyle: raisedPieStyle(color, index) }
  })
  instance.setOption({
    backgroundColor: 'transparent',
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    animationDelay: (index: number) => index * 65,
    tooltip: {
      trigger: 'item',
      backgroundColor: chartTheme.tooltipBg,
      borderColor: chartTheme.tooltipBorder,
      textStyle: { color: chartTheme.tooltipText },
      formatter: (params: any) => `${params.name}<br/>政治安全案件数量：${params.value} 件<br/>占比：${params.percent}%`
    },
    series: [
      ...buildPieDepthLayers(title, prepared, radius, center, 6),
      {
        name: title,
        type: 'pie',
        radius,
        center,
        z: 20,
        selectedMode: 'single',
        selectedOffset: 10,
        padAngle: 3,
        avoidLabelOverlap: true,
        label: {
          color: chartTheme.labelText,
          fontSize: 11,
          formatter: '{b}\n{d}%',
          textBorderWidth: 2,
          textBorderColor: light ? '#fff' : '#06152b'
        },
        labelLine: { length: 8, length2: 6, smooth: 0.2, lineStyle: { color: chartTheme.labelText } },
        emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 28, shadowOffsetY: 13 } },
        data: prepared
      }
    ]
  })
  return instance
}

const renderDetailCharts = async () => {
  if (activeDetailTab.value !== 'charts' || !detail.value) return
  await nextTick()
  const chartTheme = getChartTheme()
  subjectChart = renderPieChart(subjectChartRef.value, subjectChart, '涉及主体分析', detail.value.subjectBreakdown || [], CHART_PALETTES.caseBlue)
  behaviorChart = renderPieChart(behaviorChartRef.value, behaviorChart, '行为内容类型分析', detail.value.behaviorBreakdown || [], CHART_PALETTES.violetCyan)
  timeTrendChart?.dispose()
  timeTrendChart = null
  if (timeTrendChartRef.value) {
    timeTrendChart = echarts.init(timeTrendChartRef.value)
    const trend = detail.value.timeTrend || []
    const lineColor = isLightTheme.value ? '#c7354b' : '#f04f65'
    timeTrendChart.setOption({
      backgroundColor: 'transparent',
      animationDuration: 1100,
      animationEasing: 'cubicOut',
      animationDelay: (index: number) => index * 60,
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
        symbolSize: 9,
        data: trend.map((item) => item.count),
        lineStyle: { color: lineColor, width: 3, shadowBlur: 14, shadowColor: rgbaHex(lineColor, 0.66) },
        itemStyle: { color: lineColor, borderColor: '#f2d28d', borderWidth: 1.4, shadowBlur: 12, shadowColor: rgbaHex(lineColor, 0.7) },
        areaStyle: { color: areaGradient(lineColor, 0.42) },
        emphasis: { scale: true, scaleSize: 5 }
      }]
    })
  }
}

const getCurrentCaseCountExtent = () => {
  const values = overview.value?.streets.map((item) => item.caseCount) || []
  return getCaseCountExtent(values)
}

const getMaxCaseCount = () => getCurrentCaseCountExtent().max
const getCurrentQuantityColor = (value: number) => {
  const { min, max } = getCurrentCaseCountExtent()
  return getRelativeCaseColor(value, min, max)
}

const quantityLegendItems = computed(() => {
  const { min, max } = getCurrentCaseCountExtent()
  return buildRelativeLegendStops(min, max)
})

const legendGradientStyle = computed(() => ({
  background: `linear-gradient(90deg, ${QUANTITY_COLORS[0]} 0%, ${QUANTITY_COLORS[1]} 25%, ${QUANTITY_COLORS[2]} 50%, ${QUANTITY_COLORS[3]} 75%, ${QUANTITY_COLORS[4]} 100%)`
}))

const getTooltipOption = () => {
  const theme = getChartTheme()
  return {
    trigger: 'item',
    backgroundColor: theme.tooltipBg,
    borderColor: theme.tooltipBorder,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: {
      color: theme.tooltipText,
      fontSize: 15,
      fontFamily: 'Microsoft YaHei UI, PingFang SC, Noto Sans CJK SC, sans-serif'
    }
  }
}

const getFluorescentLabelFormatter = (name: string, _selected = false) => {
  // 名称 + 引线（●││● 竖线），整组作为同一张精灵图，随块一起升降。
  return `{name|${getShortStreetName(name)}}\n{topDot|●}\n{stem|│}\n{stem|│}\n{bottomDot|●}`
}

const getFluorescentLabelRich = (selected = false) => {
  const darkMode = !isLightTheme.value
  const labelWidth = compactMapLabels ? 70 : 96
  return {
    // 名称采用高对比玻璃黑底；桌面保持 16px 起，窄屏按画布宽度降级并启用避让。
    name: {
      color: darkMode ? (selected ? '#F1F7F9' : '#E3F1F5') : (selected ? '#FFFFFF' : '#EAF6FA'),
      fontSize: compactMapLabels ? (selected ? 14 : 13) : (selected ? 17 : 16),
      fontWeight: 800,
      fontFamily: 'Microsoft YaHei UI, PingFang SC, Noto Sans CJK SC, sans-serif',
      lineHeight: compactMapLabels ? 20 : 26,
      width: labelWidth,
      align: 'center',
      backgroundColor: selected ? 'rgba(8, 31, 53, 1)' : 'rgba(4, 18, 34, 0.98)',
      borderColor: selected ? 'rgba(255, 255, 255, 0.98)' : 'rgba(139, 231, 255, 0.68)',
      borderWidth: selected ? 2 : 1,
      borderRadius: 6,
      padding: compactMapLabels ? [4, 7] : [6, 11]
    },
    // 引线：与名称框同宽并居中，形成一根正对名称中心的竖直线。
    topDot: {
      color: selected ? '#FFFFFF' : '#D9FBFF',
      fontSize: 9,
      fontWeight: 900,
      lineHeight: 8,
      width: labelWidth,
      align: 'center',
      textShadowColor: selected ? 'rgba(255,255,255,1)' : 'rgba(58,226,255,0.96)',
      textShadowBlur: selected ? 16 : 11
    },
    stem: {
      color: selected ? '#FFFFFF' : '#B8F4FF',
      fontSize: 16,
      fontWeight: 900,
      lineHeight: 9,
      width: labelWidth,
      align: 'center',
      textShadowColor: selected ? 'rgba(255, 255, 255, 1)' : 'rgba(45, 221, 255, 0.98)',
      textShadowBlur: selected ? 16 : 11
    },
    bottomDot: {
      color: selected ? '#FFFFFF' : '#D9FBFF',
      fontSize: 9,
      fontWeight: 900,
      lineHeight: 8,
      width: labelWidth,
      align: 'center',
      textShadowColor: selected ? 'rgba(255,255,255,1)' : 'rgba(58,226,255,0.96)',
      textShadowBlur: selected ? 16 : 11
    }
  }
}

const getCircuitDetailTexture = () => {
  if (circuitDetailTexture || typeof document === 'undefined') return circuitDetailTexture
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // detailTexture 会与案件分档色相乘，因此使用明暗灰阶绘制电路纹理，
  // 让每块街道保留原案件颜色，同时在顶面呈现正交走线、焊点和芯片节点。
  ctx.fillStyle = 'rgb(236, 242, 245)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 微型基板网格。
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(18, 49, 66, 0.20)'
  for (let offset = 0; offset <= 256; offset += 16) {
    ctx.beginPath()
    ctx.moveTo(offset, 0)
    ctx.lineTo(offset, 256)
    ctx.moveTo(0, offset)
    ctx.lineTo(256, offset)
    ctx.stroke()
  }

  // 主线路全部使用直角折线；固定路径保证纹理可平铺且不会产生随机闪烁。
  const traces = [
    [[-8, 38], [44, 38], [44, 78], [94, 78], [94, 112], [146, 112]],
    [[256, 26], [212, 26], [212, 62], [168, 62], [168, 98], [128, 98]],
    [[0, 154], [34, 154], [34, 126], [72, 126], [72, 184], [116, 184], [116, 222]],
    [[256, 170], [226, 170], [226, 136], [190, 136], [190, 202], [150, 202], [150, 256]],
    [[58, 0], [58, 22], [108, 22], [108, 52], [142, 52]],
    [[176, 256], [176, 232], [214, 232], [214, 214], [256, 214]]
  ] as const

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const drawTrace = (points: ReadonlyArray<readonly [number, number]>) => {
    ctx.beginPath()
    points.forEach(([x, y], pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
  traces.forEach((points, index) => {
    // 深色蚀刻槽 + 中央金属亮线，默认相机距离下也能看见线路。
    ctx.lineWidth = index % 2 === 0 ? 4.6 : 3.8
    ctx.strokeStyle = index % 2 === 0
      ? 'rgba(18, 49, 66, 0.72)'
      : 'rgba(30, 66, 82, 0.60)'
    drawTrace(points)
    ctx.lineWidth = index % 2 === 0 ? 1.45 : 1.1
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)'
    drawTrace(points)
  })

  // 芯片与焊盘节点。
  const chips = [[118, 88, 22, 18], [54, 174, 20, 16], [188, 122, 18, 20]] as const
  chips.forEach(([x, y, width, height]) => {
    ctx.fillStyle = 'rgba(15, 45, 62, 0.68)'
    ctx.fillRect(x, y, width, height)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.76)'
    ctx.lineWidth = 1.4
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
  })

  const vias = [[44, 38], [44, 78], [94, 78], [146, 112], [212, 62], [168, 62], [34, 154], [72, 126], [72, 184], [116, 222], [226, 170], [190, 136], [190, 202], [108, 22], [214, 232]] as const
  vias.forEach(([x, y], index) => {
    ctx.beginPath()
    ctx.arc(x, y, index % 3 === 0 ? 3.2 : 2.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(20, 52, 68, 0.86)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y, 0.9, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.fill()
  })

  circuitDetailTexture = canvas
  return circuitDetailTexture
}

const buildStreetMapData = () => {
  if (!overview.value) return []
  const hasSelection = Boolean(activeStreetName.value)

  return overview.value.streets.map((item) => {
    const quantityColor = getCurrentQuantityColor(item.caseCount)
    const selected = item.streetName === activeStreetName.value
    return {
      name: item.streetName,
      value: item.caseCount,
      selected,
      // 所有街道保持相同的基准厚度；选中时整块向上平移（offset 由本地补丁读取）。
      // echarts-gl 2.x 会读取 regionHeight；保留 height 兼容旧实现。
      height: STREET_BASE_HEIGHT,
      regionHeight: STREET_BASE_HEIGHT,
      ...(selected ? { offset: STREET_SELECTED_LIFT } : {}),
      itemStyle: {
        color: quantityColor,
        areaColor: quantityColor,
        // 玻璃块保持较深色相，但提高透明度，避免“浑浊实心块”。
        opacity: hasSelection && !selected ? 0.25 : selected ? 0.66 : 0.46,
        ...(selected
          ? {
              borderColor: 'rgba(250, 255, 255, 1)',
              borderWidth: 4.2
            }
          : {})
      },
      label: {
        show: true,
        position: 'top',
        // 补丁会把标签锚点随 offset 一起抬起；未打补丁时用旧公式补偿。
        distance: map3DLiftPatched
          ? STREET_LABEL_ANCHOR
          : STREET_LABEL_ANCHOR + (selected ? STREET_SELECTED_LIFT : 0),
        formatter: getFluorescentLabelFormatter(item.streetName, selected),
        rich: getFluorescentLabelRich(selected),
        // opacity:1 防止标签继承街道块的半透明，保证黑底名称框不透明。
        opacity: 1,
        shadowBlur: selected ? 12 : 4,
        shadowColor: selected ? 'rgba(120, 220, 255, 0.5)' : 'rgba(0, 0, 0, 0.35)'
      },
      emphasis: {
        label: {
          formatter: getFluorescentLabelFormatter(item.streetName, true),
          rich: getFluorescentLabelRich(true)
        },
        itemStyle: {
          color: quantityColor,
          areaColor: quantityColor,
          opacity: selected ? 0.70 : 0.56,
          borderColor: '#FFFFFF',
          borderWidth: selected ? 4.2 : 2.8
        }
      },
      select: {
        label: {
          formatter: getFluorescentLabelFormatter(item.streetName, true),
          rich: getFluorescentLabelRich(true)
        },
        itemStyle: {
          color: quantityColor,
          areaColor: quantityColor,
          opacity: 0.68,
          borderColor: '#FFFFFF',
          borderWidth: 4.6
        }
      }
    }
  })
}

// 以同一份街道数据生成几何边缘。普通街道使用青白呼吸亮边，选中街道则提升为白色高亮，
// 同时保留原数量色和区块透明度，避免呼吸动画覆盖每个街道的语义颜色。
const buildStreetMapRegions = (streetData: any[], pulse = 0.55) => {
  const normalizedPulse = Math.max(0, Math.min(1, pulse))
  const normalAlpha = 0.70 + normalizedPulse * 0.26
  const normalWidth = 1.8 + normalizedPulse * 0.9
  const selectedWidth = 4.5 + normalizedPulse * 0.55

  return streetData.map((item: any) => ({
    name: item.name,
    regionHeight: item.regionHeight,
    itemStyle: item.selected
      ? {
          color: item.itemStyle.color,
          areaColor: item.itemStyle.areaColor,
          opacity: 0.70,
          borderColor: `rgba(255, 255, 255, ${(0.94 + normalizedPulse * 0.06).toFixed(3)})`,
          borderWidth: Number(selectedWidth.toFixed(2))
        }
      : {
          color: item.itemStyle.color,
          areaColor: item.itemStyle.areaColor,
          opacity: item.itemStyle.opacity,
          borderColor: `rgba(184, 241, 255, ${normalAlpha.toFixed(3)})`,
          borderWidth: Number(normalWidth.toFixed(2))
        },
    emphasis: item.selected
      ? { itemStyle: { borderColor: '#FFFFFF', borderWidth: 5.1, opacity: 0.74 } }
      : { itemStyle: { borderColor: 'rgba(238, 253, 255, 0.98)', borderWidth: 3.5 } }
  }))
}

const clampMapZoom = (value: number) => Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, value))

const syncMap3DViewStateFromChart = () => {
  if (!chart || mapBoundaryMode.value !== 'street' || mapViewMode.value !== '3d') return
  try {
    const model = (chart as any).getModel?.()
    const seriesModel = model?.getSeries?.().find((item: any) => item?.id === 'xrm-street-map-series')
    const viewModel = seriesModel?.getModel?.('viewControl')
    if (!viewModel) return

    const distance = Number(viewModel.get?.('distance'))
    const alpha = Number(viewModel.get?.('alpha'))
    const beta = Number(viewModel.get?.('beta'))
    const center = viewModel.get?.('center')

    if (Number.isFinite(distance) && distance > 0) {
      map3DViewState.distance = distance
      mapZoom.value = clampMapZoom(MAP_DEFAULT_DISTANCE / distance)
    }
    if (Number.isFinite(alpha)) map3DViewState.alpha = alpha
    if (Number.isFinite(beta)) map3DViewState.beta = beta
    if (Array.isArray(center) && center.length >= 3) {
      map3DViewState.center = [Number(center[0]) || 0, Number(center[1]) || 0, Number(center[2]) || 0]
    }
  } catch {
    // 某些 echarts-gl 构建未暴露 model 读取接口时，继续使用事件同步到的状态。
  }
}

const getCurrentMap3DViewControl = () => ({
  projection: 'perspective',
  autoRotate: false,
  alpha: map3DViewState.alpha,
  beta: map3DViewState.beta,
  distance: Math.max(MAP_MIN_DISTANCE, Math.min(MAP_MAX_DISTANCE, map3DViewState.distance)),
  center: [...map3DViewState.center],
  minDistance: MAP_MIN_DISTANCE,
  maxDistance: MAP_MAX_DISTANCE,
  panMouseButton: 'left',
  rotateMouseButton: 'right',
  zoomSensitivity: 0
})

// echarts-gl 的局部 setOption 会重新挂载材质，并可能关闭已存在的 detailMap 着色器宏。
// 本项目已经为街道上浮使用同版本内部补丁，这里在必要重绘后恢复电路纹理状态。
const getStreetMap3DBuilder = () => {
  const views = (chart as any)?._chartsViews as any[] | undefined
  const mapView = views?.find((item: any) => item?.__model?.id === 'xrm-street-map-series')
  return mapView?._geo3DBuilder
}

const restoreCircuitTexture = () => {
  if (!chart || mapViewMode.value !== '3d') return
  const material = getStreetMap3DBuilder()?._polygonMesh?.material
  if (!material?.get?.('detailMap') || material.isTextureEnabled?.('detailMap')) return
  material.enableTexture?.('detailMap')
  chart.getZr().refresh()
}

const scheduleCircuitTextureRestore = () => {
  if (typeof window === 'undefined') return
  requestAnimationFrame(() => requestAnimationFrame(restoreCircuitTexture))
}

const updateStreetMapSelectionVisuals = () => {
  if (!chart || mapBoundaryMode.value !== 'street' || mapViewMode.value !== '3d' || !overview.value) return
  // map3DViewState 由相机事件和本组件的缩放逻辑维护；这里不再从 model 反读，
  // 避免 model 尚未提交最新缩放时把 distance 覆盖成旧值。
  const streetData = buildStreetMapData()
  chart.setOption({
    series: [{
      id: 'xrm-street-map-series',
      viewControl: getCurrentMap3DViewControl(),
      data: streetData,
      regions: buildStreetMapRegions(streetData)
    }]
  }, { notMerge: false, lazyUpdate: true })
  scheduleCircuitTextureRestore()
}

const stopMapEdgeAnimation = () => {
  if (mapEdgeAnimationFrame) cancelAnimationFrame(mapEdgeAnimationFrame)
  mapEdgeAnimationFrame = 0
  mapEdgeAnimationStartedAt = 0
  mapEdgeLastPaintAt = 0
}

const startMapEdgeAnimation = () => {
  stopMapEdgeAnimation()
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  mapEdgeAnimationStartedAt = performance.now()

  const tick = (now: number) => {
    if (!chart || mapBoundaryMode.value !== 'street' || mapViewMode.value !== '3d') {
      mapEdgeAnimationFrame = requestAnimationFrame(tick)
      return
    }

    // 直接调节现有亮边材质，避免 setOption 重建几何时关闭电路 detailMap。
    // 约 4–5fps 更新，并在用户缩放/旋转时暂停，降低集显负担。
    if (now >= mapCameraInteractionUntil && now - mapEdgeLastPaintAt > 220) {
      mapEdgeLastPaintAt = now
      const phase = (now - mapEdgeAnimationStartedAt) / 1650
      const pulse = 0.5 + Math.sin(phase * Math.PI * 2) * 0.5
      const linesMaterial = getStreetMap3DBuilder()?._linesMesh?.material
      linesMaterial?.set?.('color', [
        0.64 + pulse * 0.28,
        0.86 + pulse * 0.12,
        0.95 + pulse * 0.05,
        0.78 + pulse * 0.22
      ])
      chart.getZr().refresh()
    }

    mapEdgeAnimationFrame = requestAnimationFrame(tick)
  }

  mapEdgeAnimationFrame = requestAnimationFrame(tick)
}

const renderMap2D = () => {
  if (!chart || !overview.value) return
  const hasSelection = Boolean(activeStreetName.value)
  const chartTheme = getChartTheme()

  const geoRegions = overview.value.streets.map((item) => {
    const selected = item.streetName === activeStreetName.value
    return {
      name: item.streetName,
      itemStyle: {
        areaColor: rgbaHex(getCurrentQuantityColor(item.caseCount), selected ? 0.96 : 0.86),
        borderColor: selected ? 'rgba(255, 255, 255, 0.96)' : 'rgba(198, 238, 255, 0.52)',
        borderWidth: selected ? 1.8 : 0.55,
        shadowBlur: selected ? 18 : 4,
        shadowColor: selected ? 'rgba(130, 228, 255, 0.85)' : 'rgba(70, 190, 235, 0.16)',
        opacity: hasSelection && !selected ? 0.34 : 1
      }
    }
  })

  const labelData = overview.value.streets.map((item) => {
    // 名称放在街道多边形内部：优先使用街道质心（来自 xicheng_streets.geojson）。
    const coordinate = streetCentroids.value[item.streetName] || STREET_COORDINATES[item.streetName]
    const selected = item.streetName === activeStreetName.value
    return {
      name: item.streetName,
      value: coordinate ? [...coordinate, item.caseCount] : [116.366794, 39.915309, item.caseCount],
      symbolSize: 0,
      itemStyle: { color: 'rgba(0, 0, 0, 0)' },
      label: {
        show: true,
        position: 'inside',
        offset: [0, 0],
        align: 'center',
        verticalAlign: 'middle',
        formatter: getShortStreetName(item.streetName),
        // 与 3D 相同的黑底名称框。
        ...getStreetLabelBox(selected),
        shadowBlur: selected ? 10 : 3,
        shadowColor: selected ? 'rgba(120, 220, 255, 0.55)' : 'rgba(0, 0, 0, 0.35)'
      },
      emphasis: {
        label: { backgroundColor: 'rgba(12, 36, 58, 1)' },
        itemStyle: { color: 'rgba(0, 0, 0, 0)' }
      },
      z: 10
    }
  })

  const linesData = districtOuterPolylines.value.map((coords) => ({ coords }))

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      ...getTooltipOption(),
      formatter: (params: any) => {
        const item = overview.value?.streets.find((street) => street.streetName === params.name)
        if (!item) return params.name || ''
        return `<strong>${item.streetName}</strong><br/>案件数量：${item.caseCount} 件<br/><span style="color:${chartTheme.tooltipHint}">点击查看详情</span>`
      }
    },
    geo: {
      id: 'xrm-street-map-2d-geo',
      map: STREET_MAP_NAME,
      roam: true,
      scaleLimit: { min: MAP_MIN_ZOOM, max: MAP_MAX_ZOOM },
      zoom: mapZoom.value,
      layoutCenter: ['50%', '50%'],
      layoutSize: '98%',
      silent: false,
      itemStyle: {
        areaColor: 'rgba(12, 46, 68, 0.45)',
        borderColor: 'rgba(198, 238, 255, 0.52)',
        borderWidth: 0.55
      },
      emphasis: {
        disabled: false,
        label: { show: false },
        itemStyle: { shadowBlur: 16, shadowColor: 'rgba(130, 228, 255, 0.7)' }
      },
      label: { show: false },
      regions: geoRegions
    },
    series: [
      ...(linesData.length
        ? [{
            id: 'xrm-district-outline-lines',
            type: 'lines',
            coordinateSystem: 'geo',
            polyline: true,
            silent: true,
            z: 6,
            data: linesData,
            lineStyle: {
              color: '#BDF3FF',
              width: 3.2,
              opacity: 0.95,
              shadowBlur: 14,
              shadowColor: 'rgba(125, 226, 255, 0.85)',
              cap: 'round' as const
            }
          }]
        : []),
      {
        id: 'xrm-street-map-2d-labels',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: labelData,
        symbol: 'circle',
        z: 10,
        itemStyle: { color: 'rgba(0, 0, 0, 0)' },
        labelLayout: { hideOverlap: compactMapLabels }
      }
    ]
  }, { notMerge: true })
}

const renderMap = async () => {
  await nextTick()
  if (!mapRef.value || !mapRegistered || !overview.value) return
  const nextCompactMapLabels = mapRef.value.clientWidth <= 560
  if (nextCompactMapLabels && !compactMapLabels) legendVisible.value = false
  compactMapLabels = nextCompactMapLabels

  if (!chart) {
    chart = echarts.init(mapRef.value)
    chart.on('click', (params: any) => {
      const name = normalizeStreetName(params?.name ?? params?.data?.name)
      if (EXPECTED_STREET_SET.has(name)) {
        lastStreetClickAt = performance.now()
        selectStreet(name)
      }
    })
    chart.on('map3dcamerachanged' as any, (params: any) => {
      const distance = Number(params?.distance)
      const alpha = Number(params?.alpha)
      const beta = Number(params?.beta)
      const center = params?.center
      if (Number.isFinite(distance) && distance > 0) {
        map3DViewState.distance = distance
        mapZoom.value = clampMapZoom(MAP_DEFAULT_DISTANCE / distance)
      }
      if (Number.isFinite(alpha)) map3DViewState.alpha = alpha
      if (Number.isFinite(beta)) map3DViewState.beta = beta
      if (Array.isArray(center) && center.length >= 3) {
        map3DViewState.center = [Number(center[0]) || 0, Number(center[1]) || 0, Number(center[2]) || 0]
      }
    })
    chart.getZr().on('click', (event: any) => {
      requestAnimationFrame(() => {
        // WebGL 区域点击时 zrender 的 target 可能为空，因此不能把“target 为空”直接当作空白点击。
        // 给 map3D 的 picking 事件留一帧时间，且空白点击只清选中，不重置相机。
        if (performance.now() - lastStreetClickAt < 120) return
        if (!event.target) clearSelection(false)
      })
    })
    const markCameraInteraction = () => {
      mapCameraInteractionUntil = performance.now() + 520
      requestAnimationFrame(syncMap3DViewStateFromChart)
    }
    chart.getZr().on('mousedown', markCameraInteraction as any)
    chart.getZr().on('mousemove', (event: any) => {
      if (event?.event?.buttons) markCameraInteraction()
    })
    chart.getZr().on('mouseup', () => {
      mapCameraInteractionUntil = performance.now() + 220
      requestAnimationFrame(syncMap3DViewStateFromChart)
    })
  }

  const hasSelection = Boolean(activeStreetName.value)
  const quantityExtent = getCurrentCaseCountExtent()
  const maxCaseCount = getMaxCaseCount()
  const visualMapMax = quantityExtent.max > quantityExtent.min ? quantityExtent.max : quantityExtent.min + 1
  const chartTheme = getChartTheme()
  const map3DDistance = Math.max(MAP_MIN_DISTANCE, Math.min(MAP_MAX_DISTANCE, MAP_DEFAULT_DISTANCE / clampMapZoom(mapZoom.value)))
  const streetData = buildStreetMapData()

  if (mapBoundaryMode.value === 'street' && mapViewMode.value === '2d') {
    stopMapEdgeAnimation()
    if (lastRenderedMapMode !== '2d') chart.clear()
    renderMap2D()
    lastRenderedMapMode = '2d'
    return
  }

  if (mapBoundaryMode.value === 'street') {
    // 从 2D 切回 3D 时先清空图表，避免 2D 的 geo/lines/scatter 残留。
    if (lastRenderedMapMode !== '3d') chart.clear()
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
        type: 'continuous',
        min: quantityExtent.min,
        max: visualMapMax,
        inRange: { color: [...QUANTITY_COLORS] }
      },
      series: [
        {
          id: 'xrm-street-map-series',
          type: 'map3D',
          map: STREET_MAP_NAME,
          nameProperty: 'name',
          shading: 'realistic',
          regionHeight: STREET_BASE_HEIGHT,
          groundPlane: { show: false },
          boxHeight: 26,
          realisticMaterial: {
            detailTexture: getCircuitDetailTexture(),
            textureTiling: 2.25,
            roughness: 0.11,
            metalness: 0.24
          },
          postEffect: {
            enable: true,
            bloom: { enable: true, bloomIntensity: 0.98 },
            SSAO: { enable: true, quality: 'medium', radius: 1.5, intensity: 0.34 },
            FXAA: { enable: true },
            colorCorrection: { enable: true, saturation: 1.08, contrast: 1.04, exposure: 0.08 }
          },
          // 滚轮缩放由容器 capture 事件统一接管，禁用 echarts-gl 自带滚轮缩放，
          // 这样地图区域内滚轮绝不会继续冒泡成页面上下滚动，也不会出现双重缩放。
          viewControl: {
            ...getCurrentMap3DViewControl(),
            distance: map3DViewInitialized ? map3DViewState.distance : map3DDistance,
            zoomSensitivity: 0
          },
          light: {
            main: {
              intensity: isLightTheme.value ? 1.52 : 1.62,
              shadow: true,
              shadowQuality: 'medium',
              alpha: 48,
              beta: 24
            },
            ambient: { intensity: isLightTheme.value ? 0.50 : 0.36 }
          },
          selectedMode: 'single',
          left: 0,
          right: 0,
          top: 8,
          bottom: 0,
          data: streetData,
          // 几何级亮边与 data.itemStyle 叠加，兼容不同显卡的 WebGL 抗锯齿路径。
          regions: buildStreetMapRegions(streetData),
          itemStyle: {
            color: QUANTITY_COLORS[0],
            areaColor: QUANTITY_COLORS[0],
            borderColor: 'rgba(184, 241, 255, 0.90)',
            borderWidth: 2.3,
            opacity: 0.48
          },
          emphasis: {
            label: { rich: getFluorescentLabelRich(false) },
            itemStyle: { borderColor: '#FFFFFF', borderWidth: 3.4, opacity: 0.60 }
          },
          select: {
            label: { rich: getFluorescentLabelRich(true) },
            itemStyle: { borderColor: 'rgba(255, 255, 255, 1)', borderWidth: 4.6, opacity: 0.70 }
          },
          label: {
            show: true,
            color: chartTheme.labelText,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 16,
            fontFamily: 'Microsoft YaHei UI, PingFang SC, Noto Sans CJK SC, sans-serif',
            backgroundColor: 'transparent',
            borderWidth: 0,
            padding: 0,
            formatter: (params: any) => getFluorescentLabelFormatter(String(params.name || '')),
            rich: getFluorescentLabelRich(false)
          },
          animationDurationUpdate: 360,
          animationEasingUpdate: 'cubicOut',
          labelLayout: {
            hideOverlap: compactMapLabels
          }
        }
      ]
    }, { notMerge: false, lazyUpdate: true })
    scheduleCircuitTextureRestore()
    map3DViewInitialized = true
    startMapEdgeAnimation()
    lastRenderedMapMode = '3d'
    return
  }

  stopMapEdgeAnimation()
  if (lastRenderedMapMode !== 'district') chart.clear()
  const pointData = overview.value.streets.map((item) => {
    const coordinate = STREET_COORDINATES[item.streetName]
    const selected = item.streetName === activeStreetName.value
    const quantityColor = getCurrentQuantityColor(item.caseCount)
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
        formatter: getFluorescentLabelFormatter(item.streetName),
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
      type: 'continuous',
      min: quantityExtent.min,
      max: visualMapMax,
      inRange: { color: [...QUANTITY_COLORS] },
      dimension: 2,
      seriesIndex: 0
    },
    geo: {
      id: 'xrm-district-geo',
      map: STREET_MAP_NAME,
      roam: true,
      scaleLimit: { min: MAP_MIN_ZOOM, max: MAP_MAX_ZOOM },
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
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 16,
          fontFamily: 'Microsoft YaHei UI, PingFang SC, Noto Sans CJK SC, sans-serif',
          backgroundColor: 'transparent',
          borderWidth: 0,
          padding: 0,
          rich: getFluorescentLabelRich(false)
        },
        labelLayout: {
          hideOverlap: true,
          moveOverlap: 'shiftY'
        },
        emphasis: {
          scale: 1.18,
          label: { rich: getFluorescentLabelRich(true) },
          itemStyle: { borderColor: '#ffffff', borderWidth: 2.5 }
        }
      }
    ]
  }, { notMerge: true })
  lastRenderedMapMode = 'district'
}

const selectStreet = (streetName: string) => {
  activeStreetName.value = streetName
  summaryExplanation.value = ''
}

const selectStreetFromThree = (streetName: string) => selectStreet(streetName)
const handleThreeMapError = (message: string) => {
  mapError.value = true
  mapErrorMessage.value = message || '三维地图初始化失败'
}

const clearSelection = (resetView = false) => {
  activeStreetName.value = ''
  detail.value = null
  detailError.value = false
  // 清除选中默认只改变街道状态，不动相机；只有显式 resetView 才恢复全区视角。
  if (resetView) {
    mapZoom.value = 1
    map3DViewState.distance = MAP_DEFAULT_DISTANCE
    map3DViewState.alpha = 46
    map3DViewState.beta = 0
    map3DViewState.center = [0, 0, 0]
    if (mapBoundaryMode.value === 'street' && mapViewMode.value === '3d') {
      threeMapRef.value?.reset()
    } else if (chart && mapBoundaryMode.value === 'street' && mapViewMode.value === '2d') {
      chart.setOption({ geo: { id: 'xrm-street-map-2d-geo', zoom: 1, center: undefined } })
    }
  }
}

const showSummaryExplanation = (key: StreetMapSummaryKey) => {
  summaryExplanation.value = summaryExplanation.value === key ? '' : key
  if (key === 'total') clearSelection()
}

const applyMap3DDistance = (nextDistance: number) => {
  if (!chart || mapBoundaryMode.value !== 'street') return
  const distance = Math.max(MAP_MIN_DISTANCE, Math.min(MAP_MAX_DISTANCE, nextDistance))
  map3DViewState.distance = distance
  mapZoom.value = clampMapZoom(MAP_DEFAULT_DISTANCE / distance)
  mapCameraInteractionUntil = performance.now() + 260
  chart.setOption({
    series: [{
      id: 'xrm-street-map-series',
      viewControl: getCurrentMap3DViewControl()
    }]
  }, { notMerge: false, lazyUpdate: false })
  scheduleCircuitTextureRestore()
}

const applyMapZoom = (nextZoom: number) => {
  if (!chart) return
  mapZoom.value = clampMapZoom(nextZoom)
  if (mapBoundaryMode.value === 'street' && mapViewMode.value === '2d') {
    chart.setOption({ geo: { id: 'xrm-street-map-2d-geo', zoom: mapZoom.value } })
    requestAnimationFrame(() => chart?.resize())
  } else if (mapBoundaryMode.value === 'street') {
    applyMap3DDistance(MAP_DEFAULT_DISTANCE / mapZoom.value)
  } else {
    chart.setOption({ geo: { id: 'xrm-district-geo', zoom: mapZoom.value } })
    requestAnimationFrame(() => chart?.resize())
  }
}

const handleMapWheel = (event: WheelEvent) => {
  if (!chart) return
  // capture 阶段拦截，防止触控板/滚轮在 WebGL canvas 上偶发穿透为页面滚动。
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation?.()

  if (mapBoundaryMode.value !== 'street' || mapViewMode.value === '2d') {
    const delta = event.deltaY > 0 ? 0.90 : 1.11
    applyMapZoom(mapZoom.value * delta)
    return
  }

  const modeScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? mapDisplayHeight.value : 1
  const deltaPixels = event.deltaY * modeScale
  if (!Number.isFinite(deltaPixels) || deltaPixels === 0) return
  // 指数曲线兼顾鼠标滚轮与触控板：小幅滑动细腻，大幅滑动仍可快速缩放。
  const exponent = Math.max(-0.34, Math.min(0.34, deltaPixels * 0.00175))
  applyMap3DDistance(map3DViewState.distance * Math.exp(exponent))
}

const zoomIn = () => {
  if (mapBoundaryMode.value === 'street' && mapViewMode.value === '3d') threeMapRef.value?.zoomIn()
  else applyMapZoom(mapZoom.value * 1.22)
}
const zoomOut = () => {
  if (mapBoundaryMode.value === 'street' && mapViewMode.value === '3d') threeMapRef.value?.zoomOut()
  else applyMapZoom(mapZoom.value / 1.22)
}
const resetMap = () => {
  activeStreetName.value = ''
  detail.value = null
  detailError.value = false
  mapZoom.value = 1
  map3DViewState.distance = MAP_DEFAULT_DISTANCE
  map3DViewState.alpha = 46
  map3DViewState.beta = 0
  map3DViewState.center = [0, 0, 0]
  if (mapBoundaryMode.value === 'street' && mapViewMode.value === '3d') {
    threeMapRef.value?.reset()
  } else if (chart && mapBoundaryMode.value === 'street' && mapViewMode.value === '2d') {
    chart.setOption({ geo: { id: 'xrm-street-map-2d-geo', zoom: 1, center: undefined } })
  } else if (chart) {
    chart.setOption({ geo: { id: 'xrm-district-geo', zoom: 1, center: undefined } })
  }
}

const setMapViewMode = async (mode: '3d' | '2d') => {
  if (mode === '2d' && mapBoundaryMode.value !== 'street') return
  if (mapViewMode.value === mode) return
  if (mode === '3d' && chart) {
    stopMapEdgeAnimation()
    chart.dispose()
    chart = null
    lastRenderedMapMode = null
  }
  mapViewMode.value = mode
  await nextTick()
  if (mode === '2d') await renderMap()
  else if (activeStreetName.value) threeMapRef.value?.focusStreet(activeStreetName.value)
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
  const nextCompactMapLabels = Boolean(mapRef.value && mapRef.value.clientWidth <= 560)
  const compactModeChanged = nextCompactMapLabels !== compactMapLabels
  if (compactModeChanged && nextCompactMapLabels) legendVisible.value = false
  compactMapLabels = nextCompactMapLabels
  chart?.resize()
  scheduleCircuitTextureRestore()
  subjectChart?.resize()
  behaviorChart?.resize()
  timeTrendChart?.resize()
  syncDetailPanelHeight()
  if (compactModeChanged) void renderMap()
}

watch(filters, async () => {
  await loadOverview()
  await renderMap()
  if (activeStreetName.value) await loadStreetDetail()
}, { deep: true })

watch(activeStreetName, async () => {
  await nextTick()
  if (mapBoundaryMode.value === 'street' && mapViewMode.value === '3d') {
    if (activeStreetName.value) threeMapRef.value?.focusStreet(activeStreetName.value)
  } else {
    await renderMap()
  }
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
  stopMapEdgeAnimation()
  chart?.dispose()
  chart = null
  map3DViewInitialized = false
  disposeDetailCharts()
})
</script>

<style scoped>
.xrm-card {
  --page-bg: #050e20;
  --surface-1: rgba(8, 30, 58, 0.84);
  --surface-2: rgba(9, 38, 70, 0.78);
  --surface-3: rgba(16, 55, 89, 0.56);
  --surface-solid: #0a2747;
  --line: rgba(99, 207, 247, 0.30);
  --line-strong: rgba(116, 226, 255, 0.66);
  --text-1: #edfaff;
  --text-2: #b8e1ef;
  --text-3: #8bbbd0;
  --title: #66e2ff;
  --input-bg: rgba(4, 23, 46, 0.90);
  --shadow: 0 18px 44px rgba(0, 5, 18, 0.28);
  overflow: hidden;
  border: 1px solid var(--line) !important;
  border-radius: 14px;
  background:
    radial-gradient(circle at 12% 0%, rgba(57, 185, 243, 0.12), transparent 31%),
    linear-gradient(180deg, rgba(7, 26, 51, 0.99), rgba(3, 16, 34, 0.99)) !important;
  color: var(--text-1);
  font-family: "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", "Noto Sans SC", sans-serif;
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
  position: relative;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-1);
  box-shadow:
    inset 0 1px 0 rgba(224, 250, 255, 0.07),
    0 12px 28px rgba(0, 8, 24, 0.14),
    0 0 20px rgba(67, 200, 247, 0.035);
}

.xrm-section-shell::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 22px;
  right: 22px;
  z-index: 1;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(151, 239, 255, 0.84), transparent);
}

.xrm-filter-section {
  padding: 16px;
  margin-bottom: 18px;
}

.xrm-method-section {
  padding: 16px;
  margin-bottom: 18px;
}

.xrm-method-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.xrm-method-card {
  min-height: 104px;
  padding: 15px;
  border: 1px solid rgba(111, 188, 232, 0.24);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(28, 78, 118, 0.36), rgba(7, 30, 58, 0.68));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.xrm-method-card strong {
  display: block;
  margin-bottom: 8px;
  color: var(--text-1);
  font-size: 17px;
  line-height: 1.35;
}

.xrm-method-card span {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
}

.xrm-political-filter-bar {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 320px));
  gap: 14px;
  align-items: end;
  margin-top: 16px;
  padding: 13px;
  border: 1px solid rgba(111, 188, 232, 0.18);
  border-radius: 8px;
  background: rgba(5, 24, 48, 0.28);
}

.xrm-section-heading,
.xrm-panel-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.xrm-section-heading > div:first-child,
.xrm-panel-heading > div:first-child {
  position: relative;
  padding: 7px 18px 7px 13px;
  border-left: 3px solid var(--title);
  border-radius: 3px 10px 10px 3px;
  background: linear-gradient(90deg, rgba(74, 203, 247, 0.14), rgba(41, 116, 174, 0.045) 66%, transparent);
  box-shadow: inset 0 1px 0 rgba(217, 248, 255, 0.04);
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

.xrm-map-mode-switch {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 3px;
  padding: 3px;
  border: 1px solid rgba(113, 216, 240, 0.30);
  border-radius: 10px;
  background: rgba(6, 25, 48, 0.78);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.30);
}

.xrm-map-mode-switch button {
  min-width: 54px;
  padding: 5px 13px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #9ccbde;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.xrm-map-mode-switch button:hover:not(:disabled):not(.active) {
  background: rgba(43, 130, 172, 0.35);
  color: #e5f9ff;
}

.xrm-map-mode-switch button.active {
  background: linear-gradient(180deg, rgba(41, 141, 190, 0.98), rgba(13, 76, 118, 0.98));
  color: #ffffff;
  box-shadow:
    0 0 12px rgba(74, 190, 240, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.xrm-map-mode-switch button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.xrm-card.xrm-theme-light .xrm-map-mode-switch {
  border-color: rgba(38, 120, 160, 0.40);
  background: rgba(240, 249, 255, 0.95);
  box-shadow: inset 0 1px 2px rgba(30, 90, 125, 0.14);
}

.xrm-card.xrm-theme-light .xrm-map-mode-switch button {
  color: #36728f;
}

.xrm-card.xrm-theme-light .xrm-map-mode-switch button:hover:not(:disabled):not(.active) {
  background: rgba(106, 192, 230, 0.25);
  color: #0b5f8c;
}

.xrm-card.xrm-theme-light .xrm-map-mode-switch button.active {
  background: linear-gradient(180deg, #2f9bd0, #16638f);
  color: #ffffff;
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
  border: 1px solid rgba(104, 219, 255, 0.54);
  border-radius: 12px;
  background:
    radial-gradient(circle at 50% 42%, rgba(30, 154, 224, 0.16), transparent 34%),
    radial-gradient(circle at 50% 92%, rgba(18, 107, 179, 0.12), transparent 44%),
    linear-gradient(145deg, rgba(7, 32, 62, 0.98), rgba(2, 13, 29, 0.995) 72%),
    #030d1d;
  box-shadow:
    inset 0 0 82px rgba(63, 190, 245, 0.12),
    inset 0 0 0 1px rgba(200, 247, 255, 0.055),
    inset 0 1px 0 rgba(221, 250, 255, 0.13),
    0 18px 40px rgba(0, 10, 31, 0.30),
    0 0 24px rgba(65, 205, 255, 0.07);
}

.xrm-map-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.38;
  background-image:
    radial-gradient(circle, rgba(143, 232, 255, 0.32) 0 1.2px, transparent 1.8px),
    linear-gradient(rgba(91, 207, 247, 0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91, 207, 247, 0.10) 1px, transparent 1px),
    linear-gradient(90deg, transparent 0 20%, rgba(111, 224, 255, 0.13) 20% 58%, transparent 58%),
    linear-gradient(transparent 0 42%, rgba(111, 224, 255, 0.11) 42% 70%, transparent 70%);
  background-position: 8px 8px, 0 0, 0 0, 0 16px, 16px 0;
  background-size: 48px 48px, 24px 24px, 24px 24px, 96px 96px, 96px 96px;
  mask-image: radial-gradient(circle at 50% 55%, #000 18%, transparent 72%);
}

.xrm-map-stage::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -40%;
  z-index: 0;
  width: 84%;
  aspect-ratio: 1;
  pointer-events: none;
  border: 1px solid rgba(95, 212, 255, 0.13);
  border-radius: 50%;
  box-shadow:
    0 0 0 26px rgba(74, 178, 232, 0.035),
    0 0 0 58px rgba(74, 178, 232, 0.028),
    0 0 60px rgba(50, 170, 235, 0.12);
  transform: translateX(-50%) scaleY(0.42);
}

.xrm-map-box {
  position: relative;
  z-index: 1;
  width: 100%;
  touch-action: none;
  overscroll-behavior: contain;
  -webkit-user-select: none;
  user-select: none;
  filter:
    drop-shadow(0 18px 18px rgba(0, 14, 36, 0.26))
    drop-shadow(0 0 8px rgba(91, 220, 255, 0.12));
  animation: xrm-map-edge-aura 4.2s ease-in-out infinite;
}

@keyframes xrm-map-edge-aura {
  0%, 100% {
    filter:
      drop-shadow(0 18px 18px rgba(0, 14, 36, 0.26))
      drop-shadow(0 0 6px rgba(91, 220, 255, 0.10));
  }
  50% {
    filter:
      drop-shadow(0 18px 20px rgba(0, 14, 36, 0.30))
      drop-shadow(0 0 13px rgba(120, 232, 255, 0.24));
  }
}

.xrm-map-breath-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 42%, rgba(2, 10, 22, 0.26), rgba(4, 16, 32, 0.48) 62%, rgba(2, 10, 22, 0.70));
  animation: xrm-map-breath 5.2s ease-in-out infinite;
}

@keyframes xrm-map-breath {
  0%, 100% {
    opacity: 0.14;
  }
  50% {
    opacity: 0.52;
  }
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
  border: 1px solid rgba(125, 229, 255, 0.48);
  border-radius: 9px;
  background:
    linear-gradient(145deg, rgba(9, 39, 69, 0.93), rgba(3, 17, 34, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(225, 251, 255, 0.08),
    0 10px 26px rgba(0, 8, 26, 0.34),
    0 0 18px rgba(65, 207, 255, 0.08);
  backdrop-filter: blur(8px);
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
  font-size: 16px;
  font-weight: 800;
  white-space: nowrap;
  flex: 0 0 auto;
}

.xrm-legend-gradient {
  height: 8px;
  margin: 9px 0 5px;
  border-radius: 999px;
  background: linear-gradient(90deg, #1689C4 0%, #16A8B7 25%, #D4B64D 50%, #EC8438 75%, #E94B5B 100%);
}

.xrm-legend-scale {
  display: flex;
  justify-content: space-between;
  color: #94c5d9;
  font-size: 12px;
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
  font-size: 13px;
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
  font-size: 13px;
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
  width: 9px;
}

.xrm-detail-panel::-webkit-scrollbar-thumb {
  border: 2px solid rgba(5, 18, 38, 0.86);
  border-radius: 99px;
  background: linear-gradient(180deg, rgba(120, 238, 255, 0.9), rgba(27, 160, 232, 0.84) 58%, rgba(40, 92, 214, 0.8));
  box-shadow: inset 0 1px 0 rgba(235, 253, 255, 0.52), 0 0 14px rgba(49, 209, 255, 0.32);
}

.xrm-detail-panel::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(174, 250, 255, 0.98), rgba(38, 191, 255, 0.92) 58%, rgba(60, 119, 239, 0.9));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 0 18px rgba(54, 220, 255, 0.5);
}

.xrm-detail-panel::-webkit-scrollbar-track {
  border-radius: 99px;
  background: linear-gradient(180deg, rgba(2, 12, 28, 0.78), rgba(7, 30, 58, 0.62));
  box-shadow: inset 0 0 0 1px rgba(80, 176, 230, 0.12);
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
  border-radius: 8px;
  background:
    linear-gradient(rgba(68, 149, 202, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(68, 149, 202, 0.045) 1px, transparent 1px),
    radial-gradient(ellipse at 50% 82%, rgba(65, 164, 218, 0.09), transparent 54%);
  background-size: 28px 28px, 28px 28px, auto;
  box-shadow: inset 0 -22px 42px rgba(0, 8, 24, 0.18);
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
  max-width: 420px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  justify-content: center;
}

.xrm-empty-steps span {
  display: flex;
  min-height: 104px;
  aspect-ratio: 1.28 / 1;
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

:global(body.theme-light) .xrm-method-section {
  box-shadow: 0 5px 18px rgba(39, 100, 139, 0.06);
}

:global(body.theme-light) .xrm-method-card {
  border-color: rgba(70, 136, 192, 0.24);
  background: linear-gradient(135deg, #f5fbff, #e7f3fd);
}

:global(body.theme-light) .xrm-political-filter-bar {
  border-color: rgba(70, 136, 192, 0.22);
  background: #f5faff;
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
    linear-gradient(145deg, rgba(21, 61, 96, 0.96), rgba(7, 24, 45, 0.98) 72%),
    #07182e !important;
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
.xrm-card.xrm-theme-light .xrm-method-section,
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
    linear-gradient(145deg, #edf7ff 0%, #d8ebfa 68%, #c8e0f3 100%) !important;
  box-shadow: inset 0 0 34px rgba(54, 126, 173, 0.10), 0 16px 34px rgba(54, 126, 173, 0.12);
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

/* 关键标题遵循 24px 起的层级，辅助文字保持 14–16px，兼顾大屏可读性与地图密度。 */
.xrm-page-header .eyebrow {
  font-size: 15px;
}

.xrm-page-header .xrm-title-group h2 {
  font-size: clamp(28px, 2vw, 32px);
  font-weight: 800;
  letter-spacing: 0.04em;
  text-shadow: 0 0 20px rgba(86, 221, 255, 0.24);
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
.xrm-summary-section .xrm-section-heading h3 {
  font-size: 24px;
  font-weight: 800;
}

.xrm-map-panel .xrm-panel-heading h3 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.03em;
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
  font-size: 36px;
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
  font-size: 27px;
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

@media (prefers-reduced-motion: reduce) {
  .xrm-map-box,
  .xrm-map-breath-overlay,
  .xrm-status-dot {
    animation: none !important;
  }
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
  .xrm-method-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .xrm-layout {
    grid-template-columns: minmax(0, 1.1fr) minmax(460px, 1fr);
  }

  .xrm-map-source {
    max-width: 200px;
  }
}

@media (max-width: 1080px) {
  .xrm-political-filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

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
  .xrm-method-grid,
  .xrm-political-filter-bar,
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
