import axios from 'axios'
import type { PromptModule } from './prompts'
import { http } from '../api/http'
import { fetchSystemSettings } from '../api/platform'

const DEFAULT_FRONTEND_TIMEOUT_SECONDS = 220

/**
 * 调用大模型 API（智谱 GLM-4.5）
 *
 * @param prompt - 用户提示词（由 prompts.ts 的模板函数生成）
 * @param module - 模块标识，自动注入对应的 system prompt；不传则用通用角色
 */
export async function chatWithLLM(prompt: string, module?: PromptModule) {
  let frontendTimeoutSeconds = DEFAULT_FRONTEND_TIMEOUT_SECONDS
  try {
    const settings = await fetchSystemSettings()
    frontendTimeoutSeconds = settings.modelFrontendTimeoutSeconds || DEFAULT_FRONTEND_TIMEOUT_SECONDS
  } catch {
    // 设置读取失败时仍使用安全默认值尝试调用模型。
  }

  try {
    const { data } = await http.post<{ content: string; notice: string }>('/ai/generate', {
      prompt,
      module: module || 'general',
      caseIds: []
    }, {
      timeout: frontendTimeoutSeconds * 1000
    })
    return `${data.content}\n\n${data.notice}`
  } catch (error: unknown) {
    console.error('院内模型调用失败:', error)
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return `（AI生成超过前端等待上限${frontendTimeoutSeconds}秒，请适当调高前端等待时间后重试。）`
      }
      const detail = error.response?.data?.detail
      if (typeof detail === 'string' && detail.trim()) return `（${detail}）`
    }
    return '（院内统一模型尚未配置或当前不可用，请联系系统管理员。系统不会返回模拟生成结果。）'
  }
}
