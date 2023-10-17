import { RemoteResourcesContext } from '../remote-resources.page'
import { useRef } from 'react'
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
          {showingRemote && <OriginalDiffEditor buttons={buttons.current} resource={props.resource} />}
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
 * todo: fix this
 */
export function OriginalDiffEditor(props) {
  const [state] = RemoteResourcesContext.useActor()
  invariant(state.context.currentResource?.id, 'must have currentResource?.id')

  return (
    <MonacoDiffEditor
      original={state.context.originalResources[state.context.currentResource.id].current.contents}
      additionalButtons={props.buttons}
      lastValue={props.resource.current.contents}
      id={props.resource.id + '__original_diff'}
      onErrors={(e) => console.log('todo: onErrors', e)}
      onContentChanged={(e) => console.log('todo: onContentChanged', e)}
      edited={true}
      invalid={false}
      pending={false}
    />
  )
}
