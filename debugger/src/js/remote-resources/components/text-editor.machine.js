import { createMachine, forwardTo } from 'xstate'

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
              actions: 'setInitialScroll',
              target: 'listening',
            },
            {
              target: 'listening',
            },
          ],
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
    strict: true,
  },

  {
    actions: {},
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
          send({ type: 'TextEditor.set-content', payload: { content: ctx.model.getValue() } })
        })
        return () => {
          sub.dispose()
        }
      },
      'change-listener': (ctx) => (send, onEvent) => {
        let scrollTimer
        onEvent((/** @type {TextEditorEvents} */ evt) => {
          if (evt.type === 'TextEditor.content-changed') {
            clearTimeout(scrollTimer)
            /** @type {string} */
            const value = /** @type {any} */ (evt).payload.content
            scrollTimer = setTimeout(() => {
              // set the model value to reflect the current value
              ctx.model.setValue(value)

              // now try to validate the content
              try {
                JSON.parse(value)
                send({ type: 'TextEditor.clear-errors' })
              } catch (e) {
                send({
                  type: 'TextEditor.set-errors',
                  payload: [{ message: e instanceof Error ? e.message : String(e) }],
                })
              }
            }, 500)
          }
        })
        return () => {
          console.log('tear down change-listener')
          clearTimeout(scrollTimer)
        }
      },
      'scroll-listener': (ctx) => (a, onEvent) => {
        let scrollTimer
        onEvent((evt) => {
          if (evt.type === 'TextEditor.set-scroll') {
            clearTimeout(scrollTimer)
            scrollTimer = setTimeout(() => {
              // @ts-ignore
              const json = JSON.stringify({ scrollTop: evt.payload.scrollTop })
              const key = computeKey(ctx.id)
              localStorage.setItem(key, json)
            }, 500)
          }
        })
        return () => {
          console.log('tear down scroll-listener')
          clearTimeout(scrollTimer)
        }
      },
      /**
       * Try to read the initial value
       * @return {Promise<import('./text-editor.types').ReadInitialData>}
       */
      readInitial: async (ctx) => {
        const key = computeKey(ctx.id)
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

/**
 * @param {string} id
 * @return {string}
 */
function computeKey(id) {
  return 'viewState_text-editor_' + id
}
