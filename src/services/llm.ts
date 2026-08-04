import { SYSTEM_PROMPTS, type PromptModule } from './prompts'

/**
 * 调用大模型 API（智谱 GLM-4.5）
 *
 * @param prompt - 用户提示词（由 prompts.ts 的模板函数生成）
 * @param module - 模块标识，自动注入对应的 system prompt；不传则用通用角色
 */
export async function chatWithLLM(prompt: string, module?: PromptModule) {
  const baseUrl = import.meta.env.VITE_LLM_BASE_URL
  const apiKey = import.meta.env.VITE_LLM_API_KEY
  const model = import.meta.env.VITE_LLM_MODEL

  const systemContent = module
    ? SYSTEM_PROMPTS[module]
    : `你是一位资深的社区法治专家和检察官助理，服务于西城区社区法治风险预警平台。`

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    })

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('LLM API 调用失败:', error)
    return '（方案生成失败，请检查网络或 API 配置）'
  }
}
