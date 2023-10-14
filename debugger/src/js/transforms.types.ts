/**
 * @module Remote Resource Commands
 *
 * @description
 *
 * The actions that can be invoked onto a remote resource
 */

import { PrivacyConfig } from './remote-resources/remote-resources.machine'

interface Transform<T> {
  transform(t: T): Promise<T>
}

/**
 * Implement this to perform operations on privacy configuration
 */
export interface PrivacyConfigurationTransform extends Transform<PrivacyConfig> {}

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

// prettier-ignore
export type ApplyTarget =
  | { domain: string }
  | { all: true }

// export type Transforms = PrivacyConfigTransforms
// prettier-ignore
export type TransformResult<T> =
    | { success: T, ok: true }
    | { error: TransformError, ok: false }

export interface TransformError {
  message: string
}
