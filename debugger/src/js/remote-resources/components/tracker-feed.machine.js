import { assign, createMachine } from 'xstate'
import { RemoteResourcesContext } from '../remote-resources.page'
import { createActorContext } from '@xstate/react'
import { useContext, useEffect } from 'react'
import invariant from 'tiny-invariant'
import { GlobalContext } from '../../DebugToolsMessages.mjs'

export const trackerFeedMachine = createMachine(
  {
    id: 'trackerfeed',
    context: /** @type {import("./tracker-feed.types").TrackerFeedContext} */ ({}),
    initial: 'idle',
    on: {
      broadcastCurrentDomain: {
        target: 'subscribing',
        actions: ['domainChanged'],
      },
      onTrackersUpdated: {
        actions: ['assignRequests'],
      },
    },
    states: {
      idle: {
        always: [{ cond: 'has domain', target: 'subscribing' }, { target: 'waiting for domain selection' }],
      },
      'waiting for domain selection': {},
      subscribing: {
        invoke: {
          id: 'tracker-feed',
          src: 'tracker-feed',
        },
      },
    },
    schema: {
      events:
        /** @type {import('../remote-resources.machine.types').RemoteResourcesBroadcastEvents | import('./tracker-feed.types').TrackerFeedEvents} */ ({}),
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    services: {
      'tracker-feed': (ctx, evt) => (send) => {
        invariant(ctx.domain)
        const unsub = ctx.messages.onTrackersUpdated(ctx.domain, (data) => {
          console.log(data)
          send({ type: 'onTrackersUpdated', payload: data })
        })
        return () => {
          unsub()
        }
      },
    },
    guards: {
      'has domain': (ctx) => typeof ctx.domain === 'string',
    },
    actions: {
      domainChanged: assign({
        domain: (ctx, evt) => {
          invariant(evt.type === 'broadcastCurrentDomain')
          return evt.payload.domain
        },
      }),
      assignRequests: assign({
        requests: (ctx, evt) => {
          invariant(evt.type === 'onTrackersUpdated')
          return evt.payload.requests
        },
      }),
    },
  },
)

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
    ref.send({ type: 'broadcastCurrentDomain', payload: { domain } })
  }, [domain])
  return null
}

export function useTrackerFeed() {
  const actor = TrackerFeedContext.useActor()
  return actor
}
