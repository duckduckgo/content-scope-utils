interface UnstableWebkit {
  messageHandlers: Record<
    string,
    {
      postMessage?: (...args: unknown[]) => void
    }
  >
}

interface Window {
  __playwright: MockCall[]
  webkit: UnstableWebkit
  chrome: any
}

type MockCall = [name: string, data: Record<string, unknown>, response: Record<string, unknown>]

declare let windowsInteropPostMessage: any
declare let windowsInteropAddEventListener: any
declare let windowsInteropRemoveEventListener: any
