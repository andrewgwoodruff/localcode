import { Layer } from "effect"

import { Plugin } from "@/plugin"
import { LSP } from "@/lsp/lsp"
import { FileWatcher } from "@/file/watcher"
import { Format } from "@/format"
import { ShareNext } from "@/share/share-next"
import { File } from "@/file"
import { Vcs } from "@/project/vcs"
import { Snapshot } from "@/snapshot"
import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { makeManagedRuntime } from "./managed-runtime"
import * as Observability from "@opencode-ai/core/effect/observability"

export const BootstrapLayer = Layer.mergeAll(
  Config.defaultLayer,
  Plugin.defaultLayer,
  ShareNext.defaultLayer,
  Format.defaultLayer,
  LSP.defaultLayer,
  File.defaultLayer,
  FileWatcher.defaultLayer,
  Vcs.defaultLayer,
  Snapshot.defaultLayer,
  Bus.defaultLayer,
).pipe(Layer.provide(Observability.layer))

const rt = makeManagedRuntime(BootstrapLayer)
type Runtime = Pick<ReturnType<typeof rt>, "runPromise" | "dispose">

export const BootstrapRuntime: Runtime = {
  runPromise: (effect, options) => rt().runPromise(effect, options),
  dispose: rt.dispose,
}
