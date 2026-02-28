import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"
import type { ModelConfig } from "./types"

export function getLLMModel(config: ModelConfig) {
  if (config.provider === "openai") {
    return openai("gpt-4o")
  } else if (config.provider === "gemini") {
    return google("gemini-pro")
  }
  // Fallback to OpenAI
  return openai("gpt-4o")
}

export function selectLLMProvider(preferred: "openai" | "gemini" | undefined, fallbackMode: boolean) {
  if (!fallbackMode && preferred) {
    return preferred
  }
  // Use OpenAI as primary, Gemini as fallback
  return "openai"
}
