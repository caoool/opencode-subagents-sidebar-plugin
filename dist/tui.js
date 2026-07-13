import { createComponent as _$createComponent } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { memo as _$memo } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
/** @jsxImportSource @opentui/solid */

import { activityForPart, elapsedLabel, normalizeMeaningful } from "./activity.js";
import { isVisibleTask, taskSessionID } from "./tasks.js";
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from "solid-js";
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
function taskModel(part) {
  const metadata = objectValue(objectValue(part.state).metadata);
  const model = objectValue(metadata.model);
  const providerID = stringValue(model.providerID);
  const modelID = stringValue(model.modelID);
  return providerID && modelID ? {
    providerID,
    modelID
  } : undefined;
}
function latestActivity(api, sessionID, fallback) {
  if (!sessionID) return fallback;
  const messages = api.state.session.messages(sessionID);
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    if (message?.role !== "assistant") continue;
    const parts = api.state.part(message.id);
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const candidate = parts[partIndex];
      if (!candidate) continue;
      const activity = activityForPart(candidate);
      if (activity) return activity;
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
        model = {
          providerID: message.providerID,
          modelID: message.modelID
        };
        break;
      }
    }
  }
  if (!model) return "starting…";
  return api.state.provider.find(provider => provider.id === model.providerID)?.models[model.modelID]?.name ?? model.modelID;
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
  return (() => {
    var _el$ = _$createElement("box"),
      _el$2 = _$createElement("box"),
      _el$3 = _$createElement("text"),
      _el$4 = _$createElement("span"),
      _el$5 = _$createElement("span"),
      _el$6 = _$createTextNode(` `),
      _el$7 = _$createElement("b"),
      _el$8 = _$createElement("text"),
      _el$9 = _$createElement("box"),
      _el$0 = _$createElement("text"),
      _el$1 = _$createElement("text");
    _$insertNode(_el$, _el$2);
    _$insertNode(_el$, _el$9);
    _$setProp(_el$, "width", "100%");
    _$setProp(_el$, "height", 2);
    _$setProp(_el$, "overflow", "hidden");
    _$insertNode(_el$2, _el$3);
    _$insertNode(_el$2, _el$8);
    _$setProp(_el$2, "width", "100%");
    _$setProp(_el$2, "height", 1);
    _$setProp(_el$2, "flexDirection", "row");
    _$setProp(_el$2, "overflow", "hidden");
    _$insertNode(_el$3, _el$4);
    _$insertNode(_el$3, _el$5);
    _$setProp(_el$3, "flexGrow", 1);
    _$setProp(_el$3, "flexShrink", 1);
    _$setProp(_el$3, "minWidth", 0);
    _$setProp(_el$3, "wrapMode", "none");
    _$setProp(_el$3, "truncate", true);
    _$insert(_el$4, (() => {
      var _c$ = _$memo(() => !!isCurrent());
      return () => _c$() ? "›" : livePart().state.status === "pending" ? "…" : "●";
    })());
    _$insertNode(_el$5, _el$6);
    _$insertNode(_el$5, _el$7);
    _$insert(_el$7, () => taskAgent(livePart()));
    _$setProp(_el$8, "flexShrink", 0);
    _$setProp(_el$8, "maxWidth", 20);
    _$setProp(_el$8, "marginLeft", 1);
    _$setProp(_el$8, "wrapMode", "none");
    _$setProp(_el$8, "truncate", true);
    _$insert(_el$8, model);
    _$insertNode(_el$9, _el$0);
    _$insertNode(_el$9, _el$1);
    _$setProp(_el$9, "width", "100%");
    _$setProp(_el$9, "height", 1);
    _$setProp(_el$9, "flexDirection", "row");
    _$setProp(_el$9, "overflow", "hidden");
    _$setProp(_el$0, "flexGrow", 1);
    _$setProp(_el$0, "flexShrink", 1);
    _$setProp(_el$0, "minWidth", 0);
    _$setProp(_el$0, "wrapMode", "none");
    _$setProp(_el$0, "truncate", true);
    _$insert(_el$0, activity);
    _$setProp(_el$1, "width", 8);
    _$setProp(_el$1, "flexShrink", 0);
    _$setProp(_el$1, "marginLeft", 1);
    _$setProp(_el$1, "wrapMode", "none");
    _$setProp(_el$1, "truncate", true);
    _$insert(_el$1, elapsed);
    _$effect(_p$ => {
      var _v$ = {
          fg: livePart().state.status === "pending" ? props.api.theme.current.warning : props.api.theme.current.success
        },
        _v$2 = {
          fg: props.api.theme.current.text
        },
        _v$3 = props.api.theme.current.textMuted,
        _v$4 = props.api.theme.current.textMuted,
        _v$5 = props.api.theme.current.textMuted;
      _v$ !== _p$.e && (_p$.e = _$setProp(_el$4, "style", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp(_el$5, "style", _v$2, _p$.t));
      _v$3 !== _p$.a && (_p$.a = _$setProp(_el$8, "fg", _v$3, _p$.a));
      _v$4 !== _p$.o && (_p$.o = _$setProp(_el$0, "fg", _v$4, _p$.o));
      _v$5 !== _p$.i && (_p$.i = _$setProp(_el$1, "fg", _v$5, _p$.i));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined,
      i: undefined
    });
    return _el$;
  })();
}
function RunningSubagents(props) {
  const [scopeSessionID, setScopeSessionID] = createSignal();
  const [hydratedMessages, setHydratedMessages] = createSignal([]);
  const [revision, setRevision] = createSignal(0);
  const [now, setNow] = createSignal(Date.now());
  const firstSeen = new Map();
  let sessionRequest = 0;
  const loadMessages = async (sessionID, request) => {
    if (props.api.state.session.messages(sessionID).length) return;
    try {
      const result = await props.api.client.session.messages({
        sessionID,
        directory: props.api.state.path.directory
      }, {
        throwOnError: true
      });
      if (props.api.lifecycle.signal.aborted || request !== sessionRequest || scopeSessionID() !== sessionID) return;
      setHydratedMessages(result.data);
      setRevision(value => value + 1);
    } catch {
      // Live session events can populate the public TUI state after a failed hydration.
    }
  };
  const selectSession = async (sessionID, known) => {
    const currentRequest = ++sessionRequest;
    setScopeSessionID(undefined);
    setHydratedMessages([]);
    let session = known ?? props.api.state.session.get(sessionID);
    if (!session) {
      try {
        const result = await props.api.client.session.get({
          sessionID,
          directory: props.api.state.path.directory
        }, {
          throwOnError: true
        });
        session = result.data;
      } catch {
        // Leave the scope unset so a failed child lookup cannot show its own tasks.
        // A later session event retries after local state is populated.
        return;
      }
    }
    if (props.api.lifecycle.signal.aborted || currentRequest !== sessionRequest) return;
    const parentSessionID = session.parentID ?? session.id;
    setScopeSessionID(parentSessionID);
    setRevision(value => value + 1);
    void loadMessages(parentSessionID, currentRequest);
  };
  createEffect(on(() => props.sessionID, sessionID => void selectSession(sessionID)));
  const running = createMemo(() => {
    revision();
    const sessionID = scopeSessionID();
    if (!sessionID) return [];
    const messages = props.api.state.session.messages(sessionID);
    const parts = messages.length ? messages.flatMap(message => props.api.state.part(message.id)) : hydratedMessages().flatMap(message => message.parts);
    return parts.filter(part => isVisibleTask(part, props.api.state.session.status));
  });
  const tasksByCallID = createMemo(() => new Map(running().map(part => [part.callID, part])));
  const taskCallIDs = createMemo(() => running().map(part => part.callID));
  const activeChildSessions = createMemo(() => new Set(running().map(taskSessionID).filter(sessionID => Boolean(sessionID))));
  const startedAt = part => {
    if (part.state.status !== "pending") return part.state.time.start;
    const existing = firstSeen.get(part.callID);
    if (existing !== undefined) return existing;
    const value = now();
    firstSeen.set(part.callID, value);
    return value;
  };
  const unregister = [];
  let timer;
  onMount(() => {
    const syncCurrentSession = session => {
      if (session.id === props.sessionID) void selectSession(session.id, session);
      if (session.parentID === scopeSessionID() || activeChildSessions().has(session.id)) {
        setRevision(value => value + 1);
      }
    };
    const refreshSession = sessionID => {
      if (sessionID === scopeSessionID() || activeChildSessions().has(sessionID)) {
        setRevision(value => value + 1);
      }
    };
    unregister.push(props.api.event.on("session.created", event => syncCurrentSession(event.properties.info)), props.api.event.on("session.updated", event => syncCurrentSession(event.properties.info)), props.api.event.on("message.updated", event => refreshSession(event.properties.sessionID)), props.api.event.on("message.part.updated", event => refreshSession(event.properties.sessionID)), props.api.event.on("message.part.removed", event => refreshSession(event.properties.sessionID)));
    timer = setInterval(() => setNow(Date.now()), 1_000);
  });
  onCleanup(() => {
    sessionRequest += 1;
    if (timer) clearInterval(timer);
    for (const dispose of unregister) dispose();
  });
  return (() => {
    var _el$10 = _$createElement("box"),
      _el$11 = _$createElement("text"),
      _el$12 = _$createElement("b"),
      _el$14 = _$createElement("span");
    _$insertNode(_el$10, _el$11);
    _$setProp(_el$10, "overflow", "hidden");
    _$insertNode(_el$11, _el$12);
    _$insertNode(_el$11, _el$14);
    _$insertNode(_el$12, _$createTextNode(`Subagents`));
    _$insert(_el$14, (() => {
      var _c$2 = _$memo(() => !!running().length);
      return () => _c$2() ? ` (${running().length} running)` : "";
    })());
    _$insert(_el$10, _$createComponent(Show, {
      get when() {
        return taskCallIDs().length > 0;
      },
      get fallback() {
        return (() => {
          var _el$15 = _$createElement("text");
          _$insertNode(_el$15, _$createTextNode(`No subagent running`));
          _$effect(_$p => _$setProp(_el$15, "fg", props.api.theme.current.textMuted, _$p));
          return _el$15;
        })();
      },
      get children() {
        return _$createComponent(For, {
          get each() {
            return taskCallIDs();
          },
          children: callID => _$createComponent(TaskCard, {
            get api() {
              return props.api;
            },
            callID: callID,
            get currentSessionID() {
              return props.sessionID;
            },
            tasksByCallID: tasksByCallID,
            revision: revision,
            now: now,
            startedAt: startedAt
          })
        });
      }
    }), null);
    _$effect(_p$ => {
      var _v$6 = props.api.theme.current.text,
        _v$7 = {
          fg: props.api.theme.current.textMuted
        };
      _v$6 !== _p$.e && (_p$.e = _$setProp(_el$11, "fg", _v$6, _p$.e));
      _v$7 !== _p$.t && (_p$.t = _$setProp(_el$14, "style", _v$7, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$10;
  })();
}
const tui = async api => {
  api.slots.register({
    order: 90,
    slots: {
      sidebar_footer(_ctx, props) {
        return _$createComponent(RunningSubagents, {
          api: api,
          get sessionID() {
            return props.session_id;
          }
        });
      }
    }
  });
};
const plugin = {
  id: "opencode-subagents-sidebar-plugin",
  tui
};
export default plugin;
//# sourceMappingURL=tui.js.map