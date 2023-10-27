import styles from './app/components/app.module.css'

export function NotFound() {
  return (
    <main className={styles.empty}>
      <div className="row">
        <p>Try a link from the top</p>
        <p>
          Or try the demo data set that's used in tests:{' '}
          <a href="/?platform=integration#/remoteResources">
            <code>?platform=integration#/remoteResources</code>
          </a>
        </p>
      </div>
    </main>
  )
}

export default NotFound
