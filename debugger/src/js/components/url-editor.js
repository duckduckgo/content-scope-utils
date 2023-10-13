import styles from './url-editor.module.css'
/**
 * @param {object} props
 * @param {(evt: any) => void} props.save
 * @param {boolean} props.pending
 * @param {string} [props.label]
 * @param {() => void} [props.cancel]
 * @param {(args: { className: string }) => import("react").ReactNode} props.input
 */
export function URLEditor(props) {
  const { label = 'New' } = props

  function onKeyUp(e) {
    if (e.code === 'Escape') {
      props.cancel?.()
    }
  }

  return (
    <form className="font-mono text-xs" onSubmit={props.save} onKeyUp={onKeyUp}>
      <label className={styles.label}>
        <span className={styles.text}>{label} </span>
        <div className={styles.control}>
          {props.input({ className: 'flex-1' })}
          <button className={styles.button} type="submit">
            {props.pending ? 'Saving...' : 'Save'}
          </button>
          {props.cancel && (
            <button className={styles.button} type="button" onClick={props.cancel}>
              Cancel
            </button>
          )}
        </div>
      </label>
    </form>
  )
}
