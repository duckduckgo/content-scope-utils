import { RemoteResourcesContext } from '../remote-resources.page'
import { DomainForm } from './domain-form'

/**
 * @param {object} props
 */
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CurrentDomainManagement(props) {
  // xstate stuff
  const [state, send] = RemoteResourcesContext.useActor()
  const current = state.context.currentDomain || ''

  /** @type {(domain: string) => void} */
  const setCurrentDomain = (domain) => send({ type: 'set current domain', payload: domain })
  const clearCurrentDomain = () => send({ type: 'clear current domain' })

  // derived state
  const tabs = state.context.tabs.map((x) => x.hostname)
  const uniqueTabs = Array.from(new Set(tabs)).sort()

  return (
    <div data-testid="domain-exceptions">
      <div className="card">
        <DomainForm
          current={current}
          domains={uniqueTabs}
          setCurrentDomain={setCurrentDomain}
          clearCurrentDomain={clearCurrentDomain}
        />
      </div>
    </div>
  )
}
