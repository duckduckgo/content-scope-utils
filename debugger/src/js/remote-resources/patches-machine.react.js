import { RemoteResourcesContext } from './remote-resources.page'
import { createActorContext } from '@xstate/react'
import { patchesMachine } from './patches-machine'

export const PatchesContext = createActorContext(patchesMachine, { devTools: true })

export function PatchesProvider(props) {
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
