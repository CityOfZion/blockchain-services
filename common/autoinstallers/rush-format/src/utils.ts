import * as fs from 'fs'
import { execSync } from 'child_process'
import * as path from 'path'
import * as console from 'console'

const packagesPath = path.posix.normalize('../../../packages')

function getAllPaths(): string[] {
  return fs.readdirSync(packagesPath)
}
export function runCommandInEachPackage(cmd: string) {
  let error = false
  const packages = getAllPaths()

  for (const lib of packages) {
    try {
      const pathLib = path.posix.join(packagesPath, lib)

      const isDirectory = fs.lstatSync(pathLib).isDirectory()
      if (!isDirectory) continue

      execSync(`${cmd}`, { cwd: pathLib, stdio: 'inherit' })
    } catch (error) {
      error = true
    }
  }

  if (error) {
    console.error('\nPlease, check the errors above before committing/pushing!\n')
    process.exitCode = 1
  }
}
