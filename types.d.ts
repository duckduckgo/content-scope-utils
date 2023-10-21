declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.module.css' {
  const content: Record<string, string>
  export default content
}
declare module '*.css' {
  const content: string
  export default content
}

interface Window {
  _test_editor_value: () => string
  _test_editor_set_value: (value: string) => void
  __playwright_01: {
    models: Record<string, any>
  }
}

/**
 * Allows checks like `import.meta.env === "development"'
 */
interface ImportMeta {
  env: 'production' | 'development'
  platform?: 'windows' | 'macos'
  // this represents the different build artifact names
  injectName?: 'firefox' | 'apple' | 'apple-isolated' | 'android' | 'windows' | 'integration' | 'chrome-mv3' | 'chrome'
}
