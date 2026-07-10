'use strict'

/**
 * @cityofzion/neon-dappkit ships .d.ts that import @cityofzion/neon-core, but only
 * lists it as a devDependency. Without a real dependency edge, pnpm can't give it a
 * strict symlink, so Node's ancestor-walk resolution falls back to whichever
 * neon-core version landed in the shared virtual store slot — ambiguous once more
 * than one neon-core major exists in the workspace (see bs-neo-legacy's neon-core@4.x).
 * Patch the manifest so pnpm resolves it strictly instead of guessing.
 */
function readPackage(packageJson) {
  if (packageJson.name === '@cityofzion/neon-dappkit') {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      '@cityofzion/neon-core': '^5.7.0',
    }
  }

  return packageJson
}

module.exports = {
  hooks: {
    readPackage,
  },
}
