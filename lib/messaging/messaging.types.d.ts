interface Window {
  webkit: {
    messageHandlers: Record<
      string,
      {
        postMessage?: (...args: unknown[]) => void;
      }
    >;
  };
}
