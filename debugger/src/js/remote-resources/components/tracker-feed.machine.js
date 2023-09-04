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
    schema: {
      events: /** @type {import('./tracker-feed.types').TrackerFeedEvents} */ ({}),
    },
    initial: 'idle',
    on: {
      broadcastCurrentDomain: [
        {
          actions: ['assignDomain'],
          target: 'subscribing',
          cond: 'will-set-domain',
        },
        {
          actions: ['assignDomain'],
          target: 'waiting for domain selection',
        },
      ],
    },
    states: {
      idle: {
        always: [{ cond: 'has domain', target: 'subscribing' }, { target: 'waiting for domain selection' }],
      },
      'waiting for domain selection': {},
      subscribing: {
        on: {
          onTrackersUpdated: {
            actions: ['assignRequests'],
          },
          refresh: {
            target: 'subscribing',
          },
        },
        invoke: {
          id: 'tracker-feed',
          src: 'tracker-feed',
          onDone: [{ actions: 'clear' }],
        },
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    services: {
      'tracker-feed': (ctx, evt) => (send) => {
        invariant(ctx.domain, 'ctx.domain must be set before getting here')
        const unsub = ctx.messages.onTrackersUpdated(ctx.domain, (data) => {
          send({ type: 'onTrackersUpdated', payload: data })
        })
        return () => {
          console.log('stop!')
          unsub()
        }
      },
    },
    guards: {
      'will-set-domain': (ctx, evt) => {
        invariant(evt.type === 'broadcastCurrentDomain', `evt.type === 'broadcastCurrentDomain'`)
        return typeof evt.payload.domain === 'string'
      },
      'has domain': (ctx) => {
        return typeof ctx.domain === 'string'
      },
    },
    actions: {
      assignDomain: assign({
        domain: (ctx, evt) => {
          invariant(evt.type === 'broadcastCurrentDomain', `evt.type === 'broadcastCurrentDomain'`)
          console.log('hhhh', evt.payload)
          // this could be undefined, that's a valid situation (it means no domain was selected in the UI)
          return evt.payload.domain
        },
      }),
      clear: () => {
        console.log('CLEAR')
      },
      assignRequests: assign({
        requests: (ctx, evt) => {
          invariant(evt.type === 'onTrackersUpdated', `evt.type === 'onTrackersUpdated'`)
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
