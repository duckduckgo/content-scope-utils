import { IconButton } from '../../components/buttons'
import { createMachine } from 'xstate'
import { useMachine } from '@xstate/react'

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
            d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
          />
        </svg>
        <span>URLS</span>
      </IconButton>
    </div>
  )
}

const machine = createMachine(
  {
    id: 'extras',
    initial: 'idle',
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
          console.log('teardown...')
          document.removeEventListener('keyup', handler)
        }
      },
    },
  },
)

export function ExtrasContent() {
  const [state, send] = useMachine(machine, { devTools: true })
  const isOpen = state.matches('showing')
  return (
    <>
      <ExtrasLink onClick={() => send({ type: 'show' })} />
      <dialog open={isOpen} onClose={() => send({ type: 'hide' })}>
        <div>
          <button onClick={() => send({ type: 'hide' })}>Close</button>
          <p>Extras</p>
        </div>
      </dialog>
    </>
  )
}
