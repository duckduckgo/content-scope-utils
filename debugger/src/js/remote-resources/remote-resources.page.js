import { createActorContext } from '@xstate/react'
import { remoteResourcesMachine } from './remote-resources.machine'
import { useContext } from 'react'
import { GlobalContext } from '../DebugToolsMessages.mjs'
import { AppMachineContext } from '../app/components/app'
import { RemoteResources } from './components/remote-resources'
import invariant from 'tiny-invariant'
import { patchesMachine } from './patches-machine'

export const RemoteResourcesContext = createActorContext(remoteResourcesMachine, { devTools: true })
export const PatchesContext = createActorContext(patchesMachine, { devTools: true })

export function RemoteResourcesPage() {
  // give access to the global messages instance
  const { messages } = useContext(GlobalContext)
  invariant(messages, 'must have instantiated messages here')

  const parent = AppMachineContext.useActorRef()

  return (
    <RemoteResourcesContext.Provider machine={() => remoteResourcesMachine.withContext({ messages, parent, tabs: [] })}>
      <PatchesProvider>
        <RemoteResourcesLoader />
      </PatchesProvider>
    </RemoteResourcesContext.Provider>
  )
}

function RemoteResourcesLoader() {
  const [state] = RemoteResourcesContext.useActor()
  if (state.matches(['invalid resource'])) {
    return <div className="main row">Error loading that resource</div>
  }
  if (state.matches(['showing editor'])) {
    return <RemoteResources />
  }
  return null
}

function PatchesProvider(props) {
  const parent = RemoteResourcesContext.useActorRef()
  return (
    <PatchesContext.Provider
      options={{
        // @ts-ignore
        parent,
      }}
    >
      {props.children}
    </PatchesContext.Provider>
  )
}

export function usePatches() {
  const actor = PatchesContext.useActor()
  return actor
}

export default RemoteResourcesPage
