import { useEffect, useMemo, useRef } from 'react'
import * as monaco from 'monaco-editor'
import { createPortal } from 'react-dom'
import { Button } from './buttons'
import { useMonacoContentChanged, useMonacoErrors, useMonacoModel, useMonacoModelSync } from '../models/monaco-opt-in'
import { Uri } from 'monaco-editor'

/**
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('../remote-resources/remote-resources.machine.types').ContentError} ContentError
 */

/**
 * @param {object} props
 * @param {string} props.original
 * @param {boolean} props.pending
 * @param {boolean} props.edited
 * @param {boolean} props.invalid
 * @param {string} props.lastValue
 * @param {string} props.contentType
 * @param {string} props.id
 * @param {any} [props.additionalButtons]
 * @param {(contents: string) => void} props.onContentChanged
 * @param {(errors: ContentError[]) => void} props.onErrors
 */
export function MonacoDiffEditor(props) {
  const ref = useRef(null)
  const editorRefs = /** @type {import('react').MutableRefObject} */ (useRef({}))
  const currentUri = useMemo(() => Uri.file('diff/current/' + props.id), [props.id])
  const originalUri = useMemo(() => Uri.file('diff/original/' + props.id), [props.id])

  const currentModel = useMonacoModel(currentUri, props.lastValue, props.contentType)
  const originalModel = useMonacoModel(originalUri, props.original, props.contentType)

  useEffect(() => {
    if (!ref.current) throw new Error('unreachable')
    if (!editorRefs.current) throw new Error('unreachable')
    const localRef = editorRefs.current

    const diffEditor = monaco.editor.createDiffEditor(ref.current, {
      originalEditable: false,
      automaticLayout: false,
    })

    diffEditor.setModel({
      original: originalModel,
      modified: /** @type {ITextModel} */ (currentModel),
    })

    localRef.navi = monaco.editor.createDiffNavigator(diffEditor, {
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
      currentModel.dispose()
      originalModel.dispose()
      diffEditor.dispose()
      localRef.navi.dispose()
    }
  }, [currentModel, originalModel, props.id])

  useMonacoErrors(props.onErrors, currentUri)
  useMonacoContentChanged(props.onContentChanged, currentUri)
  useMonacoModelSync(props.lastValue, currentUri)
  useMonacoModelSync(props.original, originalUri)

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
