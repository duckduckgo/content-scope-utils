import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools'

test.describe('domains', () => {
  test('shows an empty state when no domain is selected', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()
    await dt.features.showsEmptyDomainsState()
  })
  test('handles adding a first domain exception', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()

    await test.step('toggles a feature for example.com', async () => {
      // click add, because empty initially
      await dt.features.addFirstDomain()

      // This will enter `example.com` and then click the 'autofill' button
      await dt.features.toggles({ feature: 'autofill', forDomain: 'example.com' })

      // save it
      await dt.editor.clicksSave()

      // ensure we saved the correctly modified JSON
      const saved = await dt.savedWithValue()
      dt.features.featureWasDisabledForDomain(saved.source.debugTools.content, 'autofill', 'example.com')
    })
  })
  test('edits the current domain in domain exceptions', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()

    await dt.openWithSearchParams({
      currentDomain: 'example.com',
    })

    // control, to ensure we're starting in the correct state
    await dt.features.hasActiveDomain('example.com')

    // change it with the 'edit' button
    await dt.features.editCurrentDomain({ from: 'example.com', to: 'example.ca' })

    // now assert it's changed in URL + page
    await dt.features.hasActiveDomain('example.ca')
    await dt.features.activeDomainIsStoredInUrl('example.ca')
  })
  test('adds a new domain when one already exists', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()

    await dt.openWithSearchParams({
      currentDomain: 'example.com',
    })

    // control, to ensure we're starting in the correct state
    await dt.features.hasActiveDomain('example.com')

    // adding new domain, by clicking 'new'
    await dt.features.addNewDomain('example.ca')

    // now assert it's changed in URL + page
    await dt.features.hasActiveDomain('example.ca')
    await dt.features.activeDomainIsStoredInUrl('example.ca')
  })
  test('handles tabs arriving after page load', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()
    await dt.switchesTo('toggles')
    await dt.receivesNewTabs({
      tabs: [{ url: 'https://example.com/123/abc' }, { url: 'https://duckduckgo.com/?q=123' }],
    })
    await dt.features.selectTab('duckduckgo.com')
    await dt.features.activeDomainIsStoredInUrl('duckduckgo.com')
    await dt.features.hasActiveDomain('duckduckgo.com')
  })
  test('handles choosing an open tab from many', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.withTabsResponse({
      tabs: [{ url: 'https://example.com/123/abc' }, { url: 'https://duckduckgo.com/?q=123' }],
    })
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()
    await dt.switchesTo('toggles')
    await dt.features.selectTab('duckduckgo.com')
    await dt.features.activeDomainIsStoredInUrl('duckduckgo.com')
    await dt.features.hasActiveDomain('duckduckgo.com')
  })
  test('handles choosing an open tab from single', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.withTabsResponse({ tabs: [{ url: 'https://example.com/123/abc' }] })
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()
    await dt.switchesTo('toggles')
    await dt.features.chooseTheOnlyOpenTab()
    await dt.features.activeDomainIsStoredInUrl('example.com')
    await dt.features.hasActiveDomain('example.com')
  })
})
