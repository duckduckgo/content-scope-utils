import { useEffect, useLayoutEffect, useRef } from 'react'
import styles from './text-editor.module.css'
import { useMachine } from '@xstate/react'
import { textEditorMachine } from './text-editor.machine'
import invariant from 'tiny-invariant'

/**
 * @typedef {import('../remote-resources.machine.types').ContentError} ContentError
 */

/**
 * @param {object} props
 * @param {import('./remote-resources').RemoteResource} props.resource
 * @param {import('../../models/text-model').TextModel} props.model
 * @param {(errors: ContentError[]) => void} props.onErrors
 */
export function TextEditor(props) {
  const domRef = /** @type {import("react").MutableRefObject<HTMLElement | any>} */ (useRef(null))

  const [state, send] = useMachine(() => {
    return textEditorMachine
      .withContext({
        id: props.resource.id,
        model: props.model,
      })
      .withConfig({
        actions: {
          setScroll: (_, evt) => {
            invariant(evt.type === 'done.invoke.readInitial', 'evt.type was not done.invoke.readInitial')
            invariant(domRef.current, 'domRef.current missing')

            // null is a valid value here
            if (evt.data !== null) {
              domRef.current.scrollTop = evt.data.scrollTop
            }
          },
          clearErrors: (_, evt) => {
            invariant(evt.type === 'clear-errors')
            props.onErrors([])
          },
          onSetErrors: (_, evt) => {
            invariant(evt.type === 'set-errors')
            props.onErrors(evt.payload)
          },
          onSetContent: (_, evt) => {
            invariant(evt.type === 'set-content')
            invariant(domRef.current, 'domRef.current missing')
            domRef.current.value = evt.payload.content
          },
        },
      })
  })

  return (
    <div className={styles.wrap}>
      <div>{JSON.stringify(state.value)}</div>
      <div>
        <textarea
          onChange={(e) => {
            send({ type: 'content-changed', payload: { content: /** @type {any} */ (e.target).value } })
          }}
          onScroll={(e) =>
            send({ type: 'set-scroll', payload: { scrollTop: /** @type {any} */ (e.target).scrollTop } })
          }
          className={styles.textArea}
          ref={domRef}
          defaultValue={props.model.getValue()}
        />
      </div>
    </div>
  )
}
