import 'dotenv/config'

// Necessary to run on Node.js
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
if (typeof self === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  global.self = global
}
