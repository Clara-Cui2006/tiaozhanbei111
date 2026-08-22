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

  it('keeps priority topics and security lenses in the redesigned political panel', () => {
    const source = view('political-security.vue')
    expect(source).toContain('panel-key="topics"')
    expect(source).toContain('<PriorityTopicTabs v-if="!activeSecurityLens"')
    expect(source).toContain("activeSecurityLens === 'traditional'")
    expect(source).toContain("activeSecurityLens === 'nontraditional'")
    expect(source).not.toContain('<PriorityTagStrip')
  })

  it('uses the four-dimension cockpit and API-backed case modal', () => {
    const source = view('political-security.vue')
    expect(source).toContain('panel-key="dimensions"')
    expect(source).toContain('class="dimension-grid"')
    expect(source).toContain('class="risk-case-modal-body"')
    expect(source).toContain('fetchPriorityAlerts()')
    expect(source).not.toContain('../jsdata/')
  })

  it('uses a compact topic switcher within the alert-entry card', () => {
    const source = view('alert-push.vue')
    expect(source).toContain('title="预警条目"')
    expect(source).toContain('<PriorityTopicTabs')
    expect(source).not.toContain('<PriorityTagStrip')
  })
})
