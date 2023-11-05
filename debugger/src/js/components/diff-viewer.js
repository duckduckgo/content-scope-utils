import { createPortal } from 'react-dom'
import jsonpatch from 'fast-json-patch'
import { DD, DT, InlineDL } from './definition-list'
import { Button } from './buttons'

/**
 * @param {object} props
 * @param {string} props.original
 * @param {string} props.lastValue
 * @param {string} props.contentType
 * @param {string} props.id
 * @param {any} [props.additionalButtons]
 */
export function DiffViewer(props) {
  if (props.contentType !== 'application/json') {
    return <p>Content type not supported yet. Swap to monaco editor</p>
  }

  const before = JSON.parse(props.original)
  const after = JSON.parse(props.lastValue)
  const patches = jsonpatch.compare(before, after)

  const portal = (
    <>
      <Button onClick={scrollTo}>First diff</Button>
    </>
  )

  return (
    <div>
      {props.additionalButtons ? createPortal(portal, props.additionalButtons) : null}
      {patches.length === 0 && <p>No changes</p>}
      {patches.map((p) => {
        return <DiffCard patch={p} key={p.path + p.op} />
      })}
    </div>
  )
}

function DiffCard(props) {
  return (
    <div className="card row">
      <div>
        <InlineDL>
          <DT>JSON Pointer</DT>
          <DD>
            <code>{props.patch.path}</code>
          </DD>
        </InlineDL>
        <pre className="row">
          <code>{JSON.stringify(props.patch, null, 2)}</code>
        </pre>
      </div>
    </div>
  )
}
