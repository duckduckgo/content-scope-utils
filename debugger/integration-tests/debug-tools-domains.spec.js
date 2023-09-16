import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools'

test.describe('domains', () => {
  test('shows an empty state when no domain is selected', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.hasLoadedWithFeature()
    await dt.showsEmptyDomainsState()
  })
  test('handles adding a first domain exception', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.hasLoadedWithFeature()

    await test.step('toggles a feature for example.com', async () => {
      // click add, because empty initially
      await dt.addFirstDomain()

      // This will enter `example.com` and then click the 'autofill' button
      await dt.togglesDomainException('autofill', 'example.com')

      // save it
      await dt.submitsEditorSave()

      // ensure we saved the correctly modified JSON
      const saved = await dt.savedWithValue()
      dt.featureWasDisabledForDomain(saved.source.debugTools.content, 'autofill', 'example.com')
    })
  })
  test('edits the current domain in domain exceptions', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openDomainExceptions({
      currentDomain: 'example.com',
    })

    // control, to ensure we're starting in the correct state
    await dt.exceptionsShownFor('example.com')

    // change it with the 'edit' button
    await dt.editCurrentDomain({ from: 'example.com', to: 'example.ca' })

    // now assert it's changed in URL + page
    await dt.exceptionsShownFor('example.ca')
    await dt.currentDomainIsStoredInUrl('example.ca')
  })
  test('adds a new domain when one already exists', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()

    await dt.openDomainExceptions({
      currentDomain: 'example.com',
    })

    // control, to ensure we're starting in the correct state
    await dt.exceptionsShownFor('example.com')

    // adding new domain, by clicking 'new'
    await dt.addNewDomain('example.ca')

    // now assert it's changed in URL + page
    await dt.exceptionsShownFor('example.ca')
    await dt.currentDomainIsStoredInUrl('example.ca')
  })
  test('handles tabs arriving after page load', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.hasLoadedWithFeature()
    await dt.switchesTo('toggles')
    await dt.receivesNewTabs({
      tabs: [{ url: 'https://example.com/123/abc' }, { url: 'https://duckduckgo.com/?q=123' }],
    })
    await dt.selectTab('duckduckgo.com')
    await dt.currentDomainIsStoredInUrl('duckduckgo.com')
    await dt.exceptionsShownFor('duckduckgo.com')
  })
  test('handles choosing an open tab from many', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.withTabsResponse({
      tabs: [{ url: 'https://example.com/123/abc' }, { url: 'https://duckduckgo.com/?q=123' }],
    })
    await dt.openRemoteResourceEditor()
    await dt.hasLoadedWithFeature()
    await dt.switchesTo('toggles')
    await dt.selectTab('duckduckgo.com')
    await dt.currentDomainIsStoredInUrl('duckduckgo.com')
    await dt.exceptionsShownFor('duckduckgo.com')
  })
  test('handles choosing an open tab from single', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.withTabsResponse({ tabs: [{ url: 'https://example.com/123/abc' }] })
    await dt.openRemoteResourceEditor()
    await dt.hasLoadedWithFeature()
    await dt.switchesTo('toggles')
    await dt.chooseTheOnlyOpenTab()
    await dt.currentDomainIsStoredInUrl('example.com')
    await dt.exceptionsShownFor('example.com')
  })
})
