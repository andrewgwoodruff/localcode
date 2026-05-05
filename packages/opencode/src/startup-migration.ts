import fs from "fs/promises"
import path from "path"
import { xdgData, xdgCache, xdgConfig, xdgState } from "xdg-basedir"

async function migrateDir(oldPath: string, newPath: string) {
  try {
    await fs.access(oldPath)
  } catch {
    return
  }

  try {
    const newStat = await fs.stat(newPath).catch(() => null)
    if (newStat) {
      const newEntries = await fs.readdir(newPath)
      if (newEntries.length > 0) return
      await fs.rmdir(newPath)
    }
    await fs.rename(oldPath, newPath)
  } catch {
    // Non-fatal: migration failed, old path stays in place
  }
}

async function migrateConfigFile(dir: string) {
  const oldFile = path.join(dir, "opencode.json")
  const newFile = path.join(dir, "localcode.json")
  try {
    await fs.access(oldFile)
    try {
      await fs.access(newFile)
      return
    } catch {
      await fs.rename(oldFile, newFile)
    }
  } catch {
    // no opencode.json to migrate
  }
}

export async function migrateFromOpencode() {
  await Promise.all([
    migrateDir(path.join(xdgConfig!, "opencode"), path.join(xdgConfig!, "localcode")),
    migrateDir(path.join(xdgData!, "opencode"), path.join(xdgData!, "localcode")),
    migrateDir(path.join(xdgCache!, "opencode"), path.join(xdgCache!, "localcode")),
    migrateDir(path.join(xdgState!, "opencode"), path.join(xdgState!, "localcode")),
  ])
  await migrateConfigFile(path.join(xdgConfig!, "localcode"))
}
