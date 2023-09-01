export type PrivacyConfigTransformCommands =
  | { kind: 'PrivacyConfig.ToggleUnprotectedDomain'; domain: string }
  | { kind: 'PrivacyConfig.ToggleFeature'; feature: string; domain: string }
  | { kind: 'PrivacyConfig.ToggleFeature'; feature: string }

// export type Transforms = PrivacyConfigTransforms
// prettier-ignore
export type TransformResult<T> =
    | { success: T, ok: true }
    | { error: TransformError, ok: false }

interface TransformError {
  message: string
}
