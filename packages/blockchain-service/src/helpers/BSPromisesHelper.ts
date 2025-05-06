export class BSPromisesHelper {
  static async tryCatch<T = any>(callback: () => T | Promise<T>): Promise<[T | null, any]> {
    try {
      const result = await callback()

      return [result, null]
    } catch (error) {
      return [null, error]
    }
  }
}
