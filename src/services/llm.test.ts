import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  fetchSystemSettings: vi.fn()
}))

vi.mock('../api/http', () => ({ http: { post: mocks.post } }))
vi.mock('../api/platform', () => ({ fetchSystemSettings: mocks.fetchSystemSettings }))

import { chatWithLLM } from './llm'

describe('chatWithLLM', () => {
  beforeEach(() => {
    mocks.post.mockReset()
    mocks.fetchSystemSettings.mockReset()
  })

  it('uses the configured frontend timeout for AI generation', async () => {
    mocks.fetchSystemSettings.mockResolvedValue({ modelFrontendTimeoutSeconds: 230 })
    mocks.post.mockResolvedValue({ data: { content: '结果', notice: '待审核' } })

    await expect(chatWithLLM('分析材料')).resolves.toBe('结果\n\n待审核')
    expect(mocks.post).toHaveBeenCalledWith(
      '/ai/generate',
      { prompt: '分析材料', module: 'general', caseIds: [] },
      { timeout: 230_000 }
    )
  })
})
