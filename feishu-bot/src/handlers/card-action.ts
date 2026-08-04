/**
 * 飞书卡片按钮回调处理
 */
import { client } from '../index'
import { getOverview, getCommunityRisk, getHighRiskCommunities } from '../services/platform'
import { chatWithLLM } from '../services/llm'
import { aiReportCard, actionResultCard } from '../cards/templates'

export async function handleCardAction(data: any): Promise<any> {
  const action = data?.action?.value?.action
  const openId = data?.open_id

  if (action === 'ai_assess') {
    // 生成 AI 研判
    const o = getOverview()
    const highRisk = getHighRiskCommunities()
    const communities = getCommunityRisk()
      .map(c => `${c.community}(风险分${c.riskScore},${c.level}风险,年度案件${c.annualCases}件,高发类型:${c.topCaseType})`)
      .join('；')

    const prompt = `以下是西城区社区法治风险态势盘数据：
- 本年度案件总数：${o.totalCasesThisYear}件
- 高发案件类型：${o.highIncidenceTypes}
- 风险预警推送次数：${o.riskAlertPushCount}次
- 检察建议发送次数：${o.procuratorateSuggestions}条
- 普法方案投递次数：${o.legalPushCount}次
- 高风险街道（≥80分）：${highRisk.map(c => `${c.community}(${c.riskScore}分)`).join('、') || '无'}
- 各街道详情：${communities}

请生成简洁的风险研判摘要。`

    const report = await chatWithLLM(prompt)

    // 返回更新后的卡片
    return aiReportCard(report)
  }

  return undefined
}
