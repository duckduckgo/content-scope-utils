interface SetRemoteUrl {
  type: 'RemoteResource.SetRemoteUrl'
  id: string
  url: string
}

interface SetDebugContent {
  type: 'RemoteResource.SetDebugContent'
  id: string
  content: string
}

// prettier-ignore
export type RemoteResourceCommands =
    | SetRemoteUrl
    | SetDebugContent
    ;

interface ToggleUnprotectedDomain {
  kind: 'PrivacyConfig.ToggleUnprotectedDomain'
  domain: string
}

interface ToggleFeatureDomain {
  kind: 'PrivacyConfig.ToggleFeatureDomain'
  feature: string
  domain: string
}

interface ToggleFeature {
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

interface TransformError {
  message: string
}
