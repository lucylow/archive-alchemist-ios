export function withTimeout<T, F>(promise: Promise<T>, fallback: F, timeoutMs: number): Promise<T | F> {
  return new Promise<T | F>((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
