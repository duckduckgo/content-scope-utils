import * as z from 'zod'
import { remoteResourceSchema } from '../../../../schema/__generated__/schema.parsers.mjs'
import { RemoteResourcesContext } from '../remote-resources.page'
import { RemoteResourceEditor } from './remote-resource-editor'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CurrentResource } from '../remote-resources.machine'
import invariant from 'tiny-invariant'
import { TextModelContext } from '../../models/text-model'

/**
 * @typedef {import('@duckduckgo/content-scope-scripts/packages/messaging/index.js').MessagingTransport} MessagingTransport
 * @typedef {import('../../../../schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('../../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 * @typedef {import('../../models/text-model').TextModel} TextModel
 */

export function RemoteResources() {
  const { createTextModel } = useContext(TextModelContext)
  const [state, send] = RemoteResourcesContext.useActor()
  const { resource, nav, currentResource } = RemoteResourcesContext.useSelector((state) => {
    const schema = z.object({
      currentResource: CurrentResource,
      resources: z.array(remoteResourceSchema),
    })

    const parsed = schema.parse(state.context)
    const match = parsed.resources.find((resource) => resource.id === parsed.currentResource.id)

    if (!match) throw new Error('unreachable, could not access ' + parsed.currentResource.id + ' in context')

    return {
      resource: match,
      currentResource: parsed.currentResource,
      nav: parsed.resources.map((r) => {
        return {
          name: r.name,
          id: r.id,
          active: state.context.currentResource?.id === r.id,
        }
      }),
    }
  })

  // const lastKnownValue = currentResource.lastValue
  // const [key, setKey] = useState(0)
  // const r = useRef()
  // const m = useRef()
  //
  // /**
  //  * Share a text model between the views
  //  * @type {TextModel}
  //  */
  // const sharedTextModel = useMemo(() => {
  //   invariant(typeof createTextModel === 'function', 'createTextModel required')
  //   m.current = createTextModel?.({ content: lastKnownValue, contentType: resource.current.contentType })
  //
  //   window._test_editor_value = () => m.current.getValue()
  //   window._test_editor_set_value = (value) => {
  //     m.current.setValue(value)
  //   }
  //
  //   r.current = m.current.onDidChangeContent(() => {
  //     if (m.current.getValue() !== lastKnownValue) {
  //       send({ type: 'content was edited' })
  //     } else {
  //       send({ type: 'content was reverted' })
  //     }
  //   })
  //
  //   return m.current
  // }, [lastKnownValue, createTextModel])
  //
  // useEffect(() => {
  //   setKey((prev) => prev + 1)
  // }, [sharedTextModel])
  //
  // useEffect(() => {
  //   console.log('updating...')
  //   m.current?.setValue(lastKnownValue)
  //   setKey((k) => k + 1)
  // }, [lastKnownValue])
  //
  // // ensure the monaco model stays in sync
  // // in xstate we update the `resourceKey` to indicate that the UI should consider
  // // the resource 'updated'
  //
  // // subscribe to the shared model and publish events back to xstate
  // useEffect(() => {
  //   // normally this logic would live inside xstate, but I want to prevent chatty messages
  //   // on every key stroke
  //   return () => {
  //     if (r.current) {
  //       r.current.dispose()
  //     }
  //   }
  // }, [])

  if (!state.matches(['showing editor', 'editing'])) return null

  return <RemoteResourceEditor key={resource.id} resource={resource} nav={nav} />
}
