import { createActorContext } from '@xstate/react'
import { remoteResourcesMachine } from './remote-resources.machine'
import { useContext } from 'react'
import { GlobalContext } from '../DebugToolsMessages.mjs'
import { AppMachineContext } from '../app/components/app'
import { RemoteResources } from './components/remote-resources'
import invariant from 'tiny-invariant'
import { PatchesProvider } from './patches-machine.react'
import { TrackerFeedProvider } from './components/tracker-feed.machine.react'

export const RemoteResourcesContext = createActorContext(remoteResourcesMachine, { devTools: true })

export function RemoteResourcesPage() {
  // give access to the global messages instance
  const { messages } = useContext(GlobalContext)
  invariant(messages, 'must have instantiated messages here')

  const parent = AppMachineContext.useActorRef()

  return (
    <RemoteResourcesContext.Provider machine={() => remoteResourcesMachine.withContext({ messages, parent, tabs: [] })}>
      <PatchesProvider>
        <TrackerFeedProvider>
          <RemoteResourcesLoader />
        </TrackerFeedProvider>
      </PatchesProvider>
    </RemoteResourcesContext.Provider>
  )
}

function RemoteResourcesLoader() {
  const [state] = RemoteResourcesContext.useActor()
  if (state.matches(['invalid resource'])) {
    return (
      <>
        <div className="main px-4">
          <p className="row">Error loading that resource</p>
          <pre className="row">
            <code>{JSON.stringify(state.context.error)}</code>
          </pre>
        </div>
      </>
    )
  }
  if (state.matches(['showing editor'])) {
    return <RemoteResources />
  }
  return null
}

export default RemoteResourcesPage
