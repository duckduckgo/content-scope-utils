import { RemoteResourcesContext } from '../remote-resources.page'
import { useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import invariant from 'tiny-invariant'
import MonacoDiffEditor from '../../components/monaco-diff-editor'
import style from './original-diff.module.css'

/**
 * @typedef {import('../../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('./remote-resource-editor.js').EditorKind} EditorKind
 * @typedef {import('../../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('../../models/text-model').TextModel} TextModel
 * @typedef {import('react').ReactNode} ReactNode
 */

/**
 * @param {object} props
 * @param {RemoteResource} props.resource
 * @param {TextModel} props.model
 */
export function OriginalDiff(props) {
  const [state, send] = RemoteResourcesContext.useActor()

  // state
  const showingRemote = state.matches(['showing editor', 'originalDiff', 'showing'])
  const fetchingRemote = state.matches(['showing editor', 'originalDiff', 'fetching'])
  const buttons = /** @type {any} */ (useRef())

  const closeDiff = () => send({ type: 'close original diff' })

  return (
    <dialog open={showingRemote || fetchingRemote} onClose={closeDiff}>
      <div className={style.root}>
        <div className={style.header}>
          <button onClick={closeDiff}>Close plx</button>
        </div>
        <div className={style.main}>
          {showingRemote && (
            <OriginalDiffEditor buttons={buttons.current} model={props.model} resource={props.resource} />
          )}
        </div>
        <div className={style.footer}>
          <div className="flex column-gap" data-testid="OriginalDiffEditorFooter">
            <div className="flex column-gap" ref={buttons} />
          </div>
        </div>
      </div>
    </dialog>
  )
}

/**
 * @param {object} props
 * @param {RemoteResource} props.resource
 * @param {ReactNode} props.buttons
 * @param {TextModel} props.model
 */
export function OriginalDiffEditor(props) {
  const [state, send] = RemoteResourcesContext.useActor()
  const [model] = useState(() => monaco.editor.createModel(props.resource.current.contents, 'application/json'))
  invariant(state.context.currentResource?.id, 'must have currentResource?.id')

  return (
    <MonacoDiffEditor
      original={state.context.originalResources[state.context.currentResource.id].current.contents}
      additionalButtons={props.buttons}
      model={model}
      id={props.resource.id + '__original_diff'}
      onErrors={(e) => console.log('todo: onErrors', e)}
      edited={true}
      invalid={false}
      pending={false}
    />
  )
}
