import { RemoteResourcesContext } from '../remote-resources.page'
import { RemoteResourceState } from './remote-resource-state'
import invariant from 'tiny-invariant'
import { TogglesEditor } from '../../components/toggles-editor'
import styles from '../../app/components/app.module.css'
import { SubNav } from '../../app/components/feature-nav'
import { lazy, Suspense, useCallback, useContext, useRef, useState } from 'react'
import { Button } from '../../components/buttons'
import { Sidebar } from './sidebar'
import { DiffViewer } from '../../components/diff-viewer'
import { TextEditor } from './text-editor'
import { TrackersEditor } from '../../components/trackers-editor'
import * as monaco from 'monaco-editor'
import { GlobalContext } from '../../global-config.react'

const MonacoEditor = lazy(() => import('../../components/monaco-editor.js'))
const MonacoDiffEditor = lazy(() => import('../../components/monaco-diff-editor.js'))
const PatchesEditor = lazy(() => import('../../components/patches-editor.js'))

/**
 * @typedef {import('../../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 * @typedef {import("../remote-resources.machine").EditorKind} EditorKind
 * @typedef {import('../../app/components/feature-nav').SubNavItem} SubNavItem
 * @typedef {import('../../models/text-model').TextModel} TextModel
 * @typedef {import('../remote-resources.machine.types').ContentError} ContentError
 */

/**
 * @param {object} props
 * @param {RemoteResource} props.resource
 * @param {SubNavItem[]} props.nav
 */
export function RemoteResourceEditor(props) {
  const actor = RemoteResourcesContext.useActorRef()

  /** @type {(kind: EditorKind) => void} */
  const revertEdited = () => {
    actor.send({ type: 'revert current content' })
  }

  /** this is used to allow editors to participate in the $footer (eg: adding extra buttons) */
  const additionalButtons = useRef(null)

  return (
    <>
      <main className={styles.appMain}>
        <InvalidEditorErrors revert={revertEdited} />
        <SavingErrors dismiss={() => actor.send({ type: 'clearErrors' })} />

        <div className={styles.mainHeader}>
          {/** Additional nav when there's more than 1 resource */}
          {props.nav.length > 1 ? (
            <div className="row">
              <SubNav items={props.nav} prefix={'/remoteResources/'} />
            </div>
          ) : null}

          <RemoteResourceState resource={props.resource} />
        </div>

        <div className={styles.sidebar}>
          <div className={styles.inner}>
            <Sidebar />
          </div>
        </div>

        <div className={styles.mainContent}>
          <EditorSelection
            resource={props.resource}
            key={props.resource.id}
            additionalButtons={additionalButtons.current}
          />
        </div>
      </main>
      <footer className={styles.appFooter}>
        <Footer additionalButtons={additionalButtons} resource={props.resource} />
      </footer>
    </>
  )
}

/**
 * @param {object} props
 * @param {RemoteResource} props.resource
 * @param {any} props.additionalButtons
 */
function Footer(props) {
  const [state, send] = RemoteResourcesContext.useActor()

  const revertEdited = () => {
    send({ type: 'revert current content' })
  }

  function saveDebugContent() {
    send({
      type: 'RemoteResource.setDebugContent',
      id: props.resource.id,
    })
  }

  const savingChanges = state.matches(['showing editor', 'editing', 'saving edited'])
  const hasEdits = state.matches(['showing editor', 'editing', 'editor has edited content'])
  const contentIsInvalid = state.matches(['showing editor', 'contentErrors', 'some'])

  const editorState = contentIsInvalid ? 'not-allowed' : 'enabled'

  // Buttons common to all editors
  const buttons = (
    <>
      <Button onClick={() => revertEdited()} disabled={!hasEdits}>
        ↩️ Revert
      </Button>
      <Button onClick={() => saveDebugContent()} disabled={!hasEdits} data-state={editorState}>
        {savingChanges ? 'saving...' : '💾 Save + Apply'}
      </Button>
    </>
  )
  return (
    <div className="flex column-gap" data-testid="Footer">
      <div className="flex column-gap" ref={props.additionalButtons} />
      <div className="flex column-gap ml-auto">{buttons}</div>
    </div>
  )
}

/**
 * @return {{editorKind: EditorKind, values: {label: string, value: string}[]}}
 */
export function useEditorKinds() {
  return RemoteResourcesContext.useSelector((state) => {
    const validKinds = state.context.currentResource?.editorKinds || []
    const nextKind = state.context.editorKind || 'inline'
    const editorKind = validKinds.includes(nextKind) ? nextKind : 'inline'

    const switcherKinds =
      validKinds.map((v) => {
        return {
          value: v,
          label: v[0].toUpperCase() + v.slice(1),
        }
      }) || []

    return { editorKind: editorKind, values: switcherKinds }
  })
}

/**
 * @param {object} props
 * @param {RemoteResource} props.resource
 * @param {string} props.key - force the different editors to set-up/tear-down correctly
 * @param {any} props.additionalButtons
 */
function EditorSelection(props) {
  const [state, send] = RemoteResourcesContext.useActor()
  const { globalConfig } = useContext(GlobalContext)
  const { editorKind } = useEditorKinds()
  const originalContents = props.resource.current.contents
  const lastValue = state.context.currentResource?.lastValue || ''
  const [model] = useState(() => monaco.editor.createModel(lastValue, 'application/json'))

  const savingChanges = state.matches(['showing editor', 'editing', 'saving edited'])
  const hasEdits = state.matches(['showing editor', 'editing', 'editor has edited content'])
  const contentIsInvalid = state.matches(['showing editor', 'contentErrors', 'some'])

  const onErrors = useCallback(
    /**
     * @param {ContentError[]} errors
     */
    (errors) => {
      if (errors.length === 0) {
        send({ type: 'content is valid' })
      } else {
        send({ type: 'content is invalid', errors })
      }
    },
    [send],
  )

  /**
   * @param {string} content
   */
  const onContentChanged = useCallback(
    /**
     * @param {string} content
     */
    (content) => {
      send({ type: 'set current resource content', payload: content })
    },
    [send],
  )

  const editors = {
    toggles: () => (
      <TogglesEditor invalid={contentIsInvalid} edited={hasEdits} pending={savingChanges} resource={props.resource} />
    ),
    diff: () => {
      if (globalConfig.editor === 'simple') {
        return (
          <DiffViewer before={originalContents} after={model.getValue()} additionalButtons={props.additionalButtons} />
        )
      }
      return (
        <Suspense>
          <MonacoDiffEditor
            original={originalContents}
            edited={hasEdits}
            invalid={contentIsInvalid}
            pending={savingChanges}
            id={props.resource.id}
            additionalButtons={props.additionalButtons}
            onErrors={onErrors}
            onContentChanged={onContentChanged}
            lastValue={lastValue}
            contentType={props.resource.current.contentType}
          />
        </Suspense>
      )
    },
    inline: () => {
      if (globalConfig.editor === 'simple') {
        return (
          <TextEditor
            defaultValue={lastValue}
            lastValue={lastValue}
            key={props.resource.id}
            id={props.resource.id}
            onErrors={onErrors}
            onContentChanged={onContentChanged}
          />
        )
      }
      return (
        <Suspense>
          <MonacoEditor
            invalid={contentIsInvalid}
            edited={hasEdits}
            pending={savingChanges}
            id={props.resource.id}
            onErrors={onErrors}
            onContentChanged={onContentChanged}
            lastValue={lastValue}
            contentType={props.resource.current.contentType}
          />
        </Suspense>
      )
    },
    trackers: () => {
      return (
        <Suspense>
          <TrackersEditor
            invalid={contentIsInvalid}
            edited={hasEdits}
            pending={savingChanges}
            resource={props.resource}
          />
        </Suspense>
      )
    },
    patches: () => {
      if (globalConfig.editor === 'simple') return <p>Cannot show rich editor</p>
      return (
        <Suspense>
          <PatchesEditor
            model={model}
            pending={savingChanges}
            edited={hasEdits}
            invalid={contentIsInvalid}
            resource={props.resource}
            onErrors={onErrors}
          />
        </Suspense>
      )
    },
  }
  return editors[editorKind]?.()
}

/**
 * Errors that occur from the editor
 */
function InvalidEditorErrors(props) {
  const errors = RemoteResourcesContext.useSelector((state) => {
    const errorState = state.matches(['showing editor', 'contentErrors', 'some'])
    if (!errorState) return []
    return state.context.contentErrors || []
  })

  if (errors.length === 0) return null

  return (
    <FloatingErrors errors={errors}>
      <Button onClick={props.revert}>↩️ Revert</Button>
    </FloatingErrors>
  )
}

/**
 * Errors from communications with native sides
 * @param {object} props
 * @param {() => void} props.dismiss
 */
function SavingErrors(props) {
  const error = RemoteResourcesContext.useSelector((state) => {
    const errorState = state.matches(['showing editor', 'errors', 'some'])
    if (!errorState) return null
    const error = state.context.error
    invariant(typeof error === 'string', 'at this point, error must be a string')
    return error
  })

  if (error === null) return null

  return (
    <FloatingErrors errors={[{ message: error }]}>
      <Button onClick={props.dismiss}>↩️ Dismiss</Button>
    </FloatingErrors>
  )
}

/**
 * @param {object} props
 * @param {import("react").ReactNode} props.children
 * @param {{message: string}[]} props.errors
 */
function FloatingErrors(props) {
  return (
    <div className="row error floating" data-testid="FloatingErrors">
      <div className="font-bold">
        {props.errors.length} error{props.errors.length === 1 ? '' : 's'} occurred.{' '}
      </div>
      {props.errors.slice(0, 3).map((m, index) => {
        return (
          <div key={m.message + index} className="row">
            {m.message}
          </div>
        )
      })}
      <div className="row">{props.children}</div>
    </div>
  )
}
