import { parse } from 'tldts'
import { useTrackerFeed } from './tracker-feed.machine'

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
  // console.log('-> feed state', state.context.domain)
  // console.log('-> feed requests', state.context)
  // const current = state.context.currentDomain || ''
  return (
    <>
      {state.matches(['subscribing']) && (
        <table style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th className="p-4 text-left text-sm">Tracker url</th>
              <th className="p-4 text-left text-sm" style={{ width: '20%' }}>
                State
              </th>
              <th className="p-4 text-left text-sm" style={{ width: '15%' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {state.context.requests.map((req) => {
              const url = new URL(req.url)
              const blocked = 'blocked' in req.state
              const params = new URLSearchParams(url.searchParams)
              return (
                <tr style={{ background: blocked ? 'rgb(255, 204, 204)' : 'white' }} key={req.url}>
                  <td className="px-4" style={{ overflow: 'hidden' }}>
                    <small>
                      <code>{req.url}</code>
                    </small>
                  </td>
                  <td className="px-4">
                    <small>
                      <code>{blocked ? 'blocked' : req.state.allowed.reason}</code>
                    </small>
                  </td>
                  <td className="px-4">{blocked && <button>Allow</button>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}
