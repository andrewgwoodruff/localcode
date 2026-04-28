import { rm } from "fs/promises"
import { Instance } from "../../src/project/instance"
import { AppRuntime } from "@/effect/app-runtime"
import { BootstrapRuntime } from "@/effect/bootstrap-runtime"
import { ExperimentalHttpApiServer } from "@/server/routes/instance/httpapi/server"
import { Database } from "@/storage/db"

export async function resetDatabase() {
  await Instance.disposeAll().catch(() => undefined)
  await AppRuntime.dispose().catch(() => undefined)
  await BootstrapRuntime.dispose().catch(() => undefined)
  await ExperimentalHttpApiServer.disposeWebHandler().catch(() => undefined)
  Database.close()
  await rm(Database.Path, { force: true }).catch(() => undefined)
  await rm(`${Database.Path}-wal`, { force: true }).catch(() => undefined)
  await rm(`${Database.Path}-shm`, { force: true }).catch(() => undefined)
}
