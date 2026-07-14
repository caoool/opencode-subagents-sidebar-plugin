import type { Message, Part, Session, SessionStatus, ToolPart } from "@opencode-ai/sdk/v2"

export type VisibleTaskPart = ToolPart

export type TaskModel = {
  providerID: string
  modelID: string
  variant?: string
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function taskMetadata(part: ToolPart): Record<string, unknown> {
  return { ...objectValue(part.metadata), ...objectValue(objectValue(part.state).metadata) }
}

export function normalizeTaskDescription(value: unknown): string | undefined {
  const text = stringValue(value)
  return text
    ?.replace(/\s+/g, " ")
    .replace(/^[#>*_`\-\s]+/, "")
    .replace(/[*_`]/g, "")
    .trim() || undefined
}

export function taskSessionID(part: ToolPart): string | undefined {
  const sessionID = taskMetadata(part).sessionId
  return stringValue(sessionID)
}

export function taskAgent(part: VisibleTaskPart): string {
  return stringValue(part.state.input.subagent_type) ?? "subagent"
}

export function taskDescription(part: VisibleTaskPart): string {
  return normalizeTaskDescription(part.state.input.description) ?? normalizeTaskDescription(objectValue(part.state).title) ?? "Working"
}

function taskMetadataModel(part: VisibleTaskPart): TaskModel | undefined {
  const model = objectValue(taskMetadata(part).model)
  const providerID = stringValue(model.providerID)
  const modelID = stringValue(model.modelID)
  // Task metadata is created before the child chooses a model variant. Do not
  // invent or retain a variant from this startup-only fallback.
  return providerID && modelID ? { providerID, modelID } : undefined
}

function childSessionModel(session: Session | undefined): TaskModel | undefined {
  const providerID = stringValue(session?.model?.providerID)
  const modelID = stringValue(session?.model?.id)
  const variant = stringValue(session?.model?.variant)
  return providerID && modelID ? { providerID, modelID, variant: variant ?? "default" } : undefined
}

function childMessageModel(message: Message): TaskModel | undefined {
  if (message.role === "user") {
    const providerID = stringValue(message.model.providerID)
    const modelID = stringValue(message.model.modelID)
    const variant = stringValue(message.model.variant)
    return providerID && modelID ? { providerID, modelID, variant: variant ?? "default" } : undefined
  }

  const providerID = stringValue(message.providerID)
  const modelID = stringValue(message.modelID)
  const variant = stringValue(message.variant)
  return providerID && modelID ? { providerID, modelID, variant: variant ?? "default" } : undefined
}

export function resolveTaskModel(
  part: VisibleTaskPart,
  childSession: Session | undefined,
  childMessages: ReadonlyArray<Message>,
): TaskModel | undefined {
  const sessionModel = childSessionModel(childSession)
  if (sessionModel) return sessionModel

  for (let index = childMessages.length - 1; index >= 0; index -= 1) {
    const message = childMessages[index]
    if (!message) continue
    const messageModel = childMessageModel(message)
    if (messageModel) return messageModel
  }

  return taskMetadataModel(part)
}

export function taskModelLabel(model: TaskModel | undefined, displayName?: string): string {
  if (!model) return "starting…"
  return stringValue(displayName) ?? model.modelID
}

export function taskVariantLabel(model: TaskModel | undefined): string | undefined {
  return model?.variant
}

export function taskStatusLabel(part: VisibleTaskPart, childStatus?: SessionStatus): string {
  if (part.state.status === "completed" && childStatus && childStatus.type !== "idle") return "Running"
  if (part.state.status === "pending") return "Pending"
  if (part.state.status === "running") return "Running"
  if (part.state.status === "completed") return "Completed"
  return "Failed"
}

export function taskModeLabel(part: VisibleTaskPart): "Foreground" | "Background" {
  return taskMetadata(part).background === true ? "Background" : "Foreground"
}

export function canOpenTaskSession(sessionID: string | undefined, currentSessionID: string): boolean {
  return Boolean(sessionID && sessionID !== currentSessionID)
}

export function isTaskPart(part: Part): part is VisibleTaskPart {
  return part.type === "tool" && part.tool === "task"
}

export function isVisibleTask(
  part: Part,
  sessionStatus: (sessionID: string) => SessionStatus | undefined,
): part is VisibleTaskPart {
  if (!isTaskPart(part)) return false
  if (part.state.status === "pending" || part.state.status === "running") return true
  if (part.state.status !== "completed" || taskMetadata(part).background !== true) return false

  const childSessionID = taskSessionID(part)
  if (!childSessionID) return false
  const status = sessionStatus(childSessionID)
  return status !== undefined && status.type !== "idle"
}
