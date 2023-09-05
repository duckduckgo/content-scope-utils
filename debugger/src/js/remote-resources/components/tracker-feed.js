import { parse } from 'tldts'
import { useTrackerFeed } from './tracker-feed.machine'
import { handler } from '../../transforms'
import invariant from 'tiny-invariant'
import { MicroButton } from '../../components/buttons'
import { DD, DT, InlineDL } from '../../components/definition-list'
import styles from './tracker-feed.module.css'
import classnames from 'classnames'

// @ts-expect-error - debugging;
window._parse = parse

/**
 * @typedef {import('../../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../../schema/__generated__/schema.types').Tab} Tab
 * @typedef {import('../../types').TabWithHostname} TabWithHostname
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('../../models/text-model').TextModel} TextModel
 * @typedef {import('./toggle-list').ToggleListItem} ToggleListItem
 */

/**
 * @param {object} props
 * @param {TextModel} props.model
 * @param {RemoteResource} props.resource
 */
export function TrackerFeed(props) {
  // some local state not stored in xstate (yet)
  const [state, send] = useTrackerFeed()

  function toggleTrackerUrl(trackerUrl) {
    invariant(typeof state.context.domain === 'string', 'state.context.domain should be a string here')
    const parsed = JSON.parse(props.model.getValue())
    const result = handler(parsed, {
      kind: 'PrivacyConfig.toggleAllowlistedTrackerUrl',
      trackerUrl: trackerUrl,
      domains: [state.context.domain],
    })
    if (result.ok) {
      const asString = JSON.stringify(result.success, null, 4)
      props.model.setValue(asString)
    } else {
      console.log(result.error)
      alert('allow failed..., check console')
    }
  }

  /**
   * @param {string} trackerUrl
   */
  function toggleDomain(trackerUrl) {
    invariant(typeof state.context.domain === 'string', 'state.context.domain should be a string here')
    const parsed = JSON.parse(props.model.getValue())
    const result = handler(parsed, {
      kind: 'PrivacyConfig.toggleAllowlistedTrackerDomain',
      trackerUrl: trackerUrl,
      domains: [state.context.domain],
    })
    if (result.ok) {
      const asString = JSON.stringify(result.success, null, 4)
      props.model.setValue(asString)
    } else {
      console.log(result.error)
      alert('allow failed..., check console')
    }
  }

  function refresh() {
    send({ type: 'refresh' })
  }

  return (
    <>
      {state.matches(['waiting for domain selection']) && (
        <p className="row">Trackers will show here once you subscribe to a domain</p>
      )}
      {state.matches(['subscribing']) && state.context.requests.length === 0 && (
        <>
          <p className="row">Subscribing to {state.context.domain}, but no requests were seen yet</p>
        </>
      )}
      {state.matches(['subscribing']) && state.context.requests.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className="p-4 text-left text-sm">
                <InlineDL>
                  <DT>Tracker urls</DT>
                  <DD>
                    {state.context.requests.length > 0 ? <MicroButton onClick={refresh}>Reset data</MicroButton> : null}
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
              // const url = new URL(req.url)
              // const params = new URLSearchParams(url.searchParams)
              // const allowlisted =
              //   !blocked && state.context.domain && isAllowlisted(parsedConfig, req.url, state.context.domain)
              // const partiallyAllowlisted =
              //   state.context.domain && isAllowlisted(parsedConfig, req.url, state.context.domain)
              // const canBeAllowlisted = blocked && !partiallyAllowlisted
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
                        <MicroButton onClick={() => toggleTrackerUrl(req.url)}>+ tracker</MicroButton>
                        <MicroButton onClick={() => toggleDomain(req.url)}>+ domain</MicroButton>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}
