import { useRef, useState } from 'react'
import styles from './text-editor.module.css'
import { useMachine } from '@xstate/react'
import { textEditorMachine } from './text-editor.machine'
import invariant from 'tiny-invariant'
import * as monaco from 'monaco-editor'

/**
 * @typedef {import('../remote-resources.machine.types').ContentError} ContentError
 */

/**
 * A simple text-area editor
 *
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.defaultValue
 * @param {string} props.lastValue
 * @param {(errors: ContentError[]) => void} props.onErrors
 */
export function TextEditor(props) {
  const domRef = /** @type {import("react").MutableRefObject<HTMLElement | any>} */ (useRef(null))
  const [model] = useState(() => monaco.editor.createModel(props.lastValue, 'application/json'))

  const [, send] = useMachine(textEditorMachine, {
    context: {
      id: props.id,
      model: model,
    },
    actions: {
      setInitialScroll: (_, evt) => {
        invariant(evt.type === 'done.invoke.readInitial', 'evt.type was not done.invoke.readInitial')
        invariant(domRef.current, 'domRef.current missing')

        // null is a valid value here
        if (evt.data !== null) {
          domRef.current.scrollTop = evt.data.scrollTop
        }
      },
      clearErrors: (_, evt) => {
        invariant(evt.type === 'TextEditor.clear-errors')
        props.onErrors([])
      },
      onSetErrors: (_, evt) => {
        invariant(evt.type === 'TextEditor.set-errors')
        props.onErrors(evt.payload)
      },
      onSetContent: (_, evt) => {
        invariant(evt.type === 'TextEditor.set-content')
        invariant(domRef.current, 'domRef.current missing')
        domRef.current.value = evt.payload.content
      },
    },
  })

  return (
    <div className={styles.wrap}>
      <textarea
        name="simple-editor"
        className={styles.textArea}
        defaultValue={props.defaultValue}
        ref={domRef}
        onChange={(e) => {
          send({
            type: 'TextEditor.content-changed',
            payload: { content: /** @type {any} */ (e.target).value },
          })
        }}
        onScroll={(e) => {
          send({
            type: 'TextEditor.set-scroll',
            payload: { scrollTop: /** @type {any} */ (e.target).scrollTop },
          })
        }}
      />
    </div>
  )
}
