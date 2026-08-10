import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return appSource.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

test('home account control scrolls with the document below the sticky header', () => {
  assert.match(appSource, /id="home-account-layer"/)
  assert.match(appSource, /id="header-account-layer"/)
  assert.match(appSource, /<Teleport\s+defer\s+:to="accountTeleportTarget">/)

  const homeAccountRule = cssBlock('.account-slot--hero')
  assert.match(homeAccountRule, /position:\s*absolute/)
  assert.doesNotMatch(homeAccountRule, /position:\s*fixed/)

  const homeLayerRule = cssBlock('.home-account-layer')
  const headerRule = cssBlock('.header')
  const homeLayerZIndex = Number(homeLayerRule.match(/z-index:\s*(\d+)/)?.[1])
  const headerZIndex = Number(headerRule.match(/z-index:\s*(\d+)/)?.[1])

  assert.ok(homeLayerZIndex < headerZIndex)
})
