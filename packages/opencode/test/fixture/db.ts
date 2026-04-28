import { rm } from "fs/promises"
import { Instance } from "../../src/project/instance"
import { AppRuntime } from "@/effect/app-runtime"
import { BootstrapRuntime } from "@/effect/bootstrap-runtime"
import { ExperimentalHttpApiServer } from "@/server/routes/instance/httpapi/server"
import { Database } from "@/storage/db"

// Order matters and must stay serial: every runtime that transitively consumes
// `DatabaseEffect.layer` shares the global layer memoMap with the others, so
// each one's memoized Service value still references the live SQLite handle.
// We dispose every runtime/handler first, then close the DB. If a future
// module-scoped runtime is added that depends on the DB, register its
// dispose() here.
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
