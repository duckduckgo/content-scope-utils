import { createContext } from 'react'
import { GlobalConfig } from './global-config.mjs'

/**
 * @internal
 */
export const GlobalContext = createContext({
  /** @type {import("./DebugToolsMessages.mjs").DebugToolsMessages | null} */
  messages: null,
  /** @type {import("history").History | null} */
  history: null,
  /** @type {import("./global-config.mjs").GlobalConfig} */
  globalConfig: GlobalConfig.parse({}),
})
