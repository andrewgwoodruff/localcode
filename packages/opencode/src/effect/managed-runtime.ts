import { ManagedRuntime, type Layer } from "effect"
import { memoMap } from "@opencode-ai/core/effect/memo-map"
import { lazy } from "@/util/lazy"

// Builds a lazy ManagedRuntime over the shared layer memoMap with a uniform
// dispose() that tears down only the runtime instance it created. Used for
// every module-scoped runtime in opencode (AppRuntime, BootstrapRuntime, ...).
//
// IMPORTANT: any runtime built from this helper whose layer transitively
// consumes `DatabaseEffect.layer` must be disposed before `Database.close()`
// in `test/fixture/db.ts:resetDatabase`. The shared memoMap deduplicates
// layer builds across runtimes, so a stale Service value in one runtime
// would otherwise outlive the underlying SQLite handle.
export function makeManagedRuntime<R, E>(layer: Layer.Layer<R, E>) {
  const rt = lazy(() => ManagedRuntime.make(layer, { memoMap }))
  return Object.assign(rt, {
    async dispose() {
      const current = rt.peek()
      if (!current) return
      try {
        await current.dispose()
      } finally {
        rt.resetIf(current)
      }
    },
  })
}
