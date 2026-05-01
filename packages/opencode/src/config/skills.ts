import { Schema } from "effect"
import { zod } from "@/util/effect-zod"
import { withStatics } from "@/util/schema"

export const Info = Schema.Struct({
  paths: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "Additional paths to skill folders",
  }),
  urls: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "URLs to fetch skills from (e.g., https://example.com/.well-known/skills/)",
  }),
  format: Schema.optional(Schema.Union([Schema.Literal("xml"), Schema.Literal("json"), Schema.Literal("markdown")])).annotate({
    description:
      "Format used to serialize skills into the system prompt. Defaults to 'xml' for Anthropic models and 'json' for all others. Override if your model handles a specific format better.",
  }),
}).pipe(withStatics((s) => ({ zod: zod(s) })))

export type Info = Schema.Schema.Type<typeof Info>

export * as ConfigSkills from "./skills"
