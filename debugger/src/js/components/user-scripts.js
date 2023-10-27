import styles from '../app/components/app.module.css'

export function UserScripts() {
  const scripts = []
  return (
    <div className={styles.empty}>
      <div className="row">
        <ul className="subnav">
          {scripts.map((res) => {
            return (
              <li key={res.name}>
                <a href="" className="subnav__link" data-active={res.active}>
                  {res.name}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
      <div>
        <pre>
          <code>{JSON.stringify(scripts, null, 2)}</code>
        </pre>
      </div>
    </div>
  )
}

export default UserScripts
