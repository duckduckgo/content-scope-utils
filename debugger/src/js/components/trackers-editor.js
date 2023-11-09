import { CurrentDomainManagement } from '../remote-resources/components/current-domain-management'
import styles from './trackers-editor.module.css'
import { TrackerFeed } from '../remote-resources/components/tracker-feed'

/**
 * @typedef {import('../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 * @typedef {import('../types').TabWithHostname} TabWithHostname
 * @typedef {import('react').ReactNode} ReactNode
 */

/**
 * @param {object} props
 * @param {boolean} props.pending
 * @param {boolean} props.edited
 * @param {boolean} props.invalid
 * @param {RemoteResource} props.resource
 */
export function TrackersEditor(props) {
  return (
    <div data-testid="TogglesEditor">
      {/*<div className="row">{components[props.toggleKind](props)}</div>*/}
      <CurrentDomainManagement {...props} />
      <div className={styles.trackersGrid}>
        <div className={styles.trackerFeed}>
          <TrackerFeed {...props} />
        </div>
      </div>
    </div>
  )
}
