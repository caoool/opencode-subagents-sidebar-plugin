function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function taskMetadata(part) {
  return {
    ...objectValue(part.metadata),
    ...objectValue(objectValue(part.state).metadata)
  };
}
export function taskSessionID(part) {
  const sessionID = taskMetadata(part).sessionId;
  return typeof sessionID === "string" && sessionID.trim() ? sessionID.trim() : undefined;
}
export function isVisibleTask(part, sessionStatus) {
  if (part.type !== "tool" || part.tool !== "task") return false;
  if (part.state.status === "pending" || part.state.status === "running") return true;
  if (part.state.status !== "completed" || taskMetadata(part).background !== true) return false;
  const childSessionID = taskSessionID(part);
  if (!childSessionID) return false;
  const status = sessionStatus(childSessionID);
  return status !== undefined && status.type !== "idle";
}
//# sourceMappingURL=tasks.js.map