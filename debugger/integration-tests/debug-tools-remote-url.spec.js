import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools'
import { Resources } from './page-objects/resources'

test.describe('remote url', () => {
  test('refreshes current resource', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    let resource = dt.resources.remoteResources.privacyConfig()
    let updated = JSON.parse(JSON.stringify(resource))

    let fetchedAt = '2023-07-05T12:35:56Z'
    updated.current.source.remote.fetchedAt = fetchedAt

    dt.mocks.defaultResponses({
      getRemoteResource: resource,
      updateResource: updated,
    })
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()
    await dt.remote.refreshesCurrentResource()
    await dt.remote.refreshedRemote('35:56')
  })
  test('sets a new remote url', async ({ page, baseURL }, workerInfo) => {
    const override = 'https://example.com/override.json'
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    let resource = dt.resources.remoteResources.privacyConfig()
    dt.mocks.defaultResponses({
      getRemoteResource: resource,
      updateResource: Resources.updatedUrl(resource, override),
    })
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()
    await dt.remote.overrideRemoteUrl(override)
    await dt.remote.submitRemoteUrlForm()
    await dt.remote.savedNewRemoteUrl(override)
    await page.pause()
  })
  test('shows an error on updating a resource', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()

    const error = 'TEST oops! TEST'

    await test.step('submitting the form', async () => {
      await dt.remote.overrideRemoteUrl()
      await dt.willReceiveError({ message: error, method: 'updateResource' })
      await dt.remote.submitRemoteUrlForm()
      await dt.showsErrorText(error)
    })

    await test.step('dismisses the error', async () => {
      await dt.dismissesError()
      await dt.errorWasDismissed()
    })
  })
})
