import { expect, test } from '@playwright/test'
import { BundledExamplePage } from './test-helpers/BundledExamplePage.js'

test.describe('windows messaging', () => {
  test('runs when config provided', async ({ page }) => {
    const bundled = new BundledExamplePage(page)
    await bundled.withMocks('windows', {
      getData: { id: '01' },
      foo: null,
    })
    await bundled.withInjectedConfig({
      platform: 'windows',
      featureName: 'DuckPlayer',
    })
    const outputs = await bundled.getPageOutputs()
    expect(outputs).toMatchObject([['getData', { id: '01' }]])
  })
})
