import { useEditorKinds } from './remote-resource-editor'
import styles from './sidebar.module.css'
import { RemoteResourcesContext } from '../remote-resources.page'

export function Sidebar() {
  const { editorKind, values } = useEditorKinds()
  const actor = RemoteResourcesContext.useActorRef()
  /** @type {(kind: import('./remote-resource-state').EditorKind) => void} */
  const setEditorKind = (kind) => actor.send({ type: 'set editor kind', payload: kind })
  return (
    <div>
      <ul className={styles.sidebar}>
        {values.map((value) => {
          return (
            <li key={value.value}>
              <button
                onClick={() => setEditorKind(/** @type {any} */ (value.value))}
                className={styles.link}
                data-state={value.value === editorKind ? 'active' : 'inactive'}
              >
                {value.label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
