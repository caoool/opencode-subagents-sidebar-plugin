function normalizeActivity(value) {
  if (typeof value !== "string") return undefined;
  return value.replace(/\s+/g, " ").replace(/^[#>*_`\-\s]+/, "").replace(/[*_`]/g, "").trim() || undefined;
}
function toolName(value) {
  return value.replace(/^multi_tool_use\./, "").replace(/[._-]+/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}
export function activityForPart(part) {
  if (part.type === "text" && !part.ignored) return normalizeActivity(part.text);
  if (part.type === "reasoning") return normalizeActivity(part.text);
  if (part.type === "subtask") {
    const description = normalizeActivity(part.description);
    return description ? `Delegating · ${description}` : "Delegating";
  }
  if (part.type === "retry") return `Retrying · attempt ${part.attempt}`;
  if (part.type === "compaction") return "Compacting context…";
  if (part.type !== "tool") return undefined;
  const name = toolName(part.tool);
  if (part.state.status === "pending" || part.state.status === "running") return `${name}…`;
  if (part.state.status === "error") return `${name} failed`;
  const title = normalizeActivity(part.state.title);
  return title ? `${name} · ${title}` : `${name}…`;
}

/** Returns the newest visible assistant activity as a single display line. */
export function latestAssistantActivity(messages, partsForMessage) {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    if (!message || message.role !== "assistant") continue;
    const parts = partsForMessage(message.id);
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex];
      if (!part) continue;
      const activity = activityForPart(part);
      if (activity) return activity;
    }
  }
  return undefined;
}
export function elapsedLabel(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
//# sourceMappingURL=activity.js.map