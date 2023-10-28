import * as monaco from 'monaco-editor'
import { useEffect, useMemo, useRef } from 'react'
import invariant from 'tiny-invariant'
import { useMonacoContentChanged, useMonacoErrors, useMonacoModel, useMonacoModelSync } from '../models/monaco-opt-in'
import { Uri } from 'monaco-editor'

/**
 * @typedef {import('../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('monaco-editor').editor.IStandaloneCodeEditor} IStandaloneCodeEditor
 * @typedef {import('../remote-resources/remote-resources.machine.types').ContentError} ContentError
 */

/**
 * @param {object} props
 * @param {boolean} props.pending
 * @param {boolean} props.edited
 * @param {boolean} props.invalid
 * @param {string} props.lastValue
 * @param {string} props.contentType
 * @param {(errors: ContentError[]) => void} props.onErrors
 * @param {(contents: string) => void} props.onContentChanged
 * @param {string} props.id
 */
export function MonacoEditor(props) {
  const ref = useRef(null)
  /** @type {import("react").MutableRefObject<IStandaloneCodeEditor | null>} */
  const editorRef = useRef(null)
  const uri = useMemo(() => Uri.file('inline/' + props.id), [props.id])
  const model = useMonacoModel(uri, props.lastValue, props.contentType)

  useEffect(() => {
    invariant(ref.current, 'ref must exist here')
    const editor = monaco.editor.create(ref.current, {
      model: model,
      automaticLayout: false,
    })

    const prev = localStorage.getItem('viewState_' + props.id)
    if (prev) {
      editor.restoreViewState(JSON.parse(prev))
    }

    // todo(Shane): move this from the the component
    const int = setInterval(() => {
      localStorage.setItem('viewState_' + props.id, JSON.stringify(editor.saveViewState()))
    }, 1000)

    editorRef.current = editor

    return () => {
      clearInterval(int)
      editor?.dispose()
    }
  }, [model, props.id, uri])

  useMonacoErrors(props.onErrors, uri)
  useMonacoContentChanged(props.onContentChanged, uri)
  useMonacoModelSync(props.lastValue, uri)

  return <div ref={ref} style={{ height: '100%', width: '100%' }}></div>
}

export default MonacoEditor

/**
 * @param {object} props
 * @param {ITextModel} props.model
 * @param {string} props.id
 * @param {(errors: ContentError[]) => void} props.onErrors
 */
export function MonacoEditorRaw(props) {
  const ref = useRef(null)
  const uri = useMemo(() => Uri.file('raw/' + props.id), [props.id])

  useMonacoErrors(props.onErrors, uri)

  useEffect(() => {
    invariant(ref.current, 'ref must exist here')

    const editor = monaco.editor.create(ref.current, {
      model: props.model,
    })

    return () => {
      editor?.dispose()
    }
  }, [props.model])

  return <div ref={ref} style={{ height: '100%', width: '100%' }}></div>
}
