import { createActorContext, useActor } from '@xstate/react'
import { remoteResourcesMachine } from './remote-resources.machine'
import { useContext } from 'react'
import { GlobalContext } from '../DebugToolsMessages.mjs'
import { AppMachineContext } from '../app/components/app'
import { RemoteResources } from './components/remote-resources'
import invariant from 'tiny-invariant'

export const RemoteResourcesContext = createActorContext(remoteResourcesMachine, { devTools: true })

export function RemoteResourcesPage() {
  // give access to the global messages instance
  const { messages } = useContext(GlobalContext)
  invariant(messages, 'must have instantiated messages here')

  const parent = AppMachineContext.useActorRef()

  return (
    <RemoteResourcesContext.Provider machine={() => remoteResourcesMachine.withContext({ messages, parent, tabs: [] })}>
      <RemoteResourcesLoader />
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

export function usePatches() {
  const patchesRef = RemoteResourcesContext.useSelector((state) => {
    invariant('patches' in state.children, 'expected `patches` to be a child of RemoteResourcesContext')
    return state.children.patches
  })

  return useActor(/** @type {import('./patches-machine').PatchesMachineRef} */ (patchesRef))
}

export default RemoteResourcesPage
