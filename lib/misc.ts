export const awaitTimeout = (ms = 0, ...restArgs: any[]) => {
  return new Promise(resolve => setTimeout(resolve, ms, ...restArgs))
}
