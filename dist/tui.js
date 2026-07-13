import { createComponent as _$createComponent } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { memo as _$memo } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
/** @jsxImportSource @opentui/solid */

import { elapsedLabel } from "./activity.js";
import { canOpenTaskSession, isTaskPart, isVisibleTask, resolveTaskModel, taskAgent, taskDescription, taskModeLabel, taskModelLabel, taskSessionID, taskStatusLabel, taskVariantLabel } from "./tasks.js";
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from "solid-js";
function resolvedModel(api, part, session, sessionID) {
  return resolveTaskModel(part, session, sessionID ? api.state.session.messages(sessionID) : []);
}
function modelName(api, model) {
  const name = model ? api.state.provider.find(provider => provider.id === model.providerID)?.models[model.modelID]?.name : undefined;
  return taskModelLabel(model, name);
}
function TaskDetails(props) {
  const fallback = () => {
    const known = props.fallbackFor(props.callID);
    if (known) return known;
    const sessionID = taskSessionID(props.fallbackPart);
    return {
      part: props.fallbackPart,
      ...(sessionID ? {
        sessionID
      } : {})
    };
  };
  const part = createMemo(() => {
    props.revision();
    return props.tasksByCallID().get(props.callID) ?? fallback().part;
  });
  const childSessionID = () => taskSessionID(part() ?? fallback().part) ?? fallback().sessionID;
  const childSession = () => {
    props.revision();
    const sessionID = childSessionID();
    return (sessionID ? props.api.state.session.get(sessionID) : undefined) ?? fallback().session;
  };
  const model = createMemo(() => {
    props.revision();
    return resolvedModel(props.api, part() ?? fallback().part, childSession(), childSessionID());
  });
  const canOpen = () => canOpenTaskSession(childSessionID(), props.currentSessionID);
  const openSession = () => {
    const sessionID = childSessionID();
    if (!canOpen() || !sessionID) return;
    props.api.route.navigate("session", {
      sessionID
    });
    props.close();
  };
  return (() => {
    var _el$ = _$createElement("box"),
      _el$2 = _$createElement("text"),
      _el$3 = _$createElement("b"),
      _el$5 = _$createElement("box"),
      _el$6 = _$createElement("text"),
      _el$7 = _$createTextNode(`Agent: `),
      _el$8 = _$createElement("text"),
      _el$9 = _$createTextNode(`Assigned task: `),
      _el$0 = _$createElement("text"),
      _el$1 = _$createTextNode(`Status: `),
      _el$10 = _$createElement("text"),
      _el$11 = _$createTextNode(`Model: `),
      _el$12 = _$createElement("text"),
      _el$13 = _$createTextNode(`Effort/variant: `),
      _el$14 = _$createElement("text"),
      _el$15 = _$createTextNode(`Elapsed: `),
      _el$16 = _$createElement("text"),
      _el$17 = _$createTextNode(`Child session ID: `),
      _el$18 = _$createElement("text"),
      _el$19 = _$createTextNode(`Mode: `),
      _el$20 = _$createElement("box"),
      _el$21 = _$createElement("box"),
      _el$22 = _$createElement("text"),
      _el$23 = _$createElement("b"),
      _el$25 = _$createElement("box"),
      _el$26 = _$createElement("text"),
      _el$27 = _$createElement("b");
    _$insertNode(_el$, _el$2);
    _$insertNode(_el$, _el$5);
    _$insertNode(_el$, _el$20);
    _$setProp(_el$, "width", "100%");
    _$setProp(_el$, "flexDirection", "column");
    _$setProp(_el$, "padding", 1);
    _$setProp(_el$, "gap", 1);
    _$insertNode(_el$2, _el$3);
    _$insertNode(_el$3, _$createTextNode(`Subagent details`));
    _$insertNode(_el$5, _el$6);
    _$insertNode(_el$5, _el$8);
    _$insertNode(_el$5, _el$0);
    _$insertNode(_el$5, _el$10);
    _$insertNode(_el$5, _el$12);
    _$insertNode(_el$5, _el$14);
    _$insertNode(_el$5, _el$16);
    _$insertNode(_el$5, _el$18);
    _$setProp(_el$5, "flexDirection", "column");
    _$insertNode(_el$6, _el$7);
    _$insert(_el$6, () => taskAgent(part() ?? fallback().part), null);
    _$insertNode(_el$8, _el$9);
    _$setProp(_el$8, "wrapMode", "word");
    _$insert(_el$8, () => taskDescription(part() ?? fallback().part), null);
    _$insertNode(_el$0, _el$1);
    _$insert(_el$0, () => taskStatusLabel(part() ?? fallback().part, childSessionID() ? props.api.state.session.status(childSessionID()) : undefined), null);
    _$insertNode(_el$10, _el$11);
    _$insert(_el$10, () => modelName(props.api, model()), null);
    _$insertNode(_el$12, _el$13);
    _$insert(_el$12, () => taskVariantLabel(model()) ?? "pending", null);
    _$insertNode(_el$14, _el$15);
    _$insert(_el$14, () => elapsedLabel(props.now() - props.startedAt(part() ?? fallback().part)), null);
    _$insertNode(_el$16, _el$17);
    _$insert(_el$16, () => childSessionID() ?? "Waiting for child session", null);
    _$insertNode(_el$18, _el$19);
    _$insert(_el$18, () => taskModeLabel(part() ?? fallback().part), null);
    _$insertNode(_el$20, _el$21);
    _$insertNode(_el$20, _el$25);
    _$setProp(_el$20, "flexDirection", "row");
    _$setProp(_el$20, "gap", 2);
    _$insertNode(_el$21, _el$22);
    _$setProp(_el$21, "onMouseUp", openSession);
    _$insertNode(_el$22, _el$23);
    _$insertNode(_el$23, _$createTextNode(`Open Session`));
    _$insertNode(_el$25, _el$26);
    _$insertNode(_el$26, _el$27);
    _$insertNode(_el$27, _$createTextNode(`Close`));
    _$effect(_p$ => {
      var _v$ = props.api.theme.current.text,
        _v$2 = props.api.theme.current.text,
        _v$3 = props.api.theme.current.textMuted,
        _v$4 = props.api.theme.current.textMuted,
        _v$5 = props.api.theme.current.textMuted,
        _v$6 = props.api.theme.current.textMuted,
        _v$7 = props.api.theme.current.textMuted,
        _v$8 = props.api.theme.current.textMuted,
        _v$9 = props.api.theme.current.textMuted,
        _v$0 = canOpen() ? props.api.theme.current.primary : props.api.theme.current.textMuted,
        _v$1 = props.close,
        _v$10 = props.api.theme.current.primary;
      _v$ !== _p$.e && (_p$.e = _$setProp(_el$2, "fg", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp(_el$6, "fg", _v$2, _p$.t));
      _v$3 !== _p$.a && (_p$.a = _$setProp(_el$8, "fg", _v$3, _p$.a));
      _v$4 !== _p$.o && (_p$.o = _$setProp(_el$0, "fg", _v$4, _p$.o));
      _v$5 !== _p$.i && (_p$.i = _$setProp(_el$10, "fg", _v$5, _p$.i));
      _v$6 !== _p$.n && (_p$.n = _$setProp(_el$12, "fg", _v$6, _p$.n));
      _v$7 !== _p$.s && (_p$.s = _$setProp(_el$14, "fg", _v$7, _p$.s));
      _v$8 !== _p$.h && (_p$.h = _$setProp(_el$16, "fg", _v$8, _p$.h));
      _v$9 !== _p$.r && (_p$.r = _$setProp(_el$18, "fg", _v$9, _p$.r));
      _v$0 !== _p$.d && (_p$.d = _$setProp(_el$22, "fg", _v$0, _p$.d));
      _v$1 !== _p$.l && (_p$.l = _$setProp(_el$25, "onMouseUp", _v$1, _p$.l));
      _v$10 !== _p$.u && (_p$.u = _$setProp(_el$26, "fg", _v$10, _p$.u));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined,
      i: undefined,
      n: undefined,
      s: undefined,
      h: undefined,
      r: undefined,
      d: undefined,
      l: undefined,
      u: undefined
    });
    return _el$;
  })();
}
function TaskCard(props) {
  // The call ID is stable, while the actual ToolPart is re-read after each event.
  // This prevents cards from retaining a stale part object after a state update.
  const livePart = createMemo(() => props.tasksByCallID().get(props.callID));
  const part = () => livePart() ?? props.fallbackFor(props.callID)?.part;
  const childSession = () => {
    props.revision();
    const current = part();
    if (!current) return undefined;
    const sessionID = taskSessionID(current);
    return sessionID ? props.api.state.session.get(sessionID) : undefined;
  };
  const model = () => {
    props.revision();
    const current = part();
    return current ? resolvedModel(props.api, current, childSession(), taskSessionID(current)) : undefined;
  };
  const elapsed = () => {
    const current = part();
    return current ? elapsedLabel(props.now() - props.startedAt(current)) : "";
  };
  const openDetails = () => {
    if (props.api.renderer.getSelection()?.getSelectedText()) return;
    const part = livePart();
    if (!part) return;
    props.remember(part);
    props.openPopup(props.callID, part);
  };
  return (() => {
    var _el$29 = _$createElement("box"),
      _el$30 = _$createElement("box"),
      _el$31 = _$createElement("text"),
      _el$32 = _$createElement("b"),
      _el$33 = _$createElement("box"),
      _el$34 = _$createElement("text"),
      _el$35 = _$createElement("box"),
      _el$36 = _$createElement("text"),
      _el$37 = _$createElement("box"),
      _el$38 = _$createElement("text");
    _$insertNode(_el$29, _el$30);
    _$insertNode(_el$29, _el$35);
    _$setProp(_el$29, "width", "100%");
    _$setProp(_el$29, "height", 2);
    _$setProp(_el$29, "overflow", "hidden");
    _$setProp(_el$29, "onMouseUp", openDetails);
    _$insertNode(_el$30, _el$31);
    _$insertNode(_el$30, _el$33);
    _$setProp(_el$30, "width", "100%");
    _$setProp(_el$30, "height", 1);
    _$setProp(_el$30, "flexDirection", "row");
    _$setProp(_el$30, "overflow", "hidden");
    _$insertNode(_el$31, _el$32);
    _$setProp(_el$31, "flexGrow", 1);
    _$setProp(_el$31, "flexShrink", 1);
    _$setProp(_el$31, "minWidth", 0);
    _$setProp(_el$31, "wrapMode", "none");
    _$setProp(_el$31, "truncate", true);
    _$insert(_el$32, (() => {
      var _c$ = _$memo(() => !!part());
      return () => _c$() ? taskAgent(part()) : "subagent";
    })());
    _$insertNode(_el$33, _el$34);
    _$setProp(_el$33, "flexShrink", 1);
    _$setProp(_el$33, "minWidth", 0);
    _$setProp(_el$33, "maxWidth", 28);
    _$setProp(_el$33, "marginLeft", 1);
    _$setProp(_el$33, "flexDirection", "row");
    _$setProp(_el$34, "flexGrow", 1);
    _$setProp(_el$34, "flexShrink", 1);
    _$setProp(_el$34, "minWidth", 0);
    _$setProp(_el$34, "wrapMode", "none");
    _$setProp(_el$34, "truncate", true);
    _$insert(_el$34, () => modelName(props.api, model()));
    _$insert(_el$33, _$createComponent(Show, {
      get when() {
        return taskVariantLabel(model());
      },
      get fallback() {
        return _$createComponent(Show, {
          get when() {
            return model();
          },
          get children() {
            var _el$39 = _$createElement("text");
            _$insertNode(_el$39, _$createTextNode(`· pending`));
            _$setProp(_el$39, "flexShrink", 0);
            _$setProp(_el$39, "marginLeft", 1);
            _$setProp(_el$39, "wrapMode", "none");
            _$setProp(_el$39, "truncate", true);
            _$effect(_$p => _$setProp(_el$39, "fg", props.api.theme.current.textMuted, _$p));
            return _el$39;
          }
        });
      },
      children: variant => (() => {
        var _el$41 = _$createElement("text"),
          _el$42 = _$createTextNode(`· `);
        _$insertNode(_el$41, _el$42);
        _$setProp(_el$41, "flexShrink", 0);
        _$setProp(_el$41, "marginLeft", 1);
        _$setProp(_el$41, "wrapMode", "none");
        _$setProp(_el$41, "truncate", true);
        _$insert(_el$41, variant, null);
        _$effect(_$p => _$setProp(_el$41, "fg", props.api.theme.current.textMuted, _$p));
        return _el$41;
      })()
    }), null);
    _$insertNode(_el$35, _el$36);
    _$insertNode(_el$35, _el$37);
    _$setProp(_el$35, "width", "100%");
    _$setProp(_el$35, "height", 1);
    _$setProp(_el$35, "flexDirection", "row");
    _$setProp(_el$35, "overflow", "hidden");
    _$setProp(_el$36, "flexGrow", 1);
    _$setProp(_el$36, "flexShrink", 1);
    _$setProp(_el$36, "minWidth", 0);
    _$setProp(_el$36, "wrapMode", "none");
    _$setProp(_el$36, "truncate", true);
    _$insert(_el$36, (() => {
      var _c$2 = _$memo(() => !!part());
      return () => _c$2() ? taskDescription(part()) : "Working";
    })());
    _$insertNode(_el$37, _el$38);
    _$setProp(_el$37, "width", 8);
    _$setProp(_el$37, "flexShrink", 0);
    _$setProp(_el$37, "justifyContent", "flex-end");
    _$setProp(_el$38, "wrapMode", "none");
    _$setProp(_el$38, "truncate", true);
    _$insert(_el$38, elapsed);
    _$effect(_p$ => {
      var _v$11 = props.api.theme.current.text,
        _v$12 = props.api.theme.current.textMuted,
        _v$13 = props.api.theme.current.textMuted,
        _v$14 = props.api.theme.current.textMuted;
      _v$11 !== _p$.e && (_p$.e = _$setProp(_el$31, "fg", _v$11, _p$.e));
      _v$12 !== _p$.t && (_p$.t = _$setProp(_el$34, "fg", _v$12, _p$.t));
      _v$13 !== _p$.a && (_p$.a = _$setProp(_el$36, "fg", _v$13, _p$.a));
      _v$14 !== _p$.o && (_p$.o = _$setProp(_el$38, "fg", _v$14, _p$.o));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    });
    return _el$29;
  })();
}
function RunningSubagents(props) {
  const [scopeSessionID, setScopeSessionID] = createSignal();
  const [hydratedMessages, setHydratedMessages] = createSignal([]);
  const [revision, setRevision] = createSignal(0);
  const [now, setNow] = createSignal(Date.now());
  const firstSeen = new Map();
  const fallbacks = new Map();
  const [openPopup, setOpenPopup] = createSignal();
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
  const allTaskParts = createMemo(() => {
    revision();
    const sessionID = scopeSessionID();
    if (!sessionID) return [];
    const messages = props.api.state.session.messages(sessionID);
    const parts = messages.length ? messages.flatMap(message => props.api.state.part(message.id)) : hydratedMessages().flatMap(message => message.parts);
    return parts.filter(isTaskPart);
  });
  const visibleTaskParts = createMemo(() => allTaskParts().filter(part => isVisibleTask(part, props.api.state.session.status)));
  // Popups need the direct parent's complete/error parts too, even after their
  // visible card has gone away.
  const tasksByCallID = createMemo(() => new Map(allTaskParts().map(part => [part.callID, part])));
  const taskCallIDs = createMemo(() => visibleTaskParts().map(part => part.callID));
  const activeChildSessions = createMemo(() => new Set(visibleTaskParts().map(taskSessionID).filter(sessionID => Boolean(sessionID))));
  const remember = part => {
    const sessionID = taskSessionID(part);
    const session = sessionID ? props.api.state.session.get(sessionID) : undefined;
    fallbacks.set(part.callID, {
      part,
      ...(sessionID ? {
        sessionID
      } : {}),
      ...(session ? {
        session
      } : {})
    });
  };
  const rememberLiveTasks = () => {
    revision();
    for (const part of allTaskParts()) remember(part);
  };
  createEffect(rememberLiveTasks);
  const popupPart = createMemo(() => {
    revision();
    const callID = openPopup()?.callID;
    return callID ? tasksByCallID().get(callID) ?? fallbacks.get(callID)?.part : undefined;
  });
  const popupSessionID = createMemo(() => {
    const callID = openPopup()?.callID;
    const part = popupPart();
    return (part ? taskSessionID(part) : undefined) ?? (callID ? fallbacks.get(callID)?.sessionID : undefined);
  });
  const startedAt = part => {
    if (part.state.status !== "pending") return part.state.time.start;
    const existing = firstSeen.get(part.callID);
    if (existing !== undefined) return existing;
    const value = now();
    firstSeen.set(part.callID, value);
    return value;
  };
  const releasePopup = ownership => {
    if (openPopup()?.token === ownership.token) setOpenPopup(undefined);
  };
  const closePopup = ownership => {
    if (openPopup()?.token !== ownership.token) return;
    setOpenPopup(undefined);
    props.api.ui.dialog.clear();
  };
  const showPopup = (callID, part) => {
    const ownership = {
      callID,
      token: Symbol(callID)
    };
    setOpenPopup(ownership);
    props.api.ui.dialog.replace(() => _$createComponent(TaskDetails, {
      get api() {
        return props.api;
      },
      callID: callID,
      get currentSessionID() {
        return props.sessionID;
      },
      fallbackPart: part,
      tasksByCallID: tasksByCallID,
      fallbackFor: id => fallbacks.get(id),
      revision: revision,
      now: now,
      startedAt: startedAt,
      close: () => closePopup(ownership)
    }), () => releasePopup(ownership));
  };
  const unregister = [];
  let timer;
  onMount(() => {
    const syncCurrentSession = session => {
      if (session.id === props.sessionID) void selectSession(session.id, session);
      if (session.parentID === scopeSessionID() || activeChildSessions().has(session.id) || session.id === popupSessionID()) {
        setRevision(value => value + 1);
      }
    };
    const refreshSession = sessionID => {
      if (sessionID === scopeSessionID() || activeChildSessions().has(sessionID) || sessionID === popupSessionID()) {
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
    const ownership = openPopup();
    if (ownership) closePopup(ownership);
  });
  return (() => {
    var _el$43 = _$createElement("box"),
      _el$44 = _$createElement("text"),
      _el$45 = _$createElement("b"),
      _el$47 = _$createElement("span");
    _$insertNode(_el$43, _el$44);
    _$setProp(_el$43, "overflow", "hidden");
    _$insertNode(_el$44, _el$45);
    _$insertNode(_el$44, _el$47);
    _$insertNode(_el$45, _$createTextNode(`Subagents`));
    _$insert(_el$47, (() => {
      var _c$3 = _$memo(() => !!visibleTaskParts().length);
      return () => _c$3() ? ` (${visibleTaskParts().length} running)` : "";
    })());
    _$insert(_el$43, _$createComponent(Show, {
      get when() {
        return taskCallIDs().length > 0;
      },
      get fallback() {
        return (() => {
          var _el$48 = _$createElement("text");
          _$insertNode(_el$48, _$createTextNode(`No subagent running`));
          _$effect(_$p => _$setProp(_el$48, "fg", props.api.theme.current.textMuted, _$p));
          return _el$48;
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
            tasksByCallID: tasksByCallID,
            fallbackFor: id => fallbacks.get(id),
            remember: remember,
            revision: revision,
            now: now,
            startedAt: startedAt,
            openPopup: showPopup
          })
        });
      }
    }), null);
    _$effect(_p$ => {
      var _v$15 = props.api.theme.current.text,
        _v$16 = {
          fg: props.api.theme.current.textMuted
        };
      _v$15 !== _p$.e && (_p$.e = _$setProp(_el$44, "fg", _v$15, _p$.e));
      _v$16 !== _p$.t && (_p$.t = _$setProp(_el$47, "style", _v$16, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$43;
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