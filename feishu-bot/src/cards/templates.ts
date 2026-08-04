/**
 * 飞书消息卡片模板 — 全功能版（含详情跳转）
 */
import type { DashboardOverview, CommunityRisk, CaseItem, Suggestion, LegalPlan, NewsItem } from '../services/platform'

const BASE_URL = process.env.PLATFORM_URL || 'http://localhost:5173'

function levelEmoji(level: string) {
  return level === '高' ? '🔴' : level === '中' ? '🟡' : '🟢'
}

function detailButton(label: string, path: string) {
  return {
    tag: 'button',
    text: { tag: 'plain_text', content: label },
    type: 'default',
    size: 'small',
    multi_url: { url: `${BASE_URL}${path}` },
  }
}

// ===== 态势盘 =====
export function dashboardCard(data: DashboardOverview) {
  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: '📊 风险预警态势盘' }, template: 'blue' },
    elements: [
      {
        tag: 'column_set', flex_mode: 'bisect',
        columns: [
          col('本年案件总数', String(data.totalCasesThisYear)),
          col('高发类型', data.highIncidenceTypes),
        ],
      },
      {
        tag: 'column_set', flex_mode: 'trisect',
        columns: [
          col('预警推送', String(data.riskAlertPushCount)),
          col('检察建议', String(data.procuratorateSuggestions)),
          col('普法投递', String(data.legalPushCount)),
        ],
      },
      { tag: 'hr' },
      {
        tag: 'note',
        elements: [{ tag: 'plain_text', content: '💡 发送「研判」获取 AI 风险分析报告' }],
      },
      {
        tag: 'action',
        actions: [detailButton('📈 查看态势盘', '/dashboard')],
      },
    ],
  }
}

// ===== 街道风险详情 =====
export function riskDetailCard(items: CommunityRisk[]) {
  if (items.length === 0) {
    return {
      config: { wide_screen_mode: true },
      header: { title: { tag: 'plain_text', content: '🔍 街道风险查询' }, template: 'orange' },
      elements: [{ tag: 'markdown', content: '未找到匹配的街道。\n\n可查询：西长安街、金融街、什刹海、大栅栏、天桥、新街口、展览路、德胜、月坛、广安门内' }],
    }
  }

  const elements: any[] = []
  for (const c of items) {
    elements.push({
      tag: 'column_set', flex_mode: 'none',
      columns: [
        { tag: 'column', width: 'weighted', weight: 2, elements: [{ tag: 'markdown', content: `**${c.community}**` }] },
        { tag: 'column', width: 'weighted', weight: 1, elements: [{ tag: 'markdown', content: `${levelEmoji(c.level)} **${c.riskScore}** 分` }] },
        { tag: 'column', width: 'weighted', weight: 1, elements: [{ tag: 'markdown', content: `📋 ${c.annualCases} 件` }] },
        { tag: 'column', width: 'weighted', weight: 1, elements: [{ tag: 'markdown', content: `🏷 ${c.topCaseType}` }] },
      ],
    })
    if (items.length > 1) elements.push({ tag: 'hr' })
  }
  if (elements[elements.length - 1]?.tag === 'hr') elements.pop()

  elements.push({ tag: 'hr' })
  elements.push({ tag: 'action', actions: [detailButton('🗺 在地图中查看', '/')] })

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: `🔍 街道风险详情 — ${items.length} 条结果` }, template: 'orange' },
    elements,
  }
}

// ===== 案件列表 =====
export function caseListCard(items: CaseItem[], keyword?: string) {
  if (items.length === 0) {
    return {
      config: { wide_screen_mode: true },
      header: { title: { tag: 'plain_text', content: '📂 案件查询' }, template: 'turquoise' },
      elements: [{ tag: 'markdown', content: `未找到包含「${keyword || ''}」的案件记录。` }],
    }
  }

  const elements: any[] = [
    { tag: 'markdown', content: keyword ? `查询关键词：**${keyword}**，共 ${items.length} 条` : `共 ${items.length} 条案件` },
  ]

  for (const c of items.slice(0, 5)) {
    elements.push({
      tag: 'column_set', flex_mode: 'none',
      columns: [
        { tag: 'column', width: 'weighted', weight: 3, elements: [{ tag: 'markdown', content: `**${c.cause}**\n${c.caseNo}` }] },
        { tag: 'column', width: 'weighted', weight: 1, elements: [{ tag: 'markdown', content: `${levelEmoji(c.riskScore >= 80 ? '高' : c.riskScore >= 60 ? '中' : '低')} ${c.riskScore}分` }] },
        { tag: 'column', width: 'weighted', weight: 1, elements: [{ tag: 'markdown', content: c.status }] },
      ],
    })
    elements.push({ tag: 'hr' })
  }
  if (elements[elements.length - 1]?.tag === 'hr') elements.pop()

  elements.push({ tag: 'hr' })
  elements.push({ tag: 'action', actions: [detailButton('📂 查看全部案件', '/risk-analysis')] })

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: `📂 案件查询 — ${items.length} 条` }, template: 'turquoise' },
    elements,
  }
}

// ===== 检察建议 =====
export function suggestionCard(items: Suggestion[]) {
  const statusEmoji: Record<string, string> = { '待处理': '🔴', '处理中': '🟡', '已反馈': '🟢', '已驳回': '⚫' }
  const elements: any[] = []

  for (const s of items) {
    elements.push({
      tag: 'column_set', flex_mode: 'none',
      columns: [
        { tag: 'column', width: 'weighted', weight: 3, elements: [{ tag: 'markdown', content: `**${s.title}**\n📌 ${s.type} · ${s.target}` }] },
        { tag: 'column', width: 'weighted', weight: 1, elements: [{ tag: 'markdown', content: `${statusEmoji[s.status] || '⚪'} ${s.status}` }] },
      ],
    })
    elements.push({
      tag: 'action',
      actions: [detailButton(`📄 查看详情 #${s.id}`, `/procuratorate-suggestion`)],
    })
    elements.push({ tag: 'hr' })
  }
  if (elements[elements.length - 1]?.tag === 'hr') elements.pop()

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: `⚖️ 检察建议 — ${items.length} 条` }, template: 'violet' },
    elements,
  }
}

// ===== 普法方案 =====
export function planCard(items: LegalPlan[]) {
  const elements: any[] = []

  for (const p of items) {
    elements.push({
      tag: 'column_set', flex_mode: 'none',
      columns: [
        { tag: 'column', width: 'weighted', weight: 2, elements: [{ tag: 'markdown', content: `**${p.title}**\n👥 ${p.group}` }] },
        { tag: 'column', width: 'weighted', weight: 1, elements: [{ tag: 'markdown', content: `覆盖 **${p.coverage.toLocaleString()}**人` }] },
        { tag: 'column', width: 'weighted', weight: 1, elements: [{ tag: 'markdown', content: `⭐ ${p.approvalRate}%好评` }] },
      ],
    })
    elements.push({
      tag: 'action',
      actions: [detailButton(`📖 查看方案 #${p.id}`, `/legal-plan/${p.id}`)],
    })
    elements.push({ tag: 'hr' })
  }
  if (elements[elements.length - 1]?.tag === 'hr') elements.pop()

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: `📚 普法方案推荐 — ${items.length} 个` }, template: 'green' },
    elements,
  }
}

// ===== 新闻动态 =====
export function newsCard(items: NewsItem[]) {
  const elements: any[] = []

  for (const n of items) {
    elements.push({ tag: 'markdown', content: `**${n.title}**\n${n.summary} · 📅 ${n.publishTime}` })
    elements.push({
      tag: 'action',
      actions: [detailButton('📰 阅读全文', `/official-article/${n.id}`)],
    })
    elements.push({ tag: 'hr' })
  }
  if (elements[elements.length - 1]?.tag === 'hr') elements.pop()

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: `📰 官方动态 — 最新 ${items.length} 条` }, template: 'indigo' },
    elements,
  }
}

// ===== 效果评估 =====
export function effectCard(rates: { responseRate: number; closeRate: number; reachRate: number }) {
  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: '📋 效果评估指标' }, template: 'green' },
    elements: [
      {
        tag: 'column_set', flex_mode: 'trisect',
        columns: [
          col('预警响应率', `${rates.responseRate}%`),
          col('纠纷化解率', `${rates.closeRate}%`),
          col('普法触达率', `${rates.reachRate}%`),
        ],
      },
      { tag: 'hr' },
      { tag: 'action', actions: [detailButton('📊 查看完整报告', '/effect-stats')] },
    ],
  }
}

// ===== AI 研判结果 =====
export function aiReportCard(content: string) {
  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: '🤖 AI 风险研判报告' }, template: 'blue' },
    elements: [
      { tag: 'markdown', content },
      { tag: 'hr' },
      { tag: 'action', actions: [detailButton('📈 进入态势盘', '/dashboard')] },
    ],
  }
}

// ===== 操作反馈 =====
export function actionResultCard(title: string, content: string, template = 'green') {
  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: title }, template },
    elements: [{ tag: 'markdown', content }],
  }
}

// ===== 帮助 =====
export function helpCard() {
  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: '🤖 西城法治平台机器人' }, template: 'indigo' },
    elements: [{
      tag: 'markdown',
      content: [
        '**📊 查询指令：**',
        '• **态势** — 风险预警态势盘',
        '• **研判** — AI 风险研判分析报告',
        '• **风险** / **风险 什刹海** — 街道风险排名/查询',
        '• **案件** / **案件 诈骗** — 案件列表/搜索',
        '• **检察建议** — 检察建议列表',
        '• **普法方案** — 推荐方案',
        '• **效果** — 效果评估指标',
        '• **新闻** — 最新官方动态',
        '',
        '**📝 写入指令：**',
        '• **上报 [街道] [事件描述]** — 上报风险事件',
        '• **反馈 [建议ID] [内容]** — 检察建议反馈',
        '• **评价 [方案ID] [满意/一般/不满意]** — 评价方案',
        '',
        '所有卡片均可点击按钮跳转到平台查看完整内容。',
      ].join('\n'),
    }],
  }
}

// ===== 工具 =====
function col(label: string, value: string) {
  return {
    tag: 'column', width: 'weighted', weight: 1,
    elements: [{ tag: 'markdown', content: `**${value}**\n${label}` }],
  }
}
