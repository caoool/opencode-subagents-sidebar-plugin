function stringValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
export function normalizeActivity(value) {
    return value
        .replace(/\s+/g, " ")
        .replace(/^[#>*_`\-\s]+/, "")
        .replace(/[*_`]/g, "")
        .trim();
}
export function normalizeMeaningful(value) {
    const text = stringValue(value);
    return text ? stringValue(normalizeActivity(text)) : undefined;
}
function toolName(value) {
    return value
        .replace(/^multi_tool_use\./, "")
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}
export function activityForPart(part) {
    if (part.type === "text" || part.type === "reasoning")
        return normalizeMeaningful(part.text);
    if (part.type === "subtask") {
        const description = normalizeMeaningful(part.description);
        return description ? `Delegating · ${description}` : "Delegating";
    }
    if (part.type === "retry")
        return `Retrying · attempt ${part.attempt}`;
    if (part.type === "compaction")
        return "Compacting context…";
    if (part.type !== "tool")
        return undefined;
    const name = toolName(part.tool);
    if (part.state.status === "pending")
        return `${name}…`;
    if (part.state.status === "error")
        return `${name} failed`;
    const title = normalizeMeaningful(part.state.title);
    return title ? `${name} · ${title}` : `${name}…`;
}
export function elapsedLabel(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
    if (seconds < 60)
        return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
//# sourceMappingURL=activity.js.map