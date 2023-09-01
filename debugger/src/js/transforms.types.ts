/**
 * @module Remote Resource Commands
 *
 * @description
 *
 * The actions that can be invoked onto a remote resource
 */
/**
 * Override The current remote url. This is useful
 * for loading a resource that you serve yourself, or for trying a new/beta resource
 */
export interface SetRemoteUrl {
  type: 'RemoteResource.SetRemoteUrl'
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
  type: 'RemoteResource.SetDebugContent'
  id: string
  content: string
}

// prettier-ignore
export type RemoteResourceCommands =
    | SetRemoteUrl
    | SetDebugContent
    ;

export interface ToggleUnprotectedDomain {
  kind: 'PrivacyConfig.ToggleUnprotectedDomain'
  domain: string
}

export interface ToggleFeatureDomain {
  kind: 'PrivacyConfig.ToggleFeatureDomain'
  feature: string
  domain: string
}

export interface ToggleFeature {
  kind: 'PrivacyConfig.ToggleFeature'
  feature: string
}

// prettier-ignore
export type PrivacyConfigTransformCommands =
    | ToggleUnprotectedDomain
    | ToggleFeatureDomain
    | ToggleFeature
    ;

// export type Transforms = PrivacyConfigTransforms
// prettier-ignore
export type TransformResult<T> =
    | { success: T, ok: true }
    | { error: TransformError, ok: false }

export interface TransformError {
  message: string
}
