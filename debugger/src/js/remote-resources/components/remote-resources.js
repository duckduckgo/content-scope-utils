import * as z from 'zod'
import { remoteResourceSchema } from '../../../../schema/__generated__/schema.parsers.mjs'
import { RemoteResourcesContext } from '../remote-resources.page'
import { RemoteResourceEditor } from './remote-resource-editor'
import useConstant from '@xstate/react/es/useConstant'
import { useContext, useEffect } from 'react'
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
  const { resource, resourceKey, nav } = RemoteResourcesContext.useSelector((state) => {
    const schema = z.object({
      currentResource: CurrentResource,
      resources: z.array(remoteResourceSchema),
      resourceKey: z.number(),
    })

    const parsed = schema.parse(state.context)
    const match = parsed.resources.find((re) => re.id === parsed.currentResource.id)

    if (!match) throw new Error('unreachable, could not access ' + parsed.currentResource.id + ' in context')

    return {
      resource: match,
      resourceKey: parsed.resourceKey,
      nav: parsed.resources.map((r) => {
        return {
          name: r.name,
          id: r.id,
          active: state.context.currentResource?.id === r.id,
        }
      }),
    }
  })

  const originalTextContent = resource.current.contents

  /**
   * Share a text model between the views
   * @type {TextModel}
   */
  const sharedTextModel = useConstant(() => {
    invariant(typeof createTextModel === 'function', 'createTextModel required')
    const model = createTextModel?.({ content: resource.current.contents, contentType: resource.current.contentType })

    window._test_editor_value = () => model.getValue()
    window._test_editor_set_value = (value) => {
      model.setValue(value)
    }
    return model
  })

  // ensure the monaco model stays in sync
  // in xstate we update the `resourceKey` to indicate that the UI should consider
  // the resource 'updated'
  useEffect(() => {
    sharedTextModel.setValue(originalTextContent)
  }, [resourceKey, originalTextContent, sharedTextModel])

  // subscribe to the shared model and publish events back to xstate
  useEffect(() => {
    // monaco.editor.onDidChangeMarkers((uriList) => {
    //   const markers = monaco.editor.getModelMarkers({ resource: uriList[0] })
    //   const errors = markers.filter((m) => m.severity === monaco.MarkerSeverity.Error)
    //   if (errors.length > 0) {
    //     send({ type: 'content is invalid', markers })
    //   } else {
    //     send({ type: 'content is valid' })
    //   }
    // })

    // normally this logic would live inside xstate, but I want to prevent chatty messages
    // on every key stroke
    const sub = sharedTextModel.onDidChangeContent(() => {
      if (sharedTextModel.getValue() !== originalTextContent) {
        send({ type: 'content was edited' })
      } else {
        send({ type: 'content was reverted' })
      }
    })
    return () => sub.dispose()
  }, [sharedTextModel, originalTextContent, send])

  if (!state.matches(['showing editor', 'editing'])) return null

  return <RemoteResourceEditor key={resourceKey} resource={resource} model={sharedTextModel} nav={nav} />
}
