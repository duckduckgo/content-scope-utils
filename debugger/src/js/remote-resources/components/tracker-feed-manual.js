import { parse } from 'tldts'
import { MicroButton } from '../../components/buttons'
import { DD, DT, InlineDL } from '../../components/definition-list'
import styles from './tracker-feed.module.css'
import { useTrackerFeed } from './tracker-feed.machine.react'
import { URLEditor } from '../../components/url-editor'
import { extractUrls } from '../../transforms'

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
 * @param {(url: string, applyTo: ApplyTarget[]) => void} props.toggleTrackerUrl
 * @param {(url: string, applyTo: ApplyTarget[]) => void} props.toggleDomain
 */
export function TrackerFeedManual(props) {
  // some local state not stored in xstate (yet)
  const [state, send] = useTrackerFeed()

  function add(input) {
    const { unique } = extractUrls(input)
    const asEntries = unique.map((url) => {
      return {
        requestUrl: url.href,
      }
    })
    send({
      type: 'add match-all entries',
      payload: asEntries,
    })
  }

  function resetManualEntries() {
    send({ type: 'reset manual entries' })
  }

  /**
   * @param {import('./tracker-feed.types').UrlRequestEntry[]} entries
   */
  function removeManualEntries(entries) {
    send({ type: 'delete manual entries', payload: entries })
  }

  return (
    <>
      <div className="card">
        <URLEditor
          label={'Paste URLs here:'}
          save={function (e) {
            e.preventDefault()
            const fd = new FormData(/** @type {HTMLFormElement} */ (e.target))
            const domain = /** @type {string} */ (fd.get('domain'))
            add(domain)
            // throw new Error('Function not implemented.')
          }}
          pending={false}
          cancel={undefined}
          input={({ className }) => {
            return (
              <input
                placeholder="paste any text, urls will be extracted"
                className={className}
                name="domain"
                autoFocus={true}
              />
            )
          }}
        />
      </div>
      {state.context.manualEntries.length > 0 && (
        <ManualEntryTable
          refresh={resetManualEntries}
          toggleDomain={props.toggleDomain}
          toggleTrackerUrl={props.toggleTrackerUrl}
          removeManualEntries={removeManualEntries}
        />
      )}
    </>
  )
}

/**
 * @param {object} props
 * @param {() => void} props.refresh
 * @param {(url: string, applyTo: ApplyTarget[]) => void} props.toggleTrackerUrl
 * @param {(url: string, applyTo: ApplyTarget[]) => void} props.toggleDomain
 * @param {(entries: import('./tracker-feed.types').UrlRequestEntry[]) => void} props.removeManualEntries
 */
function ManualEntryTable(props) {
  const [state] = useTrackerFeed()
  const domain = state.context.domain
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className="text-left text-sm">
            <InlineDL>
              <DT>Manually Added urls</DT>
              <DD>
                {state.context.manualEntries.length > 0 ? (
                  <MicroButton onClick={props.refresh}>Reset data</MicroButton>
                ) : null}
              </DD>
            </InlineDL>
          </th>
          <th className="p-4 text-left text-sm" style={{ width: '20%' }}>
            All Domains
          </th>
          {domain && (
            <th className="p-4 text-left text-sm" style={{ width: '20%' }}>
              <code>{domain}</code>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {state.context.manualEntries.map((req) => {
          const url = req.requestUrl
          const parsed = new URL(url)
          const canAddPath = parsed.pathname && parsed.pathname !== '/'
          return (
            <tr className={styles.row} key={url}>
              <td className={styles.urlCell}>
                <small className={styles.trackerUrl}>
                  <MicroButton onClick={() => props.removeManualEntries([req])} title={`remove domain only for <all>`}>
                    remove
                  </MicroButton>
                  <code>{url}</code>
                </small>
              </td>
              <td className="px-4">
                <div className="flex">
                  {canAddPath && (
                    <MicroButton
                      onClick={() => props.toggleTrackerUrl(url, [{ all: true }])}
                      title={`${url} for <all>`}
                    >
                      + full
                    </MicroButton>
                  )}
                  <MicroButton onClick={() => props.toggleDomain(url, [{ all: true }])} title={`domain only for <all>`}>
                    + domain
                  </MicroButton>
                </div>
              </td>
              {domain && (
                <td className="px-4">
                  <div className="flex">
                    {canAddPath && (
                      <MicroButton
                        onClick={() => props.toggleTrackerUrl(url, [{ domain }])}
                        title={`${url} for ${domain}`}
                      >
                        + full
                      </MicroButton>
                    )}
                    <MicroButton
                      onClick={() => props.toggleDomain(url, [{ domain }])}
                      title={`domain only for ${domain}`}
                    >
                      + domain
                    </MicroButton>
                  </div>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
