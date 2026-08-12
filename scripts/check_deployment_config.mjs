import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const androidWorkflow = read('.github/workflows/android.yml')
assert.match(androidWorkflow, /working-directory:\s*android/)
assert.match(androidWorkflow, /path:\s*android\/app\/build\/outputs\/apk\/debug\/\*\.apk/)

const gradleWrapper = read('android/gradlew')
assert.doesNotMatch(gradleWrapper, /\r/)
assert.ok(statSync(new URL('../android/gradlew', import.meta.url)).mode & 0o111)

const pagesWorkflow = read('.github/workflows/pages.yml')
assert.match(pagesWorkflow, /npm ci/)
assert.match(pagesWorkflow, /npm run build/)
assert.match(pagesWorkflow, /path:\s*\.\/dist/)
assert.match(pagesWorkflow, /actions\/deploy-pages@v4/)

const router = read('src/router/index.ts')
assert.doesNotMatch(router, /createWebHistory/)
assert.match(router, /history:\s*createWebHashHistory\(\)/)

console.log('Deployment configuration checks passed')
