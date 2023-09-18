/**
 * @module Remote Resource Commands
 *
 * @description
 *
 * The actions that can be invoked onto a remote resource
 */

import { PrivacyConfig } from './remote-resources/remote-resources.machine'
import { ToggleFeature, ToggleFeatureDomain } from './transforms.js'
export { ToggleFeature, ToggleFeatureDomain }

interface Transform<T> {
  transform(t: T): T
}

/**
 * Implement this
 */
export interface PrivacyConfigurationTransform extends Transform<PrivacyConfig> {}

interface StaticTransformProps {
  type: string
  description: string
  subject: string
}

type LookupMap<T> = {
  [K in keyof T]: {
    type: K
    args: T[K] extends { props: StaticTransformProps }
      ? T[K] extends abstract new (...args: any) => any
        ? ConstructorParameters<T[K]>[0]
        : never
      : `StaticTransformProps incorrect, check: ${K extends string ? K : never}`
  }
}
export type Lookup<T> = LookupMap<T>[keyof LookupMap<T>]

/**
 * Override The current remote url. This is useful
 * for loading a resource that you serve yourself, or for trying a new/beta resource
 */
export interface SetRemoteUrl {
  type: 'RemoteResource.setRemoteUrl'
  id: string
  /**
   * Provide the full URL here.
   */
  url: string
}

/**
 * Override the content of the current resource with an arbitrary string
 * value. This is useful for making manual edits to a resource
 */
export interface SetDebugContent {
  type: 'RemoteResource.setDebugContent'
  id: string
  content: string
}

// prettier-ignore
export type RemoteResourceMethods =
    | SetRemoteUrl
    | SetDebugContent
    ;

export interface ToggleUnprotectedDomain {
  kind: 'PrivacyConfig.toggleUnprotectedDomain'
  domain: string
}

export interface ToggleAllowlistedTracker {
  kind: 'PrivacyConfig.toggleAllowlistedTrackerUrl'
  trackerUrl: string
  domains: string[]
}

export interface ToggleAllowlistedTrackerDomain {
  kind: 'PrivacyConfig.toggleAllowlistedTrackerDomain'
  trackerUrl: string
  domains: string[]
}

// prettier-ignore
export type PrivacyConfigTransformMethods =
    | ToggleUnprotectedDomain
    | ToggleAllowlistedTracker
    | ToggleAllowlistedTrackerDomain
    ;

// export type Transforms = PrivacyConfigTransforms
// prettier-ignore
export type TransformResult<T> =
    | { success: T, ok: true }
    | { error: TransformError, ok: false }

export interface TransformError {
  message: string
}
