export class BSError extends Error {
  public readonly code: string
  public readonly sourceError?: Error

  constructor(message: string, code: string, sourceError?: any) {
    super(message)

    this.code = code
    this.name = 'BSError'
    this.sourceError = sourceError

    // Set the prototype explicitly to maintain the correct prototype chain
    Object.setPrototypeOf(this, BSError.prototype)
  }

  toString(): string {
    return (
      `[${this.name} - ${this.code}]: ${this.message}` + (this.sourceError ? ` | Caused by: ${this.sourceError}` : '')
    )
  }
}
