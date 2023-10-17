import * as z from 'zod'
import { remoteResourceSchema } from '../../../../schema/__generated__/schema.parsers.mjs'
import { RemoteResourcesContext } from '../remote-resources.page'
import { RemoteResourceEditor } from './remote-resource-editor'
import { CurrentResource } from '../remote-resources.machine'

/**
 * @typedef {import('@duckduckgo/content-scope-scripts/packages/messaging/index.js').MessagingTransport} MessagingTransport
 * @typedef {import('../../../../schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('../../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 * @typedef {import('../../models/text-model').TextModel} TextModel
 */

export function RemoteResources() {
  const [state] = RemoteResourcesContext.useActor()
  const { resource, nav } = RemoteResourcesContext.useSelector((state) => {
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

  if (!state.matches(['showing editor', 'editing'])) return null

  return <RemoteResourceEditor key={resource.id} resource={resource} nav={nav} />
}
