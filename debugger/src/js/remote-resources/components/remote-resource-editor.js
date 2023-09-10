import { RemoteResourcesContext } from '../remote-resources.page'
import { RemoteResourceState } from './remote-resource-state'
import invariant from 'tiny-invariant'
import { TogglesEditor } from '../../components/toggles-editor'
import styles from '../../app/components/app.module.css'
import { SubNav } from '../../app/components/feature-nav'
import { lazy, Suspense, useContext, useRef } from 'react'
import { Button } from '../../components/buttons'
import { Sidebar } from './sidebar'
import { TextModelContext } from '../../models/text-model'
import { DiffViewer } from '../../components/diff-viewer'
import { TextEditor } from './text-editor'

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
 * @param {TextModel} props.model
 * @param {SubNavItem[]} props.nav
 */
export function RemoteResourceEditor(props) {
  const actor = RemoteResourcesContext.useActorRef()

  /** @type {(kind: EditorKind) => void} */
  const revertEdited = () => props.model.setValue(props.resource.current.contents)

  /** this is used to allow editors to participate in the footer (eg: adding extra buttons) */
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

          <RemoteResourceState resource={props.resource} model={props.model} />
        </div>

        <div className={styles.sidebar}>
          <div className={styles.inner}>
            <Sidebar />
          </div>
        </div>

        <div className={styles.mainContent}>
          <EditorSelection
            model={props.model}
            resource={props.resource}
            additionalButtons={additionalButtons.current}
          />
        </div>
      </main>
      <footer className={styles.appFooter}>
        <Footer additionalButtons={additionalButtons} resource={props.resource} model={props.model} />
      </footer>
    </>
  )
}

/**
 * @param {object} props
 * @param {RemoteResource} props.resource
 * @param {any} props.additionalButtons
 * @param {TextModel} props.model
 */
function Footer(props) {
  const [state, send] = RemoteResourcesContext.useActor()

  /** @type {(kind: EditorKind) => void} */
  const setEditorKind = (kind) => send({ type: 'set editor kind', payload: kind })
  const revertEdited = () => props.model.setValue(props.resource.current.contents)

  // get the current editor kind + all available ones
  const { editorKind, values } = useEditorKinds()

  function saveDebugContent() {
    send({
      type: 'RemoteResource.setDebugContent',
      id: props.resource.id,
      content: props.model.getValue(),
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
    <div className="flex column-gap">
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
 * @param {any} props.additionalButtons
 * @param {TextModel} props.model
 */
function EditorSelection(props) {
  const [state, send] = RemoteResourcesContext.useActor()
  const { editorType } = useContext(TextModelContext)
  const { editorKind } = useEditorKinds()
  const originalContents = props.resource.current.contents

  const savingChanges = state.matches(['showing editor', 'editing', 'saving edited'])
  const hasEdits = state.matches(['showing editor', 'editing', 'editor has edited content'])
  const contentIsInvalid = state.matches(['showing editor', 'contentErrors', 'some'])

  /**
   * @param {ContentError[]} errors
   */
  function onErrors(errors) {
    if (errors.length === 0) {
      send({ type: 'content is valid' })
    } else {
      send({ type: 'content is invalid', errors })
    }
  }

  const editors = {
    toggles: () => (
      <TogglesEditor
        model={props.model}
        invalid={contentIsInvalid}
        edited={hasEdits}
        pending={savingChanges}
        resource={props.resource}
      />
    ),
    diff: () => {
      if (editorType === 'web') {
        return (
          <DiffViewer
            before={originalContents}
            after={props.model.getValue()}
            additionalButtons={props.additionalButtons}
          />
        )
      }
      return (
        <Suspense>
          <MonacoDiffEditor
            model={props.model}
            original={originalContents}
            edited={hasEdits}
            invalid={contentIsInvalid}
            pending={savingChanges}
            id={props.resource.id}
            additionalButtons={props.additionalButtons}
            onErrors={onErrors}
          />
        </Suspense>
      )
    },
    inline: () => {
      if (editorType === 'web') return <TextEditor model={props.model} resource={props.resource} onErrors={onErrors} />
      return (
        <Suspense>
          <MonacoEditor
            model={/** @type {import("monaco-editor").editor.ITextModel} */ (props.model)}
            invalid={contentIsInvalid}
            edited={hasEdits}
            pending={savingChanges}
            id={props.resource.id}
            onErrors={onErrors}
          />
        </Suspense>
      )
    },
    patches: () => {
      if (editorType === 'web') return <p>Cannot show rich editor</p>
      return (
        <Suspense>
          <PatchesEditor
            model={props.model}
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
    <div className="row error floating">
      <div className="font-bold">
        {props.errors.length} error{props.errors.length === 1 ? '' : 's'} occurred.{' '}
      </div>
      {props.errors.slice(0, 3).map((m) => {
        return (
          <div key={m.message} className="row">
            {m.message}
          </div>
        )
      })}
      <div className="row">{props.children}</div>
    </div>
  )
}
