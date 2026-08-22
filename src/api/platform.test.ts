import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('./http', () => ({
  http: {
    get: mocks.get,
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

import { fetchPriorityAlerts } from './platform'

describe('fetchPriorityAlerts', () => {
  beforeEach(() => mocks.get.mockReset())

  it('derives real alerts from imported case and risk endpoints', async () => {
    mocks.get
      .mockResolvedValueOnce({ data: [{
        id: 42,
        caseName: '某企业欠薪案',
        procedureType: '办理中',
        caseNumber: 'XC-42',
        keywords: '劳动,企业',
        judgmentReason: '多名劳动者集中反映企业欠薪问题。',
        category: '民事检察'
      }] })
      .mockResolvedValueOnce({ data: [{
        id: 42,
        community: '金融街街道',
        event: '某企业欠薪案',
        level: '高',
        riskScore: 88,
        time: '2026-08-22',
        status: '人工复核',
        detail: '多名劳动者集中反映企业欠薪问题。',
        suggestion: '建议人工核实'
      }] })

    const alerts = await fetchPriorityAlerts()

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      id: 42,
      caseNumber: 'XC-42',
      street: '金融街街道',
      riskLevel: '高',
      alertStatus: '待人工复核',
      confidence: 88
    })
    expect(alerts[0]?.tags).toContain('检护民生')
  })
})
