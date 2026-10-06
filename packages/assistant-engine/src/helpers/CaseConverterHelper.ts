export class CaseConverterHelper {
  static kebabCaseToCamelCase(value: string) {
    return value.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
  }

  static camelCaseToKebabCase(value: string) {
    return value.replace(/([A-Z])/g, '-$1').toLowerCase()
  }
}
