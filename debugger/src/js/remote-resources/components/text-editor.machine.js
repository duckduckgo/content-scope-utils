import { createMachine, forwardTo } from 'xstate'
import invariant from 'tiny-invariant'

/**
 * @typedef {import('./text-editor.types').TextEditorEvents} TextEditorEvents
 */
export const textEditorMachine = createMachine(
  {
    id: 'TextEditor',
    initial: 'reading-initial-state',
    context: {
      /** @type {string} */
      id: '',
      /** @type {import('./remote-resources').TextModel} */
      model: /** @type {any} */ (null),
    },
    schema: {
      events: /** @type {TextEditorEvents} */ ({}),
    },
    states: {
      'reading-initial-state': {
        invoke: {
          src: 'readInitial',
          id: 'readInitial',
          onDone: [
            {
              cond: 'will-set-scroll',
              target: 'listening',
              actions: { type: 'setInitialScroll' },
            },
            {
              target: 'listening',
            },
          ],
          onError: {
            actions: { type: 'log-error' },
            target: 'listening',
          },
        },
      },
      listening: {
        on: {
          'TextEditor.set-scroll': { actions: forwardTo('scroll-listener') },
          'TextEditor.content-changed': { actions: forwardTo('change-listener') },
          'TextEditor.clear-errors': { actions: ['clearErrors'] },
          'TextEditor.set-errors': { actions: ['onSetErrors'] },
          'TextEditor.set-content': { actions: ['onSetContent'] },
        },
        invoke: [
          { src: 'model-listener', id: 'model-listener' },
          { src: 'scroll-listener', id: 'scroll-listener' },
          { src: 'change-listener', id: 'change-listener' },
        ],
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
    strict: true,
  },

  {
    actions: {
      'log-error': (ctx, evt) => {
        if (evt.type === 'error.platform.readInitial') {
          console.error('error from text-editor machine', evt.data)
        } else {
          console.error('unknown error from text-editor machine', evt)
        }
      },
    },
    guards: {
      'will-set-scroll': (ctx, evt) => {
        if (evt.type === 'done.invoke.readInitial') {
          if (evt.data === null) return false
          return true
        }
        return false
      },
    },
    services: {
      'model-listener': (ctx) => (send) => {
        const sub = ctx.model.onDidChangeContent(() => {
          const value = ctx.model.getValue()
          send({ type: 'TextEditor.set-content', payload: { content: value } })
          const next = errorsFor(value)
          send({ type: 'TextEditor.set-errors', payload: next })
        })
        return () => {
          sub.dispose()
        }
      },
      'change-listener': (ctx) => (send, onEvent) => {
        let scrollTimer
        onEvent((/** @type {TextEditorEvents} */ evt) => {
          invariant(evt.type === 'TextEditor.content-changed', 'should only receive content-changed here')
          clearTimeout(scrollTimer)
          /** @type {string} */
          const value = /** @type {any} */ (evt).payload.content
          scrollTimer = setTimeout(() => {
            ctx.model.setValue(value)
          }, 500)
        })
        return () => {
          clearTimeout(scrollTimer)
        }
      },
      'scroll-listener': (ctx) => (a, onEvent) => {
        let scrollTimer
        onEvent((evt) => {
          invariant(evt.type === 'TextEditor.set-scroll', 'should only receive on-scroll here')
          clearTimeout(scrollTimer)
          scrollTimer = setTimeout(() => {
            // @ts-ignore
            const json = JSON.stringify({ scrollTop: evt.payload.scrollTop })
            const key = storageKeyForId(ctx.id)
            localStorage.setItem(key, json)
          }, 500)
        })
        return () => {
          clearTimeout(scrollTimer)
        }
      },
      /**
       * Try to read the initial value from storage
       * @return {Promise<import('./text-editor.types').ReadInitialData>}
       */
      readInitial: async (ctx) => {
        const key = storageKeyForId(ctx.id)
        const prev = localStorage.getItem(key)
        if (prev) {
          const json = JSON.parse(prev)
          if (json.scrollTop) {
            return json
          }
        }
        return null
      },
    },
  },
)

function errorsFor(value) {
  try {
    JSON.parse(value)
    return []
  } catch (e) {
    return [{ message: e instanceof Error ? e.message : String(e) }]
  }
}

/**
 * @param {string} id
 * @return {string}
 */
function storageKeyForId(id) {
  return 'viewState_text-editor_' + id
}
