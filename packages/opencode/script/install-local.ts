#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs"
import os from "os"
import path from "path"

await import("./build.ts")

const platform = process.platform
const arch = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch
const os_name = platform === "darwin" ? "darwin" : platform === "linux" ? "linux" : platform

const binSrc = path.resolve(import.meta.dirname, `../dist/localcode-${os_name}-${arch}/bin/localcode`)
const binDir = path.join(os.homedir(), ".localcode", "bin")
const binDest = path.join(binDir, "localcode")

await $`mkdir -p ${binDir}`
await $`cp ${binSrc} ${binDest}`
console.log(`Installed localcode to ${binDest}`)

// Idempotently add ~/.localcode/bin to PATH in ~/.zshrc
const zshrc = path.join(os.homedir(), ".zshrc")
const marker = ".localcode/bin"
const pathLine = `\n# localcode\nexport PATH=$HOME/.localcode/bin:$PATH`

const existing = fs.existsSync(zshrc) ? await Bun.file(zshrc).text() : ""
if (!existing.includes(marker)) {
  await Bun.write(zshrc, existing + pathLine + "\n")
  console.log(`Added ~/.localcode/bin to PATH in ~/.zshrc`)
} else {
  console.log(`~/.zshrc already contains ~/.localcode/bin — skipping`)
}
