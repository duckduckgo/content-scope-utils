import { testHttp as test } from './utils.mjs'
import { DebugToolsPage } from './page-objects/debug-tools'
import invariant from 'tiny-invariant'

test.describe('remote url', () => {
  test('refreshes current resource', async ({ page, http }, workerInfo) => {
    const dt = await DebugToolsPage.create(page, http.addresses[0], workerInfo)
    await dt.enabled()
    const id = 'privacy-configuration'
    await dt.openRemoteResourceEditor({ id })
    await dt.features.canToggle()
    await dt.remote.refreshesRemote({ id })
  })
  test('sets a new remote url', async ({ page, http }, workerInfo) => {
    const ex = http.addresses.find((x) => !x.startsWith('http://local'))
    invariant(typeof ex === 'string', 'must find external')
    const override = ex + 'fixtures/single-config.json'
    const dt = await DebugToolsPage.create(page, http.addresses[0], workerInfo)
    await dt.enabled()
    const id = 'privacy-configuration'
    await dt.openRemoteResourceEditor({ id })
    await dt.features.canToggle()
    await dt.remote.overrideRemoteUrl(override)
    await dt.remote.savedNewRemoteUrl({ id, url: override })
  })
  test('shows resource urls', async ({ page, http }, workerInfo) => {
    const ex = http.addresses.find((x) => !x.startsWith('http://local'))
    invariant(typeof ex === 'string', 'must find external')
    const dt = await DebugToolsPage.create(page, http.addresses[0], workerInfo)
    await dt.enabled()
    const id = 'privacy-configuration'
    await dt.openRemoteResourceEditor({ id })
    await dt.remote.opensExtraInfo()
    await dt.remote.opensResourceInNewTab({ id })
  })
  test.skip('shows an error on updating a resource', async ({ page, baseURL }, workerInfo) => {
    const dt = await DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
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
