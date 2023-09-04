import { parse } from 'tldts'
import { useTrackerFeed } from './tracker-feed.machine'
import { handler, isAllowlisted } from '../../transforms'
import invariant from 'tiny-invariant'
import { MicroButton } from '../../components/buttons'
import { DD, DT, InlineDL } from '../../components/definition-list'
import { useEffect, useState } from 'react'
import styles from './tracker-feed.module.css'
import { RemoteResourcesContext } from '../remote-resources.page'

// @ts-expect-error - debugging;
window._parse = parse

/**
 * @typedef {import('../../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../../schema/__generated__/schema.types').Tab} Tab
 * @typedef {import('../../types').TabWithHostname} TabWithHostname
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('./toggle-list').ToggleListItem} ToggleListItem
 */

/**
 * @param {object} props
 * @param {import('monaco-editor').editor.ITextModel} props.model
 * @param {RemoteResource} props.resource
 */
export function TrackerFeed(props) {
  // some local state not stored in xstate (yet)
  const [state, send] = useTrackerFeed()
  const key = RemoteResourcesContext.useSelector((state) => {
    return state.context.resourceKey
  })
  // console.log('-> feed state', state.context.domain)
  // console.log('-> feed requests', state.context)
  // const current = state.context.currentDomain || ''
  const [parsedConfig, setParsedConfig] = useState(() => JSON.parse(props.model.getValue()))

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

  useEffect(() => {
    const sub = props.model.onDidChangeContent((v) => {
      setParsedConfig(JSON.parse(props.model.getValue()))
    })
    return () => {
      sub.dispose()
    }
  }, [props.model])

  // useEffect(() => {
  //   send({ type: 'refresh' })
  // }, [key])

  function refresh() {
    send({ type: 'refresh' })
  }

  return (
    <>
      <table style={{ tableLayout: 'fixed', width: '100%' }} key={key}>
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
            const url = new URL(req.url)
            const blocked = 'blocked' in req.state
            const params = new URLSearchParams(url.searchParams)
            const allowlisted =
              !blocked && state.context.domain && isAllowlisted(parsedConfig, req.url, state.context.domain)
            const partiallyAllowlisted =
              state.context.domain && isAllowlisted(parsedConfig, req.url, state.context.domain)
            const canBeAllowlisted = blocked && !partiallyAllowlisted
            let rowstate = blocked ? 'blocked' : 'allowed'
            if (blocked && partiallyAllowlisted) {
              rowstate = 'partially-allowlisted'
            }
            return (
              <tr className={styles.row} data-state={rowstate} key={req.url}>
                <td className="px-4" style={{ position: 'relative', overflow: 'auto', whiteSpace: 'nowrap' }}>
                  <small>
                    <code>{req.url}</code>
                  </small>
                </td>
                <td className="px-4">
                  <small>
                    <code>{blocked ? 'blocked' : req.state.allowed.reason}</code>
                  </small>
                </td>
                <td className="px-4">
                  {allowlisted && <MicroButton onClick={() => toggleTrackerUrl(req.url)}>Remove</MicroButton>}
                  {canBeAllowlisted && (
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
    </>
  )
}
