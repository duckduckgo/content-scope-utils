import { createMachine, forwardTo, pure, raise } from 'xstate'

export const textEditorMachine = createMachine(
  {
    id: 'text-editor',
    initial: 'reading-initial-state',
    context: {
      /** @type {string} */
      id: '',
      /** @type {import('./remote-resources').TextModel} */
      model: /** @type {any} */ (null),
    },
    schema: {
      events: /** @type {import('./text-editor.types').TextEditorEvents} */ ({}),
      services: /** @type {import('./text-editor.types').TextEditorServices} */ ({}),
    },
    on: {
      'set-scroll': { actions: forwardTo('scroll-listener') },
      'content-changed': { actions: forwardTo('change-listener') },
      'clear-errors': { actions: ['clearErrors'] },
      'set-errors': { actions: ['onSetErrors'] },
      'set-content': { actions: ['onSetContent'] },
    },
    invoke: [
      { src: 'model-listener', id: 'model-listener' },
      { src: 'scroll-listener', id: 'scroll-listener' },
      { src: 'change-listener', id: 'change-listener' },
    ],
    states: {
      'reading-initial-state': {
        invoke: {
          src: 'readInitial',
          id: 'readInitial',
          onDone: [{ actions: 'setScroll', cond: 'will-set-scroll' }],
        },
      },
    },
  },
  {
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
      'model-listener': (ctx) => (send, onEvent) => {
        const sub = ctx.model.onDidChangeContent(() => {
          send({ type: 'set-content', payload: { content: ctx.model.getValue() } })
        })
        return () => {
          sub.dispose()
        }
      },
      'change-listener': (ctx) => (send, onEvent) => {
        let scrollTimer
        onEvent((evt) => {
          if (evt.type === 'content-changed') {
            clearTimeout(scrollTimer)
            /** @type {string} */
            const value = /** @type {any} */ (evt).payload.content
            scrollTimer = setTimeout(() => {
              ctx.model.setValue(value)
              try {
                JSON.parse(value)
                send({ type: 'clear-errors' })
              } catch (e) {
                send({ type: 'set-errors', payload: [{ message: e instanceof Error ? e.message : String(e) }] })
              }
            }, 500)
          }
        })
        return () => {
          console.log('tear down')
          clearTimeout(scrollTimer)
        }
      },
      'scroll-listener': (ctx) => (a, onEvent) => {
        let scrollTimer
        onEvent((evt) => {
          if (evt.type === 'set-scroll') {
            clearTimeout(scrollTimer)
            scrollTimer = setTimeout(() => {
              // @ts-ignore
              const json = JSON.stringify({ scrollTop: evt.payload.scrollTop })
              const key = 'viewState_text-editor_' + ctx.id
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
       * @param ctx
       * @param evt
       * @return {import('./text-editor.types').TextEditorServices['readInitial']}
       */
      readInitial: async (ctx) => {
        const key = 'viewState_text-editor_' + ctx.id
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
