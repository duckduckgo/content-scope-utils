import { useEffect, useLayoutEffect, useRef } from 'react'
import styles from './text-editor.module.css'

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
  const ref = /** @type {import("react").MutableRefObject<null | any>} */ (useRef(null))
  const domRef = /** @type {import("react").MutableRefObject<HTMLElement | any>} */ (useRef(null))
  const key = 'viewState_text-editor_' + props.resource.id

  // read initial from storage
  useLayoutEffect(() => {
    const prev = localStorage.getItem(key)
    const currentDom = domRef.current
    if (prev) {
      const json = JSON.parse(prev)
      if (json.scrollTop && currentDom) {
        currentDom.scrollTop = json.scrollTop
      }
    }
  }, [key])

  // sync model with DOM node
  useEffect(() => {
    const currentDom = domRef.current
    const sub = props.model.onDidChangeContent(() => {
      if (currentDom.value !== props.model.getValue()) {
        currentDom.value = props.model.getValue()
      }
    })
    return () => {
      sub.dispose()
    }
  }, [props.model])

  //
  useEffect(() => {
    const current = ref.current
    const currentDom = domRef.current

    let scrollTimer
    const handler = (e) => {
      clearTimeout(scrollTimer)
      const last = e.target.scrollTop
      scrollTimer = setTimeout(() => {
        const json = JSON.stringify({ scrollTop: last })
        localStorage.setItem(key, json)
      }, 500)
    }

    currentDom.addEventListener('scroll', handler)
    return () => {
      currentDom.removeEventListener('scroll', handler)
      clearTimeout(current)
      clearTimeout(scrollTimer)
    }
  }, [key])

  /**
   * debounce changes
   * @param {React.ChangeEvent<HTMLTextAreaElement>} event
   */
  function onChange(event) {
    if (ref.current) clearTimeout(ref.current)
    const value = event.target.value
    ref.current = setTimeout(() => {
      props.model.setValue(value)
      try {
        JSON.parse(value)
        props.onErrors([])
      } catch (e) {
        props.onErrors([
          {
            message: e instanceof Error ? e.message : String(e),
          },
        ])
      }
    }, 300)
  }

  return <textarea onChange={onChange} className={styles.textArea} ref={domRef} defaultValue={props.model.getValue()} />
}
