import type { PromptModule } from './prompts'
import { http } from '../api/http'

/**
 * 调用大模型 API（智谱 GLM-4.5）
 *
 * @param prompt - 用户提示词（由 prompts.ts 的模板函数生成）
 * @param module - 模块标识，自动注入对应的 system prompt；不传则用通用角色
 */
export async function chatWithLLM(prompt: string, module?: PromptModule) {
  try {
    const { data } = await http.post<{ content: string; notice: string }>('/ai/generate', {
      prompt,
      module: module || 'general',
      caseIds: []
    })
    return `${data.content}\n\n${data.notice}`
  } catch (error) {
    console.error('院内模型调用失败:', error)
    return '（院内统一模型尚未配置或当前不可用，请联系系统管理员。系统不会返回模拟生成结果。）'
  }
}
