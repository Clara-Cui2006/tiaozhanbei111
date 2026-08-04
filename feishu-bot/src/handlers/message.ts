/**
 * 消息处理器 — 仅响应 @机器人 的消息（群聊）或私聊消息
 */
import { client } from '../index'
import {
  getOverview, getCommunityRisk, getCases, getSuggestions,
  getPlans, getNews, getEffectRates, getHighRiskCommunities,
  reportEvent, feedbackSuggestion, ratePlan,
} from '../services/platform'
import {
  dashboardCard, riskDetailCard, caseListCard, suggestionCard,
  planCard, newsCard, effectCard, aiReportCard, actionResultCard, helpCard,
} from '../cards/templates'
import { chatWithLLM } from '../services/llm'

export async function handleMessage(data: any) {
  const msg = data.message
  if (!msg || msg.message_type !== 'text') return

  const chatType = msg.chat_type // 'p2p' = 私聊, 'group' = 群聊
  const chatId = msg.chat_id
  if (!chatId) return

  const content = JSON.parse(msg.content || '{}')
  let text = (content.text || '').trim()

  // === 群聊必须 @机器人 才响应 ===
  if (chatType === 'group') {
    const mentions = msg.mentions
    if (!mentions || mentions.length === 0) return // 没有 @任何人，忽略

    // 检查是否 @了机器人（key 为 bot 的 open_id 或包含 @_user_）
    const botMentioned = mentions.some((m: any) => m.id?.user_id || m.key)
    if (!botMentioned) return

    // 去除 @标签，提取纯文本指令
    text = text.replace(/@_user_\d+/g, '').trim()
  }

  if (!text) return

  let card: any
  let match: RegExpMatchArray | null

  // ===== 查询类 =====
  if (/^(态势|总览|dashboard)$/i.test(text)) {
    card = dashboardCard(getOverview())

  } else if (/^(研判|AI研判|ai研判)$/i.test(text)) {
    const o = getOverview()
    const highRisk = getHighRiskCommunities()
    const all = getCommunityRisk().map(c =>
      `${c.community}(${c.riskScore}分,${c.level}风险,${c.annualCases}件,${c.topCaseType})`
    ).join('；')

    const prompt = `西城区社区法治风险态势数据：
- 本年案件总数：${o.totalCasesThisYear}件，高发类型：${o.highIncidenceTypes}
- 预警推送：${o.riskAlertPushCount}次，检察建议：${o.procuratorateSuggestions}条，普法投递：${o.legalPushCount}次
- 高风险街道（≥80分）：${highRisk.map(c => `${c.community}(${c.riskScore}分)`).join('、') || '无'}
- 各街道：${all}
请生成简洁的风险研判摘要，包含风险态势、重点关注、治理建议三个部分。`

    await client.im.message.create({
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text: '⏳ AI 正在综合分析社区风险态势，请稍候...' }),
      },
      params: { receive_id_type: 'chat_id' },
    })

    const report = await chatWithLLM(prompt)
    card = aiReportCard(report)

  } else if ((match = text.match(/^风险\s+(.+)/))) {
    card = riskDetailCard(getCommunityRisk(match[1].trim()))

  } else if (/^风险$/.test(text)) {
    card = riskDetailCard(getCommunityRisk())

  } else if ((match = text.match(/^案件\s+(.+)/))) {
    const kw = match[1].trim()
    card = caseListCard(getCases(kw), kw)

  } else if (/^案件$/.test(text)) {
    card = caseListCard(getCases())

  } else if (/^检察建议/.test(text)) {
    const filter = text.replace(/^检察建议\s*/, '').trim()
    card = suggestionCard(getSuggestions(filter || undefined))

  } else if (/^(普法方案|普法)$/.test(text)) {
    card = planCard(getPlans())

  } else if (/^(新闻|动态|官方动态)$/.test(text)) {
    card = newsCard(getNews())

  } else if (/^(效果|评估|指标)$/.test(text)) {
    card = effectCard(getEffectRates())

  // ===== 写入类 =====
  } else if ((match = text.match(/^上报\s+(\S+)\s+(.+)/))) {
    const community = match[1]
    const desc = match[2]
    const count = reportEvent(community, desc)
    card = actionResultCard('✅ 风险事件已上报', `**街道：** ${community}\n**事件：** ${desc}\n**编号：** #${count}\n\n已记录，将纳入下一轮风险评估。`)

  } else if ((match = text.match(/^反馈\s+(\d+)\s+(.+)/))) {
    const id = parseInt(match[1])
    const feedbackContent = match[2]
    const ok = feedbackSuggestion(id, feedbackContent)
    card = ok
      ? actionResultCard('✅ 反馈已提交', `检察建议 **#${id}** 状态已更新为「已反馈」\n\n反馈内容：${feedbackContent}`)
      : actionResultCard('❌ 反馈失败', `未找到 ID 为 ${id} 的检察建议。`, 'red')

  } else if ((match = text.match(/^评价\s+(\d+)\s+(满意|一般|不满意)/))) {
    const id = parseInt(match[1])
    const rating = match[2]
    const ok = ratePlan(id, rating)
    card = ok
      ? actionResultCard('✅ 评价已记录', `普法方案 **#${id}** 评价：${rating}\n\n感谢您的反馈！`)
      : actionResultCard('❌ 评价失败', `未找到 ID 为 ${id} 的普法方案。`, 'red')

  // ===== 帮助 =====
  } else if (/^(帮助|help|你好|hi|菜单)$/i.test(text)) {
    card = helpCard()

  } else {
    // 群聊中 @了机器人但未识别指令 → 返回帮助
    card = helpCard()
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
