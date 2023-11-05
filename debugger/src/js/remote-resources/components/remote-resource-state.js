import * as z from 'zod'
import { DD, DT, InlineDL } from '../../components/definition-list.js'
import { MicroButton } from '../../components/buttons'
import { URLEditor } from '../../components/url-editor'
import { RemoteResourcesContext } from '../remote-resources.page'
import { useEditorKinds } from './remote-resource-editor'
import { OriginalDiffModal } from './original-diff-modal'
import { date } from '../../lib'
import invariant from 'tiny-invariant'

/**
 * @typedef {import('../../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('./remote-resource-editor.js').EditorKind} EditorKind
 * @typedef {import('../../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('../../models/text-model').TextModel} TextModel
 */

/**
 * @param {{
 *   resource: RemoteResource;
 * }} props
 */
export function RemoteResourceState(props) {
  const [state, send] = RemoteResourcesContext.useActor()

  // state
  const savingRemote = state.matches(['showing editor', 'editing', 'saving new remote'])
  const edited = state.matches(['showing editor', 'editing', 'editor has edited content'])
  const showingUrlEditor = state.matches(['showing editor', 'urlEditor', 'open'])

  // events
  const showDiff = () => send({ type: 'set editor kind', payload: 'diff' })
  const showOverrideForm = () => send({ type: 'show url editor' })
  const revertEdited = () => {
    send({ type: 'revert current content' })
  }

  /** @type {(url: string) => void} */
  function setUrl(url) {
    send({
      type: 'RemoteResource.setRemoteUrl',
      id: props.resource.id,
      url,
    })
  }

  function copy(e, v) {
    e.preventDefault()
    navigator.clipboard.writeText(v).catch(console.error)
  }

  function saveNewRemote(e) {
    e.preventDefault()
    const formData = Object.fromEntries(new FormData(e.target))
    const schema = z.object({
      'resource-url': z.string(),
    })
    const data = schema.parse(formData)
    setUrl(data['resource-url'])
  }

  // derived state
  const { editorKind } = useEditorKinds()

  let hasOverride
  let updatedAt

  if ('remote' in props.resource.current.source) {
    if (props.resource.current.source.remote.url !== props.resource.url) {
      hasOverride = true
    }
    updatedAt = props.resource.current.source.remote.fetchedAt
  }
  if ('debugTools' in props.resource.current.source) {
    hasOverride = true
    updatedAt = props.resource.current.source.debugTools.modifiedAt
  }

  invariant(updatedAt, 'updatedAt must be a string by this point')

  const formatted = date(updatedAt)

  return (
    <>
      <OriginalDiffModal resource={props.resource} />
      <div className="row card">
        <InlineDL>
          <DT>ID:</DT>
          <DD>{props.resource.id}</DD>
          {!hasOverride && formatted ? (
            <>
              <DT>Last fetched:</DT>
              <DD data-testid="last-fetched-date">
                {formatted}{' '}
                <MicroButton className="ml-3.5" onClick={() => setUrl(props.resource.url)}>
                  {savingRemote ? 'Updating...' : 'Refresh 🔄'}
                </MicroButton>
              </DD>
              {edited && (
                <>
                  <DT>
                    <span>🔵 LOCAL EDITS:</span>
                  </DT>
                  <DD>
                    <MicroButton onClick={revertEdited}>↩️ Revert</MicroButton>
                    {editorKind !== 'diff' && (
                      <MicroButton className="ml-3.5" onClick={showDiff}>
                        Show Diff
                      </MicroButton>
                    )}
                  </DD>
                </>
              )}
            </>
          ) : null}
        </InlineDL>
        <InlineDL>
          <DT>
            <span className={hasOverride ? 'strikethrough' : undefined}>URL:</span>
          </DT>
          <DD>
            <span className={hasOverride ? 'strikethrough' : undefined} data-testid="remote-resource-state.remote-url">
              {props.resource.url}{' '}
            </span>
            <MicroButton className="ml-3.5" onClick={(e) => copy(e, props.resource.url)}>
              Copy 📄
            </MicroButton>
            {!hasOverride && !showingUrlEditor && (
              <MicroButton className="ml-3.5" onClick={showOverrideForm}>
                Override ✏️
              </MicroButton>
            )}
          </DD>
        </InlineDL>
        {showingUrlEditor && (
          <div className="row">
            <URLEditor
              pending={savingRemote}
              save={saveNewRemote}
              cancel={() => send({ type: 'hide url editor' })}
              input={({ className }) => {
                return (
                  <input autoFocus className={className} type="text" name="resource-url" placeholder="enter a url" />
                )
              }}
            />
          </div>
        )}
        <Override resource={props.resource} />
      </div>
    </>
  )
}

/**
 * @param {object} props
 * @param {RemoteResource} props.resource
 */
function Override(props) {
  const [state, send] = RemoteResourcesContext.useActor()

  // state
  const savingRemote = state.matches(['showing editor', 'editing', 'saving new remote'])
  const edited = state.matches(['showing editor', 'editing', 'editor has edited content'])

  // events
  const showDiff = () => send({ type: 'set editor kind', payload: 'diff' })
  const showDiffWithOriginal = () => send({ type: 'show original diff' })
  const revertEdited = () => send({ type: 'revert current content' })

  /** @type {(url: string) => void} */
  function setUrl(url) {
    send({
      type: 'RemoteResource.setRemoteUrl',
      id: props.resource.id,
      url,
    })
  }

  function copy(e, v) {
    e.preventDefault()
    navigator.clipboard.writeText(v).catch(console.error)
  }

  const { editorKind } = useEditorKinds()
  const { source } = props.resource.current

  if ('remote' in source) {
    if (source.remote.url === props.resource.url) {
      return null
    }
  }

  if ('remote' in source) {
    return (
      <>
        <InlineDL>
          <DT>CURRENT OVERRIDE:</DT>
          <DD>
            {source.remote.url}
            <MicroButton className="ml-3.5" onClick={(e) => copy(e, source.remote.url)}>
              Copy 📄
            </MicroButton>
            <MicroButton className="ml-3.5" onClick={() => setUrl(props.resource.url)}>
              {savingRemote ? 'removing...' : 'remove ❌'}
            </MicroButton>
            <MicroButton className="ml-3.5" onClick={showDiffWithOriginal}>
              Show Diff with Original
            </MicroButton>
          </DD>
          {/* todo: make reusable */}
          {edited && (
            <>
              <DT>
                <span>🔵 LOCAL EDITS:</span>
              </DT>
              <DD>
                <MicroButton onClick={revertEdited}>↩️ Revert</MicroButton>
                {editorKind !== 'diff' && (
                  <MicroButton className="ml-3.5" onClick={showDiff}>
                    Show Diff
                  </MicroButton>
                )}
              </DD>
            </>
          )}
        </InlineDL>
        <InlineDL>
          <DT>Fetched at:</DT>
          <DD>
            {date(source.remote.fetchedAt)}
            <MicroButton className="ml-3.5" onClick={() => setUrl(source.remote.url)}>
              {savingRemote ? 'Updating...' : 'Refresh 🔄'}
            </MicroButton>
          </DD>
        </InlineDL>
      </>
    )
  }

  if ('debugTools' in source) {
    return (
      <InlineDL>
        <DT>CURRENT OVERRIDE:</DT>
        <DD>&lt;Debug Tools&gt;</DD>
        <DT>Updated at:</DT>
        <DD>
          {date(source.debugTools.modifiedAt)}
          <MicroButton className="ml-3.5" onClick={() => setUrl(props.resource.url)}>
            {savingRemote ? 'removing...' : 'remove ❌'}
          </MicroButton>
          <MicroButton className="ml-3.5" onClick={showDiffWithOriginal}>
            Show Diff with Original
          </MicroButton>
        </DD>
        {edited && (
          <>
            <DT>
              <span>🔵 LOCAL EDITS:</span>
            </DT>
            <DD>
              <MicroButton onClick={revertEdited}>↩️ Revert</MicroButton>
              {editorKind !== 'diff' && (
                <MicroButton className="ml-3.5" onClick={showDiff}>
                  Show Diff
                </MicroButton>
              )}
            </DD>
          </>
        )}
      </InlineDL>
    )
  }

  return null
}
