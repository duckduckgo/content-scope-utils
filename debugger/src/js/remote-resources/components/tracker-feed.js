import { parse } from 'tldts'
import invariant from 'tiny-invariant'
import { MicroButton } from '../../components/buttons'
import { DD, DT, InlineDL } from '../../components/definition-list'
import styles from './tracker-feed.module.css'
import classnames from 'classnames'
import { useTrackerFeed } from './tracker-feed.machine.react'
import { TrackerFeedManual } from './tracker-feed-manual'
import { RemoteResourcesContext } from '../remote-resources.page'

// @ts-expect-error - debugging;
window._parse = parse

/**
 * @typedef {import('../../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../../schema/__generated__/schema.types').Tab} Tab
 * @typedef {import('../../types').TabWithHostname} TabWithHostname
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('./toggle-list').ToggleListItem} ToggleListItem
 * @typedef {import('../../transforms.types').ApplyTarget} ApplyTarget
 */

/**
 * @param {object} props
 * @param {RemoteResource} props.resource
 */
export function TrackerFeed(props) {
  const [state, send] = useTrackerFeed()
  const actor = RemoteResourcesContext.useActorRef()

  /**
   * @param {string} trackerUrl
   * @param {import('../../transforms.types').ApplyTarget[]} applyTo
   */
  async function toggleTrackerUrl(trackerUrl, applyTo) {
    actor.send({
      type: 'PrivacyConfig.toggleAllowlistedTracker',
      payload: {
        trackerUrl: trackerUrl,
        applyTo: applyTo,
        opts: {
          includePath: true,
        },
      },
    })
  }

  /**
   * @param {string} trackerUrl
   * @param {import('../../transforms.types').ApplyTarget[]} applyTo
   */
  async function toggleDomain(trackerUrl, applyTo) {
    actor.send({
      type: 'PrivacyConfig.toggleAllowlistedTracker',
      payload: {
        trackerUrl: trackerUrl,
        applyTo: applyTo,
        opts: {
          includePath: false,
        },
      },
    })
  }

  function refresh() {
    send({ type: 'refresh' })
  }

  return (
    <>
      <div className="row">
        <TrackerFeedManual resource={props.resource} toggleDomain={toggleDomain} toggleTrackerUrl={toggleTrackerUrl} />
      </div>
      {state.matches(['subscribing']) && state.context.requests.length > 0 && (
        <FeedTable refresh={refresh} toggleDomain={toggleDomain} toggleTrackerUrl={toggleTrackerUrl} />
      )}
      {state.matches(['waiting for domain selection']) && (
        <p className="row">Trackers will show here once you subscribe to a domain</p>
      )}
      {state.matches(['subscribing']) && state.context.requests.length === 0 && (
        <p className="row">Subscribing to {state.context.domain}, but no requests were seen yet</p>
      )}
    </>
  )
}

/**
 * @param {object} props
 * @param {() => void} props.refresh
 * @param {(url: string, applyTo: ApplyTarget[]) => void} props.toggleTrackerUrl
 * @param {(url: string, applyTo: ApplyTarget[]) => void} props.toggleDomain
 */
function FeedTable(props) {
  const [state] = useTrackerFeed()
  const currentDomain = state.context.domain
  invariant(typeof currentDomain === 'string', 'must have current domain at this point')
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className="p-4 text-left text-sm">
            <InlineDL>
              <DT>Tracker urls</DT>
              <DD>
                {state.context.requests.length > 0 ? (
                  <MicroButton onClick={props.refresh}>Reset data</MicroButton>
                ) : null}
              </DD>
            </InlineDL>
          </th>
          <th className="p-4 text-left text-sm" style={{ width: '20%' }}>
            State
          </th>
          <th className="p-4 text-left text-sm" style={{ width: '20%' }}>
            Allowlist
          </th>
        </tr>
      </thead>
      <tbody>
        {state.context.requests.map((req) => {
          const blocked = 'blocked' in req.state
          let rowstate = blocked ? 'blocked' : 'allowed'
          return (
            <tr className={styles.row} data-state={rowstate} key={req.url}>
              <td className={classnames('px-4', styles.urlCell)}>
                <small className={styles.trackerUrl}>
                  <code>{req.url}</code>
                </small>
                <small className={styles.pageUrl}>
                  <code>{req.pageUrl}</code>
                </small>
              </td>
              <td className="px-4">
                <small>
                  <code>{blocked ? 'blocked' : 'allowed' in req.state ? req.state.allowed.reason : null}</code>
                </small>
              </td>
              <td className="px-4">
                {/*{allowlisted && <MicroButton onClick={() => toggleTrackerUrl(req.url)}>Remove</MicroButton>}*/}
                {blocked && (
                  <div className="flex">
                    <MicroButton
                      onClick={() => props.toggleTrackerUrl(req.url, [{ domain: currentDomain }])}
                      title={'haha'}
                    >
                      + url
                    </MicroButton>
                    <MicroButton onClick={() => props.toggleDomain(req.url, [{ domain: currentDomain }])}>
                      + domain
                    </MicroButton>
                  </div>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
