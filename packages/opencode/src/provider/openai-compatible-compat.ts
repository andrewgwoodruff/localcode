type ToolParserType = "raw-function-call" | "json" | "single-tool-text"

type RawFunctionCallParser = { type: "raw-function-call" }
type JsonParser = { type: "json" }
type SingleToolTextParser = { type: "single-tool-text"; tool: string }

export type ToolParserConfig = RawFunctionCallParser | JsonParser | SingleToolTextParser

export function getOpenAICompatibleToolParsers(options: Record<string, any>): ToolParserConfig[] {
  const parsers = options["toolParser"]
  if (!Array.isArray(parsers) || parsers.length === 0) return []
  return parsers.filter((p): p is ToolParserConfig => typeof p?.type === "string") as ToolParserConfig[]
}

// For raw-function-call: convert modern tools/tool_choice to legacy functions/function_call format
export function rewriteOpenAICompatibleRequestBody(body: any, parsers: ToolParserConfig[]): any {
  if (!parsers.some((p) => p.type === "raw-function-call")) return body
  if (!Array.isArray(body.tools) || body.tools.length === 0) return body

  const functions = body.tools.map((t: any) => ({
    name: t.function?.name ?? t.name,
    description: t.function?.description ?? t.description,
    parameters: t.function?.parameters ?? t.parameters ?? { type: "object", properties: {} },
  }))

  const result = { ...body }
  delete result.tools
  delete result.tool_choice
  result.functions = functions
  result.function_call = "auto"
  return result
}

// For non-streaming JSON responses: recover tool calls from text content
export function rewriteOpenAICompatibleJsonResponse(body: any, parsers: ToolParserConfig[]): any {
  if (!body?.choices?.[0]) return body

  const choice = body.choices[0]
  const message = choice.message
  if (!message) return body

  // Handle raw-function-call response: function_call field in message
  if (parsers.some((p) => p.type === "raw-function-call") && message.function_call) {
    return {
      ...body,
      choices: [
        {
          ...choice,
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: `call-${Date.now()}`,
                type: "function",
                function: {
                  name: message.function_call.name,
                  arguments: message.function_call.arguments ?? "{}",
                },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    }
  }

  // Handle json parser: model outputs {"name":"...","arguments":{...}} as text
  if (parsers.some((p) => p.type === "json") && typeof message.content === "string" && message.content.trim()) {
    try {
      const parsed = JSON.parse(message.content.trim()) as { name?: string; arguments?: unknown }
      if (typeof parsed.name === "string") {
        return {
          ...body,
          choices: [
            {
              ...choice,
              message: {
                ...message,
                content: null,
                tool_calls: [
                  {
                    id: `call-${Date.now()}`,
                    type: "function",
                    function: {
                      name: parsed.name,
                      arguments: JSON.stringify(parsed.arguments ?? {}),
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
        }
      }
    } catch {}
  }

  // Handle single-tool-text: map bare text response to a named tool
  const singleToolParser = parsers.find((p): p is SingleToolTextParser => p.type === "single-tool-text")
  if (singleToolParser && typeof message.content === "string" && message.content.trim()) {
    return {
      ...body,
      choices: [
        {
          ...choice,
          message: {
            ...message,
            content: null,
            tool_calls: [
              {
                id: `call-${Date.now()}`,
                type: "function",
                function: {
                  name: singleToolParser.tool,
                  arguments: message.content.trim(),
                },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    }
  }

  return body
}

interface SseChunk {
  id?: string
  object?: string
  created?: number
  model?: string
  choices: Array<{
    index?: number
    delta?: {
      role?: string
      content?: string | null
      tool_calls?: any[]
      function_call?: { name?: string; arguments?: string }
    }
    finish_reason?: string | null
  }>
  usage?: any
}

// For SSE streaming responses: buffer the full text, accumulate content, rewrite as tool_calls if needed
export function rewriteOpenAICompatibleStreamResponse(text: string, parsers: ToolParserConfig[]): string {
  const jsonParser = parsers.some((p) => p.type === "json")
  const rawFuncParser = parsers.some((p) => p.type === "raw-function-call")
  const singleToolParser = parsers.find((p): p is SingleToolTextParser => p.type === "single-tool-text")

  const lines = text.split("\n")
  const dataChunks: Array<{ lineIndex: number; chunk: SseChunk }> = []
  let accumulatedText = ""
  let accumulatedFuncName = ""
  let accumulatedFuncArgs = ""
  let hasFuncCall = false
  let baseChunk: SseChunk | null = null

  // Parse all SSE data lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith("data: ") || line === "data: [DONE]") continue
    try {
      const chunk = JSON.parse(line.slice(6)) as SseChunk
      dataChunks.push({ lineIndex: i, chunk })
      if (!baseChunk) baseChunk = chunk

      const delta = chunk.choices?.[0]?.delta
      if (delta?.content) accumulatedText += delta.content
      if (delta?.function_call) {
        hasFuncCall = true
        if (delta.function_call.name) accumulatedFuncName += delta.function_call.name
        if (delta.function_call.arguments) accumulatedFuncArgs += delta.function_call.arguments
      }
    } catch {}
  }

  // Determine if we should rewrite
  let toolCall: { name: string; arguments: string } | null = null

  if (rawFuncParser && hasFuncCall && accumulatedFuncName) {
    toolCall = { name: accumulatedFuncName, arguments: accumulatedFuncArgs }
  } else if (jsonParser && accumulatedText.trim()) {
    try {
      const parsed = JSON.parse(accumulatedText.trim()) as { name?: string; arguments?: unknown }
      if (typeof parsed.name === "string") {
        toolCall = {
          name: parsed.name,
          arguments: JSON.stringify(parsed.arguments ?? {}),
        }
      }
    } catch {}
  } else if (singleToolParser && accumulatedText.trim()) {
    toolCall = {
      name: singleToolParser.tool,
      arguments: accumulatedText.trim(),
    }
  }

  if (!toolCall || !baseChunk) return text

  // Build rewritten SSE output
  const callId = `call-${Date.now()}`
  const base = baseChunk

  const makeDataLine = (chunk: SseChunk) => `data: ${JSON.stringify(chunk)}`

  const startChunk: SseChunk = {
    ...base,
    choices: [
      {
        index: 0,
        delta: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              index: 0,
              id: callId,
              type: "function",
              function: { name: toolCall.name, arguments: "" },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  }

  const argsChunk: SseChunk = {
    ...base,
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 0,
              function: { arguments: toolCall.arguments },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  }

  const finishChunk: SseChunk = {
    ...base,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "tool_calls",
      },
    ],
  }

  // Find the usage chunk (if any) and [DONE] line, preserve them
  const usageLines: string[] = []
  let hasDone = false
  for (const line of lines) {
    if (line === "data: [DONE]") {
      hasDone = true
      continue
    }
    if (line.startsWith("data: ")) {
      try {
        const chunk = JSON.parse(line.slice(6)) as SseChunk
        if (chunk.usage && (!chunk.choices || chunk.choices.length === 0)) {
          usageLines.push(line)
        }
      } catch {}
    }
  }

  const output: string[] = [
    makeDataLine(startChunk),
    "",
    makeDataLine(argsChunk),
    "",
    makeDataLine(finishChunk),
    "",
    ...usageLines.flatMap((l) => [l, ""]),
    ...(hasDone ? ["data: [DONE]", ""] : []),
  ]

  return output.join("\n")
}
