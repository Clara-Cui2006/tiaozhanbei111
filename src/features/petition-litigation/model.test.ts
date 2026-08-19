import { describe, expect, it } from 'vitest'
import type { PetitionLitigationItem } from '../../types/platform'
import { countPetitionValues, filterPetitionItems } from './model'

const items: PetitionLitigationItem[] = [
  { id: '1', occurredAt: '2026-08-01', street: '金融街街道', source: '12345热线', riskLevel: '红色', eventCategory: '欠资欠薪', summary: '多人重复反映', supervisionCategories: ['民事检察', '政治安全'] },
  { id: '2', occurredAt: '2026-07-01', street: '月坛街道', source: '综治中心', riskLevel: '蓝色', eventCategory: '物业纠纷', summary: '物业维修协商' }
]

describe('涉访涉诉统一筛选与计数', () => {
  it('统一应用风险等级、时间和关键词筛选', () => {
    expect(filterPetitionItems(items, { street: '', source: '', riskLevel: '红色', eventCategory: '', keyword: '重复', dateRange: ['2026-08-01', '2026-08-31'] })).toEqual([items[0]])
  })

  it('所有结构数量都由当前数据派生', () => {
    expect(countPetitionValues(items, 'source')).toEqual([
      { name: '12345热线', value: 1, percent: 50 },
      { name: '综治中心', value: 1, percent: 50 }
    ])
  })
})
