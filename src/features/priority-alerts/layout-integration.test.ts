import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const view = (name: string) => readFileSync(new URL(`../../views/${name}`, import.meta.url), 'utf8')

describe('priority alerts integrate with the existing page structure', () => {
  it('puts priority analysis in the fourth risk-analysis tab instead of above the overview', () => {
    const source = view('risk-analysis.vue')
    expect(source).toContain('<a-tab-pane key="priority-tags" title="重点标签联动分析">')
    expect(source.indexOf('key="priority-tags"')).toBeGreaterThan(source.indexOf('key="case-features"'))
    expect(source).not.toContain('title="重点标签联动分析" />')
  })

  it('keeps political priority tags inside the existing topic card', () => {
    const source = view('political-security.vue')
    const cardStart = source.indexOf('class="chart-card topic-card"')
    const cardEnd = source.indexOf('</a-card>', cardStart)
    const tags = source.indexOf('<PriorityTopicTabs', cardStart)
    expect(tags).toBeGreaterThan(cardStart)
    expect(tags).toBeLessThan(cardEnd)
    expect(source).not.toContain('<PriorityTagStrip')
  })

  it('uses interactive topics and three enlarged review pods in political security', () => {
    const source = view('political-security.vue')
    expect(source).not.toContain('priorityTopics')
    expect(source).not.toContain('涉外风险')
    expect(source).toContain('class="review-pod review-pod-cyan"')
    expect(source).toContain('class="review-pod review-pod-amber"')
    expect(source).toContain('class="review-pod review-pod-portrait"')
    expect(source).toContain('class="review-ring"')
    expect(source).toContain('class="portrait-facts"')
  })

  it('uses a compact topic switcher within the alert-entry card', () => {
    const source = view('alert-push.vue')
    expect(source).toContain('title="预警条目"')
    expect(source).toContain('<PriorityTopicTabs')
    expect(source).not.toContain('<PriorityTagStrip')
  })
})
