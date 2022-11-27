interface Window {
  __playwright: MockCall[]
  webkit: {
    messageHandlers: Record<
      string,
      {
        postMessage?: (...args: unknown[]) => void
      }
    >
  }
}

type MockCall = [name: string, data: Record<string, unknown>, response: Record<string, unknown>]
