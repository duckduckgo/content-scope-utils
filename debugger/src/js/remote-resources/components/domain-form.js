import { useDomainState } from '../domain-exceptions.machine'
import { useEffect } from 'react'
import { DD, DT, InlineDL } from '../../components/definition-list'
import { MicroButton } from '../../components/buttons'
import { URLEditor } from '../../components/url-editor'

/**
 * Helper for syncing state with domains
 * @param {object} props
 * @param {string[]} props.domains
 * @param {string} props.current
 * @param {(domain: string) => void} props.setCurrentDomain
 * @param {() => void} props.clearCurrentDomain
 */
export function DomainForm(props) {
  const { current, domains } = props

  const [state, send] = useDomainState({
    current,
    domains,
    setCurrentDomain: props.setCurrentDomain,
    clearCurrentDomain: props.clearCurrentDomain,
  })

  useEffect(() => {
    send({ type: 'DOMAINS', domains: props.domains, current })
  }, [current, props.domains, send])

  const currenInDomains = props.domains.find((x) => state.context.current === x)

  // show the editor when we are adding or editing
  const showingDomainEditor =
    state.matches(['current domain', 'editing domain']) || state.matches(['current domain', 'adding new domain'])

  function onSubmit(e) {
    e.preventDefault()
    const fd = new FormData(/** @type {HTMLFormElement} */ (e.target))
    const domain = /** @type {string} */ (fd.get('domain'))
    send({ type: 'SAVE_NEW', domain })
  }
  const cancel = () => send({ type: 'CANCEL' })

  return (
    <div data-testid="DomainForm">
      {/* <pre><code>{JSON.stringify({ value: state.value, context: state.context }, null, 2)}</code></pre> */}
      {state.matches(['current domain', 'idle']) && (
        <InlineDL>
          <DT>CURRENT DOMAIN:</DT>
          <DD>
            <span>NONE</span>
            <MicroButton className="ml-3.5" type="button" onClick={() => send({ type: 'ADD_NEW' })}>
              Add a domain
            </MicroButton>
          </DD>
        </InlineDL>
      )}
      {state.matches(['current domain', 'showing current domain']) && (
        <InlineDL>
          <DT>CURRENT DOMAIN:</DT>
          <DD data-testid="DomainForm.showing">
            <code>{state.context.current}</code>
            <MicroButton className="ml-3.5" onClick={() => send({ type: 'EDIT' })}>
              ✏️ Edit
            </MicroButton>
            <MicroButton className="ml-3.5" onClick={() => send({ type: 'ADD_NEW' })}>
              📄 New
            </MicroButton>
            <MicroButton className="ml-3.5" onClick={() => send({ type: 'CLEAR' })}>
              ❌ Remove
            </MicroButton>
          </DD>
        </InlineDL>
      )}
      {showingDomainEditor && (
        <URLEditor
          cancel={cancel}
          save={onSubmit}
          pending={false}
          input={({ className }) => {
            return (
              <input
                placeholder="enter a domain"
                className={className}
                name="domain"
                defaultValue={state.context.nextDefault}
                autoFocus={true}
              />
            )
          }}
        />
      )}
      {state.matches(['tab selector', 'single tab']) && (
        <div className="row">
          <InlineDL>
            <DT>
              <label htmlFor="only-open-tab">Use open tab domain:</label>
            </DT>
            <DD>
              <MicroButton
                onClick={() => send({ type: 'SELECT_TAB_DOMAIN', domain: state.context.domains[0] })}
                id="only-open-tab"
              >
                {state.context.domains[0]}
              </MicroButton>
            </DD>
          </InlineDL>
        </div>
      )}
      {state.matches(['tab selector', 'multi tabs']) && (
        <div className="row">
          <InlineDL>
            <DT>
              <label htmlFor="tab-select"></label>Select from an open tab:
            </DT>
            <DD>
              <select
                name="tab-select"
                id="tab-select"
                onChange={(e) => send({ type: 'SELECT_TAB_DOMAIN', domain: e.target.value })}
                value={currenInDomains ? state.context.current : 'none'}
              >
                <option disabled value="none">
                  Select from tabs
                </option>
                {state.context.domains.map((tab) => {
                  return (
                    <option key={tab} value={tab}>
                      {tab}
                    </option>
                  )
                })}
              </select>
            </DD>
          </InlineDL>
        </div>
      )}
    </div>
  )
}
