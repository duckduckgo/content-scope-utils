import styles from './nav-row.module.css'

/**
 * @param {object} props
 * @param {import("react").ReactNode} props.children
 */
export function NavRow(props) {
  return <div className={styles.root}>{props.children}</div>
}
