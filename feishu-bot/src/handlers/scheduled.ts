/**
 * 定时推送任务
 * 注意：需要配置 FEISHU_CHAT_ID 环境变量指定推送的群聊 ID
 */
import { client } from '../index'
import { getOverview, getHighRiskCommunities, getEffectRates } from '../services/platform'
import { dashboardCard, riskDetailCard, effectCard, actionResultCard } from '../cards/templates'

const chatId = process.env.FEISHU_CHAT_ID || ''

async function sendCard(card: any) {
  if (!chatId) {
    console.log('[定时推送] 未配置 FEISHU_CHAT_ID，跳过推送')
    return
  }
  await client.im.message.create({
    data: {
      receive_id: chatId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    },
    params: { receive_id_type: 'chat_id' },
  })
}

/** 日报推送（每天 9:00） */
export async function dailyReport() {
  const o = getOverview()
  const highRisk = getHighRiskCommunities()

  const card = actionResultCard(
    '📅 每日风险日报',
    [
      `**${new Date().toLocaleDateString('zh-CN')}**`,
      '',
      `📊 本年度案件总数：**${o.totalCasesThisYear}**件`,
      `🔔 预警推送累计：**${o.riskAlertPushCount}**次`,
      `📋 待处理检察建议：**${o.procuratorateSuggestions}**条`,
      '',
      highRisk.length > 0
        ? `⚠️ 高风险街道：${highRisk.map(c => `**${c.community}**(${c.riskScore}分)`).join('、')}`
        : '✅ 当前无高风险街道',
    ].join('\n'),
    'blue'
  )

  await sendCard(card)
  console.log('[日报] 已推送')
}

/** 风险预警（风险分≥80的街道） */
export async function riskAlert() {
  const highRisk = getHighRiskCommunities()
  if (highRisk.length === 0) return

  const card = actionResultCard(
    '🚨 高风险预警',
    highRisk.map(c =>
      `**${c.community}** — 风险评分 **${c.riskScore}**\n高发类型：${c.topCaseType}，年度案件 ${c.annualCases} 件`
    ).join('\n\n'),
    'red'
  )

  await sendCard(card)
  console.log(`[风险预警] 推送 ${highRisk.length} 个高风险街道`)
}

/** 启动定时任务 */
export function startScheduledTasks() {
  if (!chatId) {
    console.log('[定时任务] 未配置 FEISHU_CHAT_ID，定时推送已禁用。配置后重启即可启用。')
    return
  }

  // 每天 9:00 日报
  scheduleDaily(9, 0, dailyReport)
  // 每 4 小时检查一次高风险预警
  setInterval(riskAlert, 4 * 60 * 60 * 1000)

  console.log('[定时任务] 已启动：日报(9:00)、风险预警(每4h)')
}

function scheduleDaily(hour: number, minute: number, fn: () => void) {
  const now = new Date()
  const target = new Date(now)
  target.setHours(hour, minute, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)

  const delay = target.getTime() - now.getTime()
  setTimeout(() => {
    fn()
    setInterval(fn, 24 * 60 * 60 * 1000)
  }, delay)
}
