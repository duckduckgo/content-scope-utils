import jsonpatch from 'fast-json-patch'
import { DD, DT, InlineDL } from './definition-list'
import { createPortal } from 'react-dom'
import { Button } from './buttons'

export function DiffViewer(props) {
  const before = JSON.parse(props.before)
  const after = JSON.parse(props.after)
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
