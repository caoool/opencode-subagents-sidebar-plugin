import { use as _$use } from "@opentui/solid";
import { createComponent as _$createComponent } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { memo as _$memo } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
/** @jsxImportSource @opentui/solid */

import { Portal, useTerminalDimensions } from "@opentui/solid";
import { elapsedLabel, latestAssistantActivity } from "./activity.js";
import { placePopover } from "./popover.js";
import { canOpenTaskSession, isTaskPart, isVisibleTask, resolveTaskModel, taskAgent, taskDescription, taskModeLabel, taskModelLabel, taskSessionID, taskStatusLabel, taskVariantLabel } from "./tasks.js";
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from "solid-js";
const POPOVER_SIZE = {
  width: 52,
  height: 14
};
const POPOVER_Z_INDEX = 100;
function resolvedModel(api, part, session, sessionID) {
  return resolveTaskModel(part, session, sessionID ? api.state.session.messages(sessionID) : []);
}
function modelName(api, model) {
  const name = model ? api.state.provider.find(provider => provider.id === model.providerID)?.models[model.modelID]?.name : undefined;
  return taskModelLabel(model, name);
}
function TaskPopover(props) {
  const viewport = useTerminalDimensions();
  const [hydratedChildMessages, setHydratedChildMessages] = createSignal();
  const placement = createMemo(() => placePopover(props.ownership().anchor, viewport(), POPOVER_SIZE));
  const callID = () => props.ownership().callID;
  let portalWrapper;
  let hydrationRequest = 0;
  const fallback = () => {
    const known = props.fallbackFor(callID());
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
    return props.tasksByCallID().get(callID()) ?? fallback().part;
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
  const liveChildMessages = createMemo(() => {
    props.revision();
    const sessionID = childSessionID();
    if (!sessionID) return undefined;
    const messages = props.api.state.session.messages(sessionID);
    const parts = new Map();
    for (const message of messages) {
      const messageParts = props.api.state.part(message.id);
      parts.set(message.id, messageParts);
    }
    return {
      sessionID,
      messages,
      parts
    };
  });
  const ownsHydration = (token, sessionID, request) => {
    if (props.api.lifecycle.signal.aborted || request !== hydrationRequest) return false;
    return props.ownership().token === token && childSessionID() === sessionID;
  };
  const hydrateChildMessages = async (token, sessionID, request) => {
    try {
      const result = await props.api.client.session.messages({
        sessionID,
        directory: props.api.state.path.directory
      }, {
        throwOnError: true
      });
      if (!ownsHydration(token, sessionID, request)) return;
      setHydratedChildMessages({
        token,
        sessionID,
        messages: result.data
      });
    } catch {}
  };
  createEffect(() => {
    props.revision();
    props.now();
    const ownership = props.ownership();
    const sessionID = childSessionID();
    if (!sessionID) {
      hydrationRequest += 1;
      setHydratedChildMessages(undefined);
      return;
    }
    const request = ++hydrationRequest;
    void hydrateChildMessages(ownership.token, sessionID, request);
  });
  const latestResponse = createMemo(() => {
    const ownership = props.ownership();
    const sessionID = childSessionID();
    if (!sessionID) return undefined;
    const live = liveChildMessages();
    const liveActivity = live ? latestAssistantActivity(live.messages, messageID => live.parts.get(messageID) ?? []) : undefined;
    if (liveActivity) return liveActivity;
    const hydrated = hydratedChildMessages();
    if (!hydrated || hydrated.token !== ownership.token || hydrated.sessionID !== sessionID) return undefined;
    const parts = new Map(hydrated.messages.map(message => [message.info.id, message.parts]));
    return latestAssistantActivity(hydrated.messages.map(message => message.info), messageID => parts.get(messageID) ?? []);
  });
  const responseLabel = () => latestResponse() ?? (childSessionID() ? "Waiting for subagent activity" : "Waiting for child session");
  const stopInside = event => event.stopPropagation();
  const openSession = event => {
    event.stopPropagation();
    const sessionID = childSessionID();
    if (!canOpen() || !sessionID) return;
    props.api.route.navigate("session", {
      sessionID
    });
    props.close();
  };
  const closePopover = event => {
    event.stopPropagation();
    props.close();
  };
  const applyPortalOverlay = (next = viewport()) => {
    const wrapper = portalWrapper;
    if (!wrapper || wrapper.isDestroyed) return;
    wrapper.position = "absolute";
    wrapper.left = 0;
    wrapper.top = 0;
    wrapper.width = next.width;
    wrapper.height = next.height;
    wrapper.zIndex = POPOVER_Z_INDEX;
    wrapper.focusable = false;
  };
  createEffect(() => applyPortalOverlay(viewport()));
  onCleanup(() => {
    hydrationRequest += 1;
    portalWrapper = undefined;
  });
  return _$createComponent(Portal, {
    get mount() {
      return props.api.renderer.root;
    },
    ref: element => {
      portalWrapper = element;
      applyPortalOverlay();
    },
    get children() {
      var _el$ = _$createElement("box"),
        _el$2 = _$createElement("box"),
        _el$3 = _$createElement("text"),
        _el$4 = _$createElement("b"),
        _el$6 = _$createElement("text"),
        _el$7 = _$createTextNode(`Agent: `),
        _el$8 = _$createElement("text"),
        _el$9 = _$createTextNode(`Assigned: `),
        _el$0 = _$createElement("text"),
        _el$1 = _$createTextNode(`Current: `),
        _el$10 = _$createElement("text"),
        _el$11 = _$createTextNode(`Status: `),
        _el$12 = _$createElement("text"),
        _el$13 = _$createTextNode(`Model: `),
        _el$14 = _$createTextNode(` · `),
        _el$15 = _$createElement("text"),
        _el$16 = _$createTextNode(` · `),
        _el$17 = _$createElement("text"),
        _el$18 = _$createTextNode(`Child: `),
        _el$19 = _$createElement("box"),
        _el$20 = _$createElement("box"),
        _el$21 = _$createElement("text"),
        _el$22 = _$createElement("b"),
        _el$24 = _$createElement("box"),
        _el$25 = _$createElement("text"),
        _el$26 = _$createElement("b");
      _$insertNode(_el$, _el$2);
      _$setProp(_el$, "width", "100%");
      _$setProp(_el$, "height", "100%");
      _$setProp(_el$, "focusable", false);
      _$insertNode(_el$2, _el$3);
      _$insertNode(_el$2, _el$6);
      _$insertNode(_el$2, _el$8);
      _$insertNode(_el$2, _el$0);
      _$insertNode(_el$2, _el$10);
      _$insertNode(_el$2, _el$12);
      _$insertNode(_el$2, _el$15);
      _$insertNode(_el$2, _el$17);
      _$insertNode(_el$2, _el$19);
      _$setProp(_el$2, "position", "absolute");
      _$setProp(_el$2, "focusable", false);
      _$setProp(_el$2, "live", true);
      _$setProp(_el$2, "border", true);
      _$setProp(_el$2, "padding", 1);
      _$setProp(_el$2, "flexDirection", "column");
      _$setProp(_el$2, "overflow", "hidden");
      _$setProp(_el$2, "onMouseUp", stopInside);
      _$insertNode(_el$3, _el$4);
      _$setProp(_el$3, "wrapMode", "none");
      _$setProp(_el$3, "truncate", true);
      _$insertNode(_el$4, _$createTextNode(`Subagent details`));
      _$insertNode(_el$6, _el$7);
      _$setProp(_el$6, "wrapMode", "none");
      _$setProp(_el$6, "truncate", true);
      _$insert(_el$6, () => taskAgent(part() ?? fallback().part), null);
      _$insertNode(_el$8, _el$9);
      _$setProp(_el$8, "wrapMode", "none");
      _$setProp(_el$8, "truncate", true);
      _$insert(_el$8, () => taskDescription(part() ?? fallback().part), null);
      _$insertNode(_el$0, _el$1);
      _$setProp(_el$0, "wrapMode", "none");
      _$setProp(_el$0, "truncate", true);
      _$insert(_el$0, responseLabel, null);
      _$insertNode(_el$10, _el$11);
      _$setProp(_el$10, "wrapMode", "none");
      _$setProp(_el$10, "truncate", true);
      _$insert(_el$10, () => taskStatusLabel(part() ?? fallback().part, childSessionID() ? props.api.state.session.status(childSessionID()) : undefined), null);
      _$insertNode(_el$12, _el$13);
      _$insertNode(_el$12, _el$14);
      _$setProp(_el$12, "wrapMode", "none");
      _$setProp(_el$12, "truncate", true);
      _$insert(_el$12, () => modelName(props.api, model()), _el$14);
      _$insert(_el$12, () => taskVariantLabel(model()) ?? "pending", null);
      _$insertNode(_el$15, _el$16);
      _$setProp(_el$15, "wrapMode", "none");
      _$setProp(_el$15, "truncate", true);
      _$insert(_el$15, () => taskModeLabel(part() ?? fallback().part), _el$16);
      _$insert(_el$15, () => elapsedLabel(props.now() - props.startedAt(part() ?? fallback().part)), null);
      _$insertNode(_el$17, _el$18);
      _$setProp(_el$17, "wrapMode", "none");
      _$setProp(_el$17, "truncate", true);
      _$insert(_el$17, () => childSessionID() ?? "Waiting for child session", null);
      _$insertNode(_el$19, _el$20);
      _$insertNode(_el$19, _el$24);
      _$setProp(_el$19, "flexDirection", "row");
      _$setProp(_el$19, "gap", 2);
      _$insertNode(_el$20, _el$21);
      _$setProp(_el$20, "onMouseUp", openSession);
      _$insertNode(_el$21, _el$22);
      _$insertNode(_el$22, _$createTextNode(`Open Session`));
      _$insertNode(_el$24, _el$25);
      _$setProp(_el$24, "onMouseUp", closePopover);
      _$insertNode(_el$25, _el$26);
      _$insertNode(_el$26, _$createTextNode(`Close`));
      _$effect(_p$ => {
        var _v$ = props.close,
          _v$2 = placement().left,
          _v$3 = placement().top,
          _v$4 = placement().width,
          _v$5 = placement().height,
          _v$6 = props.api.theme.current.borderActive,
          _v$7 = props.api.theme.current.backgroundPanel,
          _v$8 = props.api.theme.current.text,
          _v$9 = props.api.theme.current.text,
          _v$0 = props.api.theme.current.textMuted,
          _v$1 = props.api.theme.current.textMuted,
          _v$10 = props.api.theme.current.textMuted,
          _v$11 = props.api.theme.current.textMuted,
          _v$12 = props.api.theme.current.textMuted,
          _v$13 = props.api.theme.current.textMuted,
          _v$14 = canOpen() ? props.api.theme.current.primary : props.api.theme.current.textMuted,
          _v$15 = props.api.theme.current.primary;
        _v$ !== _p$.e && (_p$.e = _$setProp(_el$, "onMouseUp", _v$, _p$.e));
        _v$2 !== _p$.t && (_p$.t = _$setProp(_el$2, "left", _v$2, _p$.t));
        _v$3 !== _p$.a && (_p$.a = _$setProp(_el$2, "top", _v$3, _p$.a));
        _v$4 !== _p$.o && (_p$.o = _$setProp(_el$2, "width", _v$4, _p$.o));
        _v$5 !== _p$.i && (_p$.i = _$setProp(_el$2, "height", _v$5, _p$.i));
        _v$6 !== _p$.n && (_p$.n = _$setProp(_el$2, "borderColor", _v$6, _p$.n));
        _v$7 !== _p$.s && (_p$.s = _$setProp(_el$2, "backgroundColor", _v$7, _p$.s));
        _v$8 !== _p$.h && (_p$.h = _$setProp(_el$3, "fg", _v$8, _p$.h));
        _v$9 !== _p$.r && (_p$.r = _$setProp(_el$6, "fg", _v$9, _p$.r));
        _v$0 !== _p$.d && (_p$.d = _$setProp(_el$8, "fg", _v$0, _p$.d));
        _v$1 !== _p$.l && (_p$.l = _$setProp(_el$0, "fg", _v$1, _p$.l));
        _v$10 !== _p$.u && (_p$.u = _$setProp(_el$10, "fg", _v$10, _p$.u));
        _v$11 !== _p$.c && (_p$.c = _$setProp(_el$12, "fg", _v$11, _p$.c));
        _v$12 !== _p$.w && (_p$.w = _$setProp(_el$15, "fg", _v$12, _p$.w));
        _v$13 !== _p$.m && (_p$.m = _$setProp(_el$17, "fg", _v$13, _p$.m));
        _v$14 !== _p$.f && (_p$.f = _$setProp(_el$21, "fg", _v$14, _p$.f));
        _v$15 !== _p$.y && (_p$.y = _$setProp(_el$25, "fg", _v$15, _p$.y));
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
        u: undefined,
        c: undefined,
        w: undefined,
        m: undefined,
        f: undefined,
        y: undefined
      });
      return _el$;
    }
  });
}
function ModelVariant(props) {
  return (() => {
    var _el$28 = _$createElement("box"),
      _el$29 = _$createElement("text");
    _$insertNode(_el$28, _el$29);
    _$setProp(_el$28, "flexShrink", 1);
    _$setProp(_el$28, "minWidth", 0);
    _$setProp(_el$28, "maxWidth", 28);
    _$setProp(_el$28, "marginLeft", 1);
    _$setProp(_el$28, "flexDirection", "row");
    _$setProp(_el$29, "flexGrow", 1);
    _$setProp(_el$29, "flexShrink", 1);
    _$setProp(_el$29, "minWidth", 0);
    _$setProp(_el$29, "wrapMode", "none");
    _$setProp(_el$29, "truncate", true);
    _$insert(_el$29, () => modelName(props.api, props.model()));
    _$insert(_el$28, _$createComponent(Show, {
      get when() {
        return taskVariantLabel(props.model());
      },
      get fallback() {
        return _$createComponent(Show, {
          get when() {
            return props.model();
          },
          get children() {
            return [(() => {
              var _el$30 = _$createElement("text");
              _$insertNode(_el$30, _$createTextNode(`·`));
              _$setProp(_el$30, "flexShrink", 0);
              _$setProp(_el$30, "marginLeft", 1);
              _$setProp(_el$30, "wrapMode", "none");
              _$effect(_$p => _$setProp(_el$30, "fg", props.api.theme.current.textMuted, _$p));
              return _el$30;
            })(), (() => {
              var _el$32 = _$createElement("text"),
                _el$33 = _$createElement("b");
              _$insertNode(_el$32, _el$33);
              _$setProp(_el$32, "flexShrink", 0);
              _$setProp(_el$32, "marginLeft", 1);
              _$setProp(_el$32, "wrapMode", "none");
              _$setProp(_el$32, "truncate", true);
              _$insertNode(_el$33, _$createTextNode(`pending`));
              _$effect(_$p => _$setProp(_el$32, "fg", props.api.theme.current.warning, _$p));
              return _el$32;
            })()];
          }
        });
      },
      children: variant => [(() => {
        var _el$35 = _$createElement("text");
        _$insertNode(_el$35, _$createTextNode(`·`));
        _$setProp(_el$35, "flexShrink", 0);
        _$setProp(_el$35, "marginLeft", 1);
        _$setProp(_el$35, "wrapMode", "none");
        _$effect(_$p => _$setProp(_el$35, "fg", props.api.theme.current.textMuted, _$p));
        return _el$35;
      })(), (() => {
        var _el$37 = _$createElement("text"),
          _el$38 = _$createElement("b");
        _$insertNode(_el$37, _el$38);
        _$setProp(_el$37, "flexShrink", 0);
        _$setProp(_el$37, "marginLeft", 1);
        _$setProp(_el$37, "wrapMode", "none");
        _$setProp(_el$37, "truncate", true);
        _$insert(_el$38, variant);
        _$effect(_$p => _$setProp(_el$37, "fg", props.api.theme.current.warning, _$p));
        return _el$37;
      })()]
    }), null);
    _$effect(_$p => _$setProp(_el$29, "fg", props.api.theme.current.text, _$p));
    return _el$28;
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
  let card;
  let lastAnchor;
  const anchor = () => card && {
    x: card.screenX,
    y: card.screenY,
    width: card.width,
    height: card.height
  };
  const updateAnchor = () => {
    const current = anchor();
    if (!current || lastAnchor && lastAnchor.x === current.x && lastAnchor.y === current.y && lastAnchor.width === current.width && lastAnchor.height === current.height) {
      return;
    }
    lastAnchor = current;
    props.updatePopupAnchor(props.callID, current);
  };
  onCleanup(() => {
    // The popover owns its last reported rect, so losing this card must not
    // reset its placement before the user explicitly closes it.
    card = undefined;
    lastAnchor = undefined;
  });
  const openDetails = () => {
    if (props.api.renderer.getSelection()?.getSelectedText()) return;
    const part = livePart();
    const currentAnchor = anchor();
    if (!part || !currentAnchor) return;
    props.remember(part);
    props.openPopup(props.callID, currentAnchor);
  };
  return (() => {
    var _el$39 = _$createElement("box"),
      _el$40 = _$createElement("box"),
      _el$41 = _$createElement("text"),
      _el$42 = _$createElement("b"),
      _el$43 = _$createElement("box"),
      _el$44 = _$createElement("text"),
      _el$45 = _$createElement("box"),
      _el$46 = _$createElement("text");
    _$insertNode(_el$39, _el$40);
    _$insertNode(_el$39, _el$43);
    _$use(element => {
      card = element;
      updateAnchor();
    }, _el$39);
    _$setProp(_el$39, "onSizeChange", updateAnchor);
    _$setProp(_el$39, "renderBefore", updateAnchor);
    _$setProp(_el$39, "width", "100%");
    _$setProp(_el$39, "height", 2);
    _$setProp(_el$39, "flexDirection", "column");
    _$setProp(_el$39, "overflow", "hidden");
    _$setProp(_el$39, "onMouseUp", openDetails);
    _$insertNode(_el$40, _el$41);
    _$setProp(_el$40, "width", "100%");
    _$setProp(_el$40, "height", 1);
    _$setProp(_el$40, "flexDirection", "row");
    _$setProp(_el$40, "overflow", "hidden");
    _$insertNode(_el$41, _el$42);
    _$setProp(_el$41, "flexGrow", 1);
    _$setProp(_el$41, "flexShrink", 1);
    _$setProp(_el$41, "minWidth", 0);
    _$setProp(_el$41, "wrapMode", "none");
    _$setProp(_el$41, "truncate", true);
    _$insert(_el$42, (() => {
      var _c$ = _$memo(() => !!part());
      return () => _c$() ? taskAgent(part()) : "subagent";
    })());
    _$insert(_el$40, _$createComponent(ModelVariant, {
      get api() {
        return props.api;
      },
      model: model
    }), null);
    _$insertNode(_el$43, _el$44);
    _$insertNode(_el$43, _el$45);
    _$setProp(_el$43, "width", "100%");
    _$setProp(_el$43, "height", 1);
    _$setProp(_el$43, "flexDirection", "row");
    _$setProp(_el$43, "overflow", "hidden");
    _$setProp(_el$44, "flexGrow", 1);
    _$setProp(_el$44, "flexShrink", 1);
    _$setProp(_el$44, "minWidth", 0);
    _$setProp(_el$44, "wrapMode", "none");
    _$setProp(_el$44, "truncate", true);
    _$insert(_el$44, (() => {
      var _c$2 = _$memo(() => !!part());
      return () => _c$2() ? taskDescription(part()) : "Working";
    })());
    _$insertNode(_el$45, _el$46);
    _$setProp(_el$45, "width", 8);
    _$setProp(_el$45, "flexShrink", 0);
    _$setProp(_el$45, "flexDirection", "row");
    _$setProp(_el$45, "justifyContent", "flex-end");
    _$setProp(_el$46, "wrapMode", "none");
    _$setProp(_el$46, "truncate", true);
    _$insert(_el$46, elapsed);
    _$effect(_p$ => {
      var _v$16 = props.api.theme.current.text,
        _v$17 = props.api.theme.current.textMuted,
        _v$18 = props.api.theme.current.textMuted;
      _v$16 !== _p$.e && (_p$.e = _$setProp(_el$41, "fg", _v$16, _p$.e));
      _v$17 !== _p$.t && (_p$.t = _$setProp(_el$44, "fg", _v$17, _p$.t));
      _v$18 !== _p$.a && (_p$.a = _$setProp(_el$46, "fg", _v$18, _p$.a));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined
    });
    return _el$39;
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
  createEffect(on(() => props.sessionID, (sessionID, previousSessionID) => {
    if (previousSessionID !== undefined && sessionID !== previousSessionID) setOpenPopup(undefined);
    void selectSession(sessionID);
  }));
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
  const closePopup = ownership => {
    if (openPopup()?.token !== ownership.token) return;
    setOpenPopup(undefined);
  };
  const showPopup = (callID, anchor) => {
    const ownership = {
      callID,
      token: Symbol(callID),
      anchor
    };
    setOpenPopup(ownership);
  };
  const updatePopupAnchor = (callID, anchor) => {
    const ownership = openPopup();
    if (!ownership || ownership.callID !== callID) return;
    if (ownership.anchor.x === anchor.x && ownership.anchor.y === anchor.y && ownership.anchor.width === anchor.width && ownership.anchor.height === anchor.height) {
      return;
    }
    setOpenPopup({
      ...ownership,
      anchor
    });
  };
  const dismissForHostDialog = () => {
    if (openPopup() && props.api.ui.dialog.open) setOpenPopup(undefined);
  };
  const dismissForHostDialogFrame = async () => {
    dismissForHostDialog();
  };
  createEffect(dismissForHostDialog);
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
    unregister.push(() => {
      props.api.renderer.removeFrameCallback(dismissForHostDialogFrame);
    }, props.api.event.on("session.created", event => syncCurrentSession(event.properties.info)), props.api.event.on("session.updated", event => syncCurrentSession(event.properties.info)), props.api.event.on("message.updated", event => refreshSession(event.properties.sessionID)), props.api.event.on("message.part.updated", event => refreshSession(event.properties.sessionID)), props.api.event.on("message.part.removed", event => refreshSession(event.properties.sessionID)));
    props.api.renderer.setFrameCallback(dismissForHostDialogFrame);
    timer = setInterval(() => setNow(Date.now()), 1_000);
  });
  onCleanup(() => {
    sessionRequest += 1;
    if (timer) clearInterval(timer);
    for (const dispose of unregister) dispose();
    setOpenPopup(undefined);
  });
  return (() => {
    var _el$47 = _$createElement("box"),
      _el$48 = _$createElement("text"),
      _el$49 = _$createElement("b"),
      _el$51 = _$createElement("span");
    _$insertNode(_el$47, _el$48);
    _$setProp(_el$47, "overflow", "hidden");
    _$setProp(_el$47, "flexDirection", "column");
    _$setProp(_el$47, "gap", 1);
    _$insertNode(_el$48, _el$49);
    _$insertNode(_el$48, _el$51);
    _$insertNode(_el$49, _$createTextNode(`Subagents`));
    _$insert(_el$51, (() => {
      var _c$3 = _$memo(() => !!visibleTaskParts().length);
      return () => _c$3() ? ` (${visibleTaskParts().length} running)` : "";
    })());
    _$insert(_el$47, _$createComponent(Show, {
      get when() {
        return taskCallIDs().length > 0;
      },
      get fallback() {
        return (() => {
          var _el$53 = _$createElement("text");
          _$insertNode(_el$53, _$createTextNode(`No subagent running`));
          _$effect(_$p => _$setProp(_el$53, "fg", props.api.theme.current.textMuted, _$p));
          return _el$53;
        })();
      },
      get children() {
        var _el$52 = _$createElement("box");
        _$setProp(_el$52, "width", "100%");
        _$setProp(_el$52, "flexDirection", "column");
        _$setProp(_el$52, "gap", 1);
        _$insert(_el$52, _$createComponent(For, {
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
            openPopup: showPopup,
            updatePopupAnchor: updatePopupAnchor
          })
        }));
        return _el$52;
      }
    }), null);
    _$insert(_el$47, _$createComponent(Show, {
      get when() {
        return openPopup();
      },
      children: ownership => _$createComponent(TaskPopover, {
        get api() {
          return props.api;
        },
        ownership: ownership,
        get currentSessionID() {
          return props.sessionID;
        },
        get fallbackPart() {
          return fallbacks.get(ownership().callID).part;
        },
        tasksByCallID: tasksByCallID,
        fallbackFor: id => fallbacks.get(id),
        revision: revision,
        now: now,
        startedAt: startedAt,
        close: () => closePopup(ownership())
      })
    }), null);
    _$effect(_p$ => {
      var _v$19 = props.api.theme.current.text,
        _v$20 = {
          fg: props.api.theme.current.textMuted
        };
      _v$19 !== _p$.e && (_p$.e = _$setProp(_el$48, "fg", _v$19, _p$.e));
      _v$20 !== _p$.t && (_p$.t = _$setProp(_el$51, "style", _v$20, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$47;
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