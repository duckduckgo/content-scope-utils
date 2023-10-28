import jsonpatch from 'fast-json-patch'
import * as monaco from 'monaco-editor'
import useConstant from '@xstate/react/es/useConstant'
import { DD, DT, InlineDL } from './definition-list'
import { MicroButton } from './buttons'
import { useEffect } from 'react'
import { MonacoEditorRaw } from './monaco-editor'
import styles from './patches-editor.module.css'
import { Uri } from 'monaco-editor'

/**
 * @typedef {import('../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 * @typedef {import('../types').TabWithHostname} TabWithHostname
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('react').ReactNode} ReactNode
 * @typedef {import('../models/text-model').TextModel} TextModel
 * @typedef {import('../remote-resources/remote-resources.machine.types').ContentError} ContentError
 *
 */

/**
 * @typedef ToggleComponentProps
 * @property {ITextModel} model
 */

/**
 * @param {object} props
 * @param {TextModel} props.model
 * @param {boolean} props.pending
 * @param {boolean} props.edited
 * @param {boolean} props.invalid
 * @param {(errors: ContentError[]) => void} props.onErrors
 * @param {RemoteResource} props.resource
 *
 * todo: fix this implementation
 */
export function PatchesEditor(props) {
  /**
   * Share a text model between the views
   * @type {monaco.editor.ITextModel}
   */
  const patchModel = useConstant(() => {
    const model = monaco.editor.createModel('[]', 'json', Uri.file('patches'))

    // @ts-expect-error - runtime testing
    window._patch_editor_value = () => model.getValue()
    // @ts-expect-error - runtime testing
    window._patch_editor_set_value = (value) => {
      model.setValue(value)
    }
    return model
  })

  useEffect(() => {
    const sub = patchModel.onDidChangeContent(() => {
      console.log('v->', patchModel.getValue())
    })
    return () => {
      sub.dispose()
    }
  }, [patchModel])

  function storeLocally() {
    localStorage.setItem('__unstable_patch_store_local_' + props.resource.id, patchModel.getValue())
  }

  function restoreFromLocal() {
    const item = localStorage.getItem('__unstable_patch_store_local_' + props.resource.id)
    if (item) {
      patchModel.setValue(item)
    }
  }

  function applyPatch() {
    const a = JSON.parse(props.resource.current.contents)
    const b = JSON.parse(patchModel.getValue())
    const next = jsonpatch.applyPatch(a, b).newDocument
    props.model.setValue(JSON.stringify(next, null, 4))
  }

  function generateFromDiff() {
    const input = JSON.parse(props.resource.current.contents)
    const current = JSON.parse(props.model.getValue())
    const diff = jsonpatch.compare(input, current)
    patchModel.setValue(JSON.stringify(diff, null, 4))
  }

  return (
    <div data-testid="PatchesEditor" className={styles.patchesGrid}>
      <div className={styles.patchesGridHeader}>
        <div className="card">
          <InlineDL>
            <DT>GENERATE</DT>
            <DD>
              <MicroButton className="ml-3.5" onClick={generateFromDiff}>
                from diff 🔀
              </MicroButton>
            </DD>
          </InlineDL>
          <InlineDL>
            <DT>STORAGE</DT>
            <DD>
              <MicroButton className="ml-3.5" onClick={storeLocally}>
                store patch locally 💿
              </MicroButton>
              <MicroButton className="ml-3.5" onClick={restoreFromLocal}>
                restore local ↪️
              </MicroButton>
              <MicroButton className="ml-3.5" onClick={applyPatch}>
                apply patch ✅
              </MicroButton>
            </DD>
          </InlineDL>
        </div>
      </div>
      <div className={styles.patchesGridBody}>
        <MonacoEditorRaw
          id="patches"
          model={patchModel}
          onErrors={(errors) => {
            console.log('todo: handle these errors', errors)
          }}
        />
      </div>
    </div>
  )
}

export default PatchesEditor
