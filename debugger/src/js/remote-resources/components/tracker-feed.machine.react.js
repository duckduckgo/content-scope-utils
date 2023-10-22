import { createActorContext } from '@xstate/react'
import { useContext, useEffect } from 'react'
import invariant from 'tiny-invariant'
import { RemoteResourcesContext } from '../remote-resources.page'
import { trackerFeedMachine } from './tracker-feed.machine'
import { GlobalContext } from '../../global-config.react'

export const TrackerFeedContext = createActorContext(trackerFeedMachine, { devTools: true })

/**
 * @param {object} props
 * @param {import("react").ReactNode} props.children
 */
export function TrackerFeedProvider(props) {
  const { messages } = useContext(GlobalContext)
  invariant(messages)

  return (
    <TrackerFeedContext.Provider
      machine={() =>
        trackerFeedMachine.withContext({
          messages,
          domain: null,
          requests: [],
          manualEntries: [],
        })
      }
    >
      {props.children}
      <Inner />
    </TrackerFeedContext.Provider>
  )
}

function Inner() {
  const ref = TrackerFeedContext.useActorRef()
  const domain = RemoteResourcesContext.useSelector((state) => {
    return state.context.currentDomain
  })
  useEffect(() => {
    ref.send({ type: 'domain changed', payload: { domain } })
  }, [domain])
  return null
}

export function useTrackerFeed() {
  const actor = TrackerFeedContext.useActor()
  return actor
}
