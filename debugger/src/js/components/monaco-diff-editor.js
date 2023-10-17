import { useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import { createPortal } from 'react-dom'
import { Button } from './buttons'
import { useMonacoContentChanged, useMonacoErrors, useMonacoLastValue } from '../models/monaco-opt-in'

/**
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('../models/text-model').TextModel} TextModel
 * @typedef {import('../remote-resources/remote-resources.machine.types').ContentError} ContentError
 */

/**
 * @param {object} props
 * @param {string} props.original
 * @param {boolean} props.pending
 * @param {boolean} props.edited
 * @param {boolean} props.invalid
 * @param {string} props.lastValue
 * @param {string} props.id
 * @param {any} [props.additionalButtons]
 * @param {(contents: string) => void} props.onContentChanged
 * @param {(errors: ContentError[]) => void} props.onErrors
 */
export function MonacoDiffEditor(props) {
  const ref = useRef(null)
  const editorRefs = /** @type {import('react').MutableRefObject} */ (useRef({}))
  const [model] = useState(() => monaco.editor.createModel(props.lastValue, 'application/json'))
  const [originalModel] = useState(() => monaco.editor.createModel(props.original, 'application/json'))

  useMonacoErrors(props.onErrors)
  useMonacoContentChanged(props.onContentChanged, model)
  useMonacoLastValue(props.lastValue, model)

  useEffect(() => {
    if (!ref.current) throw new Error('unreachable')
    const originalModel = monaco.editor.createModel(props.original, 'application/json')

    const diffEditor = monaco.editor.createDiffEditor(ref.current, {
      originalEditable: false,
      automaticLayout: false,
    })

    diffEditor.setModel({
      original: originalModel,
      modified: /** @type {ITextModel} */ (model),
    })

    editorRefs.current.navi = monaco.editor.createDiffNavigator(diffEditor, {
      followsCaret: true, // resets the navigator state when the user selects something in the editor
      ignoreCharChanges: true, // jump from line to line
    })

    const prev = localStorage.getItem('viewState_' + props.id)
    if (prev) {
      const prevJson = JSON.parse(prev)
      prevJson.original = prevJson
      prevJson.modified = prevJson
      diffEditor.restoreViewState(prevJson)
    }

    // todo(Shane): move this from the component
    const int = setInterval(() => {
      localStorage.setItem('viewState_' + props.id, JSON.stringify(diffEditor.saveViewState()?.modified))
    }, 1000)

    return () => {
      clearInterval(int)
      originalModel.dispose()
      diffEditor.dispose()
      editorRefs.current.navi.dispose()
    }
  }, [model, originalModel])

  function prevDiff() {
    editorRefs.current.navi.previous()
  }

  function nextDiff() {
    editorRefs.current.navi.next()
  }

  const portal = (
    <>
      <Button onClick={prevDiff} disabled={!props.edited}>
        ⏪ prev diff
      </Button>
      <Button onClick={nextDiff} disabled={!props.edited}>
        next diff ⏭️
      </Button>
    </>
  )

  return (
    <>
      {props.additionalButtons ? createPortal(portal, props.additionalButtons) : null}
      <div ref={ref} style={{ height: '100%', width: '100%' }}></div>
    </>
  )
}

export default MonacoDiffEditor
