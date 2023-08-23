import { FeatureToggleListGlobal } from '../remote-resources/components/feature-toggle-list-global'
import { FeatureToggleListDomainExceptions } from '../remote-resources/components/feature-toggle-list-domain-exceptions'
import styles from './toggles-editor.module.css'

/**
 * @typedef {import('../../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 * @typedef {import('../types').TabWithHostname} TabWithHostname
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
 * @typedef {import('react').ReactNode} ReactNode
 */

/**
 * @typedef ToggleComponentProps
 * @property {ITextModel} model
 */

/**
 * @param {object} props
 * @param {ITextModel} props.model
 * @param {boolean} props.pending
 * @param {boolean} props.edited
 * @param {boolean} props.invalid
 * @param {RemoteResource} props.resource
 */
export function TogglesEditor(props) {
  return (
    <div data-testid="TogglesEditor">
      {/*<div className="row">{components[props.toggleKind](props)}</div>*/}
      <div className={styles.togglesGrid}>
        <FeatureToggleListDomainExceptions {...props} />
        <FeatureToggleListGlobal {...props} />
      </div>
    </div>
  )
}
