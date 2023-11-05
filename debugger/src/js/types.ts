import { Tab } from '../../schema/__generated__/schema.types'

export type TabWithHostname = Tab & { hostname: string }

export interface FeatureLoader {
  loader: () => Promise<any>
  title: string
  order: number
}

export interface FeatureModuleDescription {
  title: string
  order: number
}

export interface UseableFeature extends FeatureModuleDescription {
  pathname: string
  order: number
}

export interface Feature {
  page: any
  title: string
  pathname: string
}

export interface ReactFeature extends Feature {
  page: () => Promise<import('react').ReactNode>
}
