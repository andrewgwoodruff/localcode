import { createSimpleContext } from "./helper"
import { unwrap } from "solid-js/store"
import type { PromptRef } from "../component/prompt"
import type { PromptDraft, PromptInfo } from "../component/prompt/history"

export function homeScope(workspaceID?: string) {
  if (!workspaceID) return "home"
  return `home:${workspaceID}`
}

export function sessionScope(sessionID: string) {
  return `session:${sessionID}`
}

function clone<T>(value: T) {
  return structuredClone(unwrap(value))
}

function draft(input: PromptInfo | PromptDraft) {
  if ("prompt" in input) return clone(input)
  return {
    prompt: clone(input),
    cursor: Bun.stringWidth(input.input),
  } satisfies PromptDraft
}

function empty(input?: PromptInfo | PromptDraft) {
  if (!input) return true
  const prompt = "prompt" in input ? input.prompt : input
  if (prompt.input) return false
  return prompt.parts.length === 0
}

export const { use: usePromptRef, provider: PromptRefProvider } = createSimpleContext({
  name: "PromptRef",
  init: () => {
    const drafts = new Map<string, PromptDraft>()
    let live: { scope: string; ref: PromptRef } | undefined

    function load(scope: string) {
      const value = drafts.get(scope)
      if (!value) return
      return clone(value)
    }

    function save(scope: string, input: PromptInfo | PromptDraft) {
      if (empty(input)) {
        drafts.delete(scope)
        return
      }

      drafts.set(scope, draft(input))
    }

    return {
      current(scope: string) {
        if (live?.scope === scope) {
          const value = live.ref.snapshot()
          if (!empty(value)) return value
          return
        }

        return load(scope)
      },
      load,
      save,
      apply(scope: string, input: PromptInfo | PromptDraft) {
        const value = draft(input)
        save(scope, value)
        if (live?.scope !== scope) return
        live.ref.restore(value)
      },
      drop(scope: string) {
        drafts.delete(scope)
      },
      bind(scope: string, ref: PromptRef | undefined) {
        if (!ref) {
          if (live?.scope === scope) live = undefined
          return
        }

        live = { scope, ref }
      },
    }
  },
})
