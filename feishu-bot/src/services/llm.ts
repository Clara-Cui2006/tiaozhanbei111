/**
 * 智谱 GLM 大模型调用
 */

const baseUrl = process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
const apiKey = process.env.LLM_API_KEY || ''
const model = process.env.LLM_MODEL || 'glm-4.5'

export async function chatWithLLM(prompt: string): Promise<string> {
  if (!apiKey) return '未配置 LLM API Key，无法生成 AI 研判。'

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是西城区社区法治风险智能研判平台的 AI 分析助手。请基于提供的数据，生成简洁的风险研判摘要，包含风险态势、重点关注、治理建议三个部分，每部分 2-3 句话。'
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    console.error('LLM 调用失败:', err)
    return `AI 研判调用失败（${resp.status}），请稍后重试。`
  }

  const data = await resp.json() as any
  return data.choices?.[0]?.message?.content || '未获取到 AI 分析结果。'
}
