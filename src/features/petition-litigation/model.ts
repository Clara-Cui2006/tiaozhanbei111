import type { PetitionLitigationItem, PetitionRiskLevel } from '../../types/platform'

export interface PetitionFilters {
  street: string
  source: string
  riskLevel: PetitionRiskLevel | ''
  eventCategory: string
  keyword: string
  dateRange: string[]
}

export function filterPetitionItems(items: PetitionLitigationItem[], filters: PetitionFilters) {
  const keyword = filters.keyword.trim().toLowerCase()
  return items.filter((item) => {
    const occurredDate = (item.occurredAt || '').slice(0, 10)
    return (!filters.street || item.street === filters.street)
      && (!filters.source || item.source === filters.source)
      && (!filters.riskLevel || item.riskLevel === filters.riskLevel)
      && (!filters.eventCategory || item.eventCategory === filters.eventCategory)
      && (!filters.dateRange[0] || occurredDate >= filters.dateRange[0])
      && (!filters.dateRange[1] || occurredDate <= filters.dateRange[1])
      && (!keyword || [item.conflictNo, item.eventName, item.summary, ...(item.aiTags || [])].join(' ').toLowerCase().includes(keyword))
  })
}

export function countPetitionValues(items: PetitionLitigationItem[], key: 'riskLevel' | 'source' | 'eventCategory') {
  const counts = new Map<string, number>()
  items.forEach((item) => {
    const name = item[key]
    if (name) counts.set(name, (counts.get(name) || 0) + 1)
  })
  return [...counts].map(([name, value]) => ({
    name,
    value,
    percent: items.length ? Math.round(value / items.length * 100) : 0
  })).sort((a, b) => b.value - a.value)
}
