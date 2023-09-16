import { test } from '@playwright/test'
import { DebugToolsPage, DEFAULT_BASE_VALUE } from './page-objects/debug-tools.js'

test.describe('debug tools', () => {
  test.describe('navigation', () => {
    test('loads the application, defaults to remote resource editor', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.openRemoteResourceEditor()
      await dt.hasLoadedWithFeature()
    })
  })

  test.describe('remote url', () => {
    test('refreshes current resource', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.openRemoteResourceEditor()
      await dt.hasLoadedWithFeature()
      await dt.refreshesCurrentResource()
      await dt.refreshedRemote()
    })
    test('sets a new remote url', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.openRemoteResourceEditor()
      await dt.hasLoadedWithFeature()
      await dt.overrideRemoteUrl()
      await dt.submitRemoteUrlForm()
      await dt.savedNewRemoteUrl()
    })
    test('shows an error on updating a resource', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.openRemoteResourceEditor()
      await dt.hasLoadedWithFeature()

      const error = 'TEST oops! TEST'

      await test.step('submitting the form', async () => {
        await dt.overrideRemoteUrl()
        await dt.willReceiveError({ message: error, method: 'updateResource' })
        await dt.submitRemoteUrlForm()
        await dt.showsErrorText(error)
      })

      await test.step('dismisses the error', async () => {
        await dt.dismissesError()
        await dt.errorWasDismissed()
      })
    })
  })

  test.describe('editor', () => {
    test('updates a resource', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.withTestResources()
      await dt.openRemoteResourceEditor()
      await dt.switchesTo('inline')
      await dt.setsEditorValueTo()
      await dt.saves('test-resource')
    })
    test('shows editor error and allows it to be reverted (simple)', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.withTestResources()
      await dt.withSimpleEditor()
      await dt.openRemoteResourceEditor()
      await dt.switchesTo('inline')
      await dt.setsEditorValueTo('shane')
      await dt.revertsErrorFromPopup()
      await dt.waitForEditorToHaveValue(JSON.stringify(JSON.parse(DEFAULT_BASE_VALUE), null, 4))
    })
    test('reverts editor content (simple)', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.withTestResources()
      await dt.withSimpleEditor()
      await dt.openRemoteResourceEditor()
      await dt.switchesTo('inline')
      await dt.setsEditorValueTo('[]') // valid json
      await dt.revertEditorContent()
      await dt.waitForEditorToHaveValue(JSON.stringify(JSON.parse(DEFAULT_BASE_VALUE), null, 4))
    })
    test('handles when input cannot be used with toggles (because of edits)', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.openRemoteResourceEditor()
      await dt.hasLoadedWithFeature()
      await dt.switchesTo('inline')
      await dt.setsEditorValueTo('[]') // <- completely invalid type for this resource
      await dt.switchesTo('toggles')
      await dt.showsErrorText('Cannot use toggles because the format was invalidated (probably because of edits)')
    })
    test('handles when a global toggle is clicked', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.openRemoteResourceEditor()
      await dt.hasLoadedWithFeature()

      await test.step('toggles a feature globally', async () => {
        await dt.togglesGlobally('autofill')
      })

      await test.step('switches to diff view + saves', async () => {
        await dt.switchesTo('diff')
        await dt.submitsEditorSave()
        const saved = await dt.savedWithValue()
        dt.featureWasDisabledGlobally(saved.source.debugTools.content, 'autofill')
      })
    })
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
    test('switches editor kind', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.openRemoteResourceEditor()
      await dt.hasLoadedWithFeature()
      await dt.switchesTo('inline')
      await dt.setsEditorValueTo()

      await test.step('switches to diff view + makes an edit', async () => {
        await dt.switchesTo('diff')
        await dt.setsEditorValueTo('[]')
      })

      await test.step('switches back to inline view, edits should remain', async () => {
        await dt.switchesTo('inline')
        await dt.stillHasEditedValue('[]')
      })
    })
  })
})
