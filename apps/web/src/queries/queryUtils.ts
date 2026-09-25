export function runAbortable<T>(signal: AbortSignal, fetcher: (_signal: AbortSignal) => Promise<T>): Promise<T> {
  return Promise.resolve()
    .then(() => fetcher(signal))
    .catch((error) => {
      if (signal.aborted) return new Promise<T>(() => undefined);
      throw error;
    });
}
