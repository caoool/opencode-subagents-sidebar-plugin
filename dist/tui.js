import { jsx as _jsx, jsxs as _jsxs } from "@opentui/solid/jsx-runtime";
import { activityForPart, elapsedLabel, normalizeMeaningful } from "./activity.js";
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from "solid-js";
function isActiveTask(part) {
    return (part.type === "tool" &&
        part.tool === "task" &&
        (part.state.status === "pending" || part.state.status === "running"));
}
function stringValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function objectValue(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function taskAgent(part) {
    return stringValue(part.state.input.subagent_type) ?? "subagent";
}
function taskDescription(part) {
    return normalizeMeaningful(part.state.input.description) ?? normalizeMeaningful(objectValue(part.state).title) ?? "Working";
}
function taskSessionID(part) {
    return stringValue(objectValue(part.state).metadata && objectValue(objectValue(part.state).metadata).sessionId);
}
function taskModel(part) {
    const metadata = objectValue(objectValue(part.state).metadata);
    const model = objectValue(metadata.model);
    const providerID = stringValue(model.providerID);
    const modelID = stringValue(model.modelID);
    return providerID && modelID ? { providerID, modelID } : undefined;
}
function latestActivity(api, sessionID, fallback) {
    if (!sessionID)
        return fallback;
    const messages = api.state.session.messages(sessionID);
    for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
        const message = messages[messageIndex];
        if (message?.role !== "assistant")
            continue;
        const parts = api.state.part(message.id);
        for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
            const candidate = parts[partIndex];
            if (!candidate)
                continue;
            const activity = activityForPart(candidate);
            if (activity)
                return activity;
        }
    }
    return fallback;
}
function modelLabel(api, part) {
    let model = taskModel(part);
    const childSessionID = taskSessionID(part);
    if (!model && childSessionID) {
        const messages = api.state.session.messages(childSessionID);
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            const message = messages[index];
            if (message?.role === "assistant") {
                model = { providerID: message.providerID, modelID: message.modelID };
                break;
            }
        }
    }
    if (!model)
        return "starting…";
    return api.state.provider.find((provider) => provider.id === model.providerID)?.models[model.modelID]?.name ?? model.modelID;
}
function TaskCard(props) {
    // The call ID is stable, while the actual ToolPart is re-read after each event.
    // This prevents cards from retaining a stale part object after a state update.
    const livePart = createMemo(() => props.tasksByCallID().get(props.callID));
    const childSessionID = () => taskSessionID(livePart());
    const isCurrent = () => childSessionID() === props.currentSessionID;
    const model = () => {
        props.revision();
        return modelLabel(props.api, livePart());
    };
    const activity = () => {
        props.revision();
        return latestActivity(props.api, childSessionID(), taskDescription(livePart()));
    };
    const elapsed = () => elapsedLabel(props.now() - props.startedAt(livePart()));
    return (_jsxs("box", { width: "100%", height: 2, overflow: "hidden", children: [_jsxs("box", { width: "100%", height: 1, flexDirection: "row", overflow: "hidden", children: [_jsxs("text", { flexGrow: 1, flexShrink: 1, minWidth: 0, wrapMode: "none", truncate: true, children: [_jsx("span", { style: {
                                    fg: livePart().state.status === "pending"
                                        ? props.api.theme.current.warning
                                        : props.api.theme.current.success,
                                }, children: isCurrent() ? "›" : livePart().state.status === "pending" ? "…" : "●" }), _jsxs("span", { style: { fg: props.api.theme.current.text }, children: [" ", _jsx("b", { children: taskAgent(livePart()) })] })] }), _jsx("text", { flexShrink: 0, maxWidth: 20, marginLeft: 1, wrapMode: "none", truncate: true, fg: props.api.theme.current.textMuted, children: model() })] }), _jsxs("box", { width: "100%", height: 1, flexDirection: "row", overflow: "hidden", children: [_jsx("text", { flexGrow: 1, flexShrink: 1, minWidth: 0, wrapMode: "none", truncate: true, fg: props.api.theme.current.textMuted, children: activity() }), _jsx("text", { width: 8, flexShrink: 0, marginLeft: 1, wrapMode: "none", truncate: true, fg: props.api.theme.current.textMuted, children: elapsed() })] })] }));
}
function RunningSubagents(props) {
    const [scopeSessionID, setScopeSessionID] = createSignal(props.sessionID);
    const [revision, setRevision] = createSignal(0);
    const [now, setNow] = createSignal(Date.now());
    const firstSeen = new Map();
    let sessionRequest = 0;
    const selectSession = async (sessionID, known) => {
        const currentRequest = ++sessionRequest;
        let session = known ?? props.api.state.session.get(sessionID);
        if (!session) {
            try {
                const result = await props.api.client.session.get({
                    sessionID,
                    directory: props.api.state.path.directory,
                });
                session = result.data;
            }
            catch {
                // A later session event retries after local state is populated.
            }
        }
        if (props.api.lifecycle.signal.aborted || currentRequest !== sessionRequest)
            return;
        setScopeSessionID(session?.parentID ?? sessionID);
        setRevision((value) => value + 1);
    };
    createEffect(on(() => props.sessionID, (sessionID) => void selectSession(sessionID)));
    const running = createMemo(() => {
        revision();
        return props.api.state.session
            .messages(scopeSessionID())
            .flatMap((message) => props.api.state.part(message.id))
            .filter(isActiveTask);
    });
    const tasksByCallID = createMemo(() => new Map(running().map((part) => [part.callID, part])));
    const taskCallIDs = createMemo(() => running().map((part) => part.callID));
    const activeChildSessions = createMemo(() => new Set(running().map(taskSessionID).filter((sessionID) => Boolean(sessionID))));
    const startedAt = (part) => {
        if (part.state.status === "running")
            return part.state.time.start;
        const existing = firstSeen.get(part.callID);
        if (existing !== undefined)
            return existing;
        const value = now();
        firstSeen.set(part.callID, value);
        return value;
    };
    const unregister = [];
    let timer;
    onMount(() => {
        const syncCurrentSession = (session) => {
            if (session.id === props.sessionID)
                void selectSession(session.id, session);
            if (session.parentID === scopeSessionID() || activeChildSessions().has(session.id)) {
                setRevision((value) => value + 1);
            }
        };
        const refreshSession = (sessionID) => {
            if (sessionID === scopeSessionID() || activeChildSessions().has(sessionID)) {
                setRevision((value) => value + 1);
            }
        };
        unregister.push(props.api.event.on("session.created", (event) => syncCurrentSession(event.properties.info)), props.api.event.on("session.updated", (event) => syncCurrentSession(event.properties.info)), props.api.event.on("message.updated", (event) => refreshSession(event.properties.sessionID)), props.api.event.on("message.part.updated", (event) => refreshSession(event.properties.sessionID)), props.api.event.on("message.part.removed", (event) => refreshSession(event.properties.sessionID)));
        timer = setInterval(() => setNow(Date.now()), 1_000);
    });
    onCleanup(() => {
        sessionRequest += 1;
        if (timer)
            clearInterval(timer);
        for (const dispose of unregister)
            dispose();
    });
    return (_jsxs("box", { overflow: "hidden", children: [_jsxs("text", { fg: props.api.theme.current.text, children: [_jsx("b", { children: "Subagents" }), _jsx("span", { style: { fg: props.api.theme.current.textMuted }, children: running().length ? ` (${running().length} running)` : "" })] }), _jsx(Show, { when: taskCallIDs().length > 0, fallback: _jsx("text", { fg: props.api.theme.current.textMuted, children: "No subagent running" }), children: _jsx(For, { each: taskCallIDs(), children: (callID) => (_jsx(TaskCard, { api: props.api, callID: callID, currentSessionID: props.sessionID, tasksByCallID: tasksByCallID, revision: revision, now: now, startedAt: startedAt })) }) })] }));
}
const tui = async (api) => {
    api.slots.register({
        order: 90,
        slots: {
            sidebar_footer(_ctx, props) {
                return _jsx(RunningSubagents, { api: api, sessionID: props.session_id });
            },
        },
    });
};
const plugin = {
    id: "opencode-subagents-sidebar-plugin",
    tui,
};
export default plugin;
//# sourceMappingURL=tui.js.map