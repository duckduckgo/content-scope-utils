import { useEffect, useRef } from 'react'
import styles from './text-editor.module.css'
import { useMachine } from '@xstate/react'
import { textEditorMachine } from './text-editor.machine'
import invariant from 'tiny-invariant'

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
 * @param {string} props.contentType
 * @param {(errors: ContentError[]) => void} props.onErrors
 * @param {(content: string) => void} props.onContentChanged
 */
export function TextEditor(props) {
  const domRef = /** @type {import("react").MutableRefObject<HTMLElement | any>} */ (useRef(null))
  const uri = `file:///inline/${props.id}`
  const [, send] = useMachine(textEditorMachine, {
    context: {
      id: props.id,
      contentType: props.contentType,
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
        // todo: make errors derived
        props.onErrors(evt.payload)
      },
      onUpdateContent: (_, evt) => {
        invariant(evt.type === 'TextEditor.update-content')
        props.onContentChanged(evt.payload.content)
      },
    },
    devTools: true,
  })

  useEffect(() => {
    if (props.lastValue === domRef.current.value) {
      // do nothing
    } else {
      domRef.current.value = props.lastValue
      send({
        type: 'TextEditor.content-changed',
        payload: { content: /** @type {any} */ props.lastValue },
      })
    }
  }, [props.lastValue, send])

  return (
    <div className={styles.wrap}>
      <textarea
        name="simple-editor"
        className={styles.textArea}
        defaultValue={props.defaultValue}
        ref={domRef}
        data-uri={uri}
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
