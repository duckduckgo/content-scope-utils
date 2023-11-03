import { DebugToolsPage } from './page-objects/debug-tools'
import { testHttp as test } from './utils.mjs'
import { remoteResourceSchema } from '../schema/__generated__/schema.parsers.mjs'

test.describe('domains', () => {
  test('shows an empty state when no domain is selected', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
    await dt.features.canToggle()
    await dt.features.showsEmptyDomainsState()
  })
  test('handles adding a first domain exception', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)

    await dt.enabled()
    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
    await dt.features.canToggle()

    await test.step('toggles a feature for example.com', async () => {
      // click add, because empty initially
      await dt.features.addFirstDomain()

      // This will enter `example.com` and then click the 'autofill' button
      await dt.features.toggles({ feature: 'autofill', forDomain: 'example.com' })

      // save it
      const { responseJson } = await dt.editor.savesWithReqAndRes()

      // parse for types
      const json = remoteResourceSchema.parse(responseJson)

      // ensure we saved the correctly modified JSON
      dt.features.featureWasDisabledForDomain(json.current.contents, 'autofill', 'example.com')
    })
  })
  test('edits the current domain in domain exceptions', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
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
  test('adds a new domain when one already exists', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
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
  test.skip('handles tabs arriving after page load', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
    await dt.features.canToggle()
    await dt.switchesTo('toggles')
    await dt.receivesNewTabs({
      tabs: [{ url: 'https://example.com/123/abc' }, { url: 'https://duckduckgo.com/?q=123' }],
    })
    await dt.features.selectTab('duckduckgo.com')
    await dt.features.activeDomainIsStoredInUrl('duckduckgo.com')
    await dt.features.hasActiveDomain('duckduckgo.com')
  })
  test.skip('handles choosing an open tab from many', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.withTabsResponse({
      tabs: [{ url: 'https://example.com/123/abc' }, { url: 'https://duckduckgo.com/?q=123' }],
    })
    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
    await dt.features.canToggle()
    await dt.switchesTo('toggles')
    await dt.features.selectTab('duckduckgo.com')
    await dt.features.activeDomainIsStoredInUrl('duckduckgo.com')
    await dt.features.hasActiveDomain('duckduckgo.com')
  })
  test.skip('handles choosing an open tab from single', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.withTabsResponse({ tabs: [{ url: 'https://example.com/123/abc' }] })
    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
    await dt.features.canToggle()
    await dt.switchesTo('toggles')
    await dt.features.chooseTheOnlyOpenTab()
    await dt.features.activeDomainIsStoredInUrl('example.com')
    await dt.features.hasActiveDomain('example.com')
  })
})
