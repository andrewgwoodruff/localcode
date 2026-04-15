import { createSimpleContext } from "./helper"
import type { PromptRef } from "../component/prompt"
import type { PromptInfo } from "../component/prompt/history"

export function homeScope(workspaceID?: string) {
  if (!workspaceID) return "home"
  return `home:${workspaceID}`
}

export function sessionScope(sessionID: string) {
  return `session:${sessionID}`
}

function clone(prompt: PromptInfo) {
  return structuredClone(prompt)
}

function empty(prompt?: PromptInfo) {
  if (!prompt) return true
  if (prompt.input) return false
  return prompt.parts.length === 0
}

export const { use: usePromptRef, provider: PromptRefProvider } = createSimpleContext({
  name: "PromptRef",
  init: () => {
    const drafts = new Map<string, PromptInfo>()
    const refs = new Map<string, PromptRef>()

    function load(scope: string) {
      const prompt = drafts.get(scope)
      if (!prompt) return
      return clone(prompt)
    }

    function save(scope: string, prompt: PromptInfo) {
      if (empty(prompt)) {
        drafts.delete(scope)
        return
      }

      drafts.set(scope, clone(prompt))
    }

    return {
      current(scope: string) {
        const ref = refs.get(scope)
        if (ref) {
          const prompt = ref.snapshot()
          if (!empty(prompt)) return prompt
          return
        }

        return load(scope)
      },
      load,
      save,
      apply(scope: string, prompt: PromptInfo) {
        save(scope, prompt)
        const ref = refs.get(scope)
        if (!ref) return
        ref.set(prompt)
      },
      drop(scope: string) {
        drafts.delete(scope)
      },
      bind(scope: string, ref: PromptRef) {
        refs.set(scope, ref)
      },
      unbind(scope: string, ref: PromptRef) {
        if (refs.get(scope) !== ref) return
        refs.delete(scope)
      },
    }
  },
})
