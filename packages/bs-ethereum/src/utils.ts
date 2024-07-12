export function wait(duration: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, duration)
  })
}

export function retry<T = any>(callback: () => Promise<T>): Promise<T> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    // Wait up to 5 seconds
    for (let i = 0; i < 50; i++) {
      try {
        const result = await callback()
        return resolve(result)
      } catch (error: any) {
        if (error.id !== 'TransportLocked') {
          return reject(error)
        }
      }
      await wait(100)
    }

    return reject(new Error('timeout'))
  })
}
