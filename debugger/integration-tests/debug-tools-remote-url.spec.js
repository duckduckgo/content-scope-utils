import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools'

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
