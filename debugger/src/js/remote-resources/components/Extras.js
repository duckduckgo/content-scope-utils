import { IconButton } from '../../components/buttons'
import { createMachine } from 'xstate'
import { useMachine } from '@xstate/react'
import { RemoteResourcesContext } from '../remote-resources.page'

/**
 * @param {object} props
 * @param {()=>void} props.onClick
 */
export function ExtrasLink(props) {
  return (
    <div style={{ marginLeft: 'auto' }}>
      <IconButton onClick={props.onClick}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
        <span>Info</span>
      </IconButton>
    </div>
  )
}

const machine = createMachine(
  {
    id: 'extras',
    initial: 'idle',
    context: {
      /** @type {import('../../../../schema/__generated__/schema.types').ResourceServerAddress[]} */
      addresses: [],
      /** @type {{id: string; contentType: string; size: number}[]} */
      resources: [],
    },
    states: {
      idle: {
        on: { show: 'showing' },
      },
      showing: {
        invoke: { src: 'esc', id: 'esc' },
        on: {
          hide: 'idle',
        },
      },
    },
    preserveActionOrder: true,
    predictableActionArguments: true,
    strict: true,
  },
  {
    services: {
      esc: () => (send) => {
        const handler = (e) => {
          if (e.key === 'Escape') send({ type: 'hide' })
        }
        document.addEventListener('keyup', handler)
        return () => {
          document.removeEventListener('keyup', handler)
        }
      },
    },
  },
)

export function ExtrasContent() {
  const { addresses, resources } = RemoteResourcesContext.useSelector((rr) => {
    return {
      addresses: rr.context.resourceServerAddresses,
      resources: (rr.context.resources || []).map((r) => {
        return {
          id: r.id,
          contentType: r.current.contentType,
          size: r.current.contents.length,
        }
      }),
    }
  })
  const [state, send] = useMachine(
    () =>
      machine.withContext({
        addresses,
        resources,
      }),
    { devTools: true },
  )
  const isOpen = state.matches('showing')
  return (
    <>
      <ExtrasLink onClick={() => send({ type: 'show' })} />
      <dialog open={isOpen} onClose={() => send({ type: 'hide' })}>
        <div>
          <button onClick={() => send({ type: 'hide' })}>Close</button>
        </div>
        <ul>
          {resources.map((resource) => {
            const characterCount = resource.size
            const byteCount = characterCount * 2
            const kilobytes = Math.ceil(byteCount / 1024)
            return (
              <li key={resource.id}>
                <p>
                  <strong>{resource.id}</strong>{' '}
                  <small>
                    {resource.contentType} ({kilobytes}kb)
                  </small>
                </p>
                <ul>
                  {addresses.map((address) => {
                    const next = new URL('/rr/' + resource.id, address.baseURL)
                    const url = next.toString()
                    return (
                      <li key={address.baseURL}>
                        <a href={url} target={'_blank'} rel={'noopener noreferrer'}>
                          {url}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      </dialog>
    </>
  )
}
