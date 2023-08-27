import styles from './app/components/app.module.css'

export function NotFound() {
  return (
    <main className={styles.appMain}>
      <div className="row">
        <p>Not found. Try a link from the top</p>
      </div>
    </main>
  )
}

export default NotFound
