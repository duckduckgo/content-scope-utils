import { expect, test } from '@playwright/test'
import { BundledExamplePage } from './test-helpers/BundledExamplePage.js'

test.describe('webkit modern messaging', () => {
  test('runs when config provided', async ({ page }) => {
    const bundled = new BundledExamplePage(page)
    await bundled.withMocks({
      getData: { id: '01' },
      foo: null,
    })
    await bundled.withInjectedConfig({
      secret: 'hello-world',
      webkitMessageHandlerNames: [], // <-- not a requirement in modern mode
      hasModernWebkitAPI: true,
    })
    const outputs = await bundled.getPageOutputs()
    expect(outputs).toMatchObject([['getData', { id: '01' }]])
  })
})
test.describe('webkit encrypted messaging', () => {
  test('runs when config provided', async ({ page }) => {
    const bundled = new BundledExamplePage(page)
    await bundled.withMocks({
      getData: { id: '01' },
      foo: null,
    })
    await bundled.withInjectedConfig({
      secret: 'hello-world',
      webkitMessageHandlerNames: ['foo', 'getData'],
      hasModernWebkitAPI: false,
    })
    const outputs = await bundled.getPageOutputs()
    expect(outputs).toMatchObject([['getData', { id: '01' }]])
  })
  test('fails when message handlers are absent (ie: missed/not added by native side)', async ({ page }) => {
    const bundled = new BundledExamplePage(page)
    await bundled.withMocks({
      // empty mocks to simulate the message handlers not being available
    })
    await bundled.withInjectedConfig({
      secret: 'hello-world',
      webkitMessageHandlerNames: [], // <-- empty since we're mocking the fact that handler are absent
      hasModernWebkitAPI: false,
    })
    const outputs = await bundled.getPageOutputs()
    expect(outputs).toMatchObject([
      ['error', "Missing webkit handler: 'foo'"],
      ['error', "Missing webkit handler: 'getData'"],
    ])
  })
  test('fails when message handler names are absent', async ({ page }) => {
    const bundled = new BundledExamplePage(page)
    await bundled.withMocks({
      getData: { id: '01' },
      foo: null,
    })
    await bundled.withInjectedConfig({
      secret: 'hello-world',
      webkitMessageHandlerNames: ['foo'], // <-- A missing handler name, so it won't be captured
      hasModernWebkitAPI: false,
    })
    const outputs = await bundled.getPageOutputs()
    expect(outputs).toMatchObject([['error', 'cannot continue, method getData not captured on macos < 11']])
  })
})
