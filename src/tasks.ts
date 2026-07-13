import type { Part, SessionStatus, ToolPart } from "@opencode-ai/sdk/v2"

export type VisibleTaskPart = ToolPart

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function taskMetadata(part: ToolPart): Record<string, unknown> {
  return { ...objectValue(part.metadata), ...objectValue(objectValue(part.state).metadata) }
}

export function taskSessionID(part: ToolPart): string | undefined {
  const sessionID = taskMetadata(part).sessionId
  return typeof sessionID === "string" && sessionID.trim() ? sessionID.trim() : undefined
}

export function isVisibleTask(
  part: Part,
  sessionStatus: (sessionID: string) => SessionStatus | undefined,
): part is VisibleTaskPart {
  if (part.type !== "tool" || part.tool !== "task") return false
  if (part.state.status === "pending" || part.state.status === "running") return true
  if (part.state.status !== "completed" || taskMetadata(part).background !== true) return false

  const childSessionID = taskSessionID(part)
  if (!childSessionID) return false
  const status = sessionStatus(childSessionID)
  return status !== undefined && status.type !== "idle"
}
