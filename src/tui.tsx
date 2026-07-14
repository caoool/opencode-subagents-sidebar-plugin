/** @jsxImportSource @opentui/solid */

import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import type { Message, Part, Session } from "@opencode-ai/sdk/v2"
import type { BoxRenderable } from "@opentui/core"
import { Portal, useTerminalDimensions } from "@opentui/solid"
import { elapsedLabel } from "./activity.js"
import { placePopover, type PopoverAnchor } from "./popover.js"
import {
  canOpenTaskSession,
  isTaskPart,
  isVisibleTask,
  latestAssistantText,
  resolveTaskModel,
  taskAgent,
  taskDescription,
  taskModeLabel,
  taskModelLabel,
  taskSessionID,
  taskStatusLabel,
  taskVariantLabel,
  type VisibleTaskPart,
} from "./tasks.js"
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from "solid-js"

type TaskFallback = {
  part: VisibleTaskPart
  sessionID?: string
  session?: Session
}

type SessionMessageWithParts = {
  info: Message
  parts: ReadonlyArray<Part>
}

type PopupOwnership = {
  callID: string
  token: symbol
  anchor: PopoverAnchor
}

const POPOVER_SIZE = { width: 52, height: 14 }
const POPOVER_Z_INDEX = 100

function resolvedModel(api: TuiPluginApi, part: VisibleTaskPart, session: Session | undefined, sessionID?: string) {
  return resolveTaskModel(part, session, sessionID ? api.state.session.messages(sessionID) : [])
}

function modelName(api: TuiPluginApi, model: ReturnType<typeof resolvedModel>): string {
  const name = model
    ? api.state.provider.find((provider) => provider.id === model.providerID)?.models[model.modelID]?.name
    : undefined
  return taskModelLabel(model, name)
}

function TaskPopover(props: {
  api: TuiPluginApi
  ownership: () => PopupOwnership
  currentSessionID: string
  fallbackPart: VisibleTaskPart
  tasksByCallID: () => Map<string, VisibleTaskPart>
  fallbackFor: (callID: string) => TaskFallback | undefined
  revision: () => number
  now: () => number
  startedAt: (part: VisibleTaskPart) => number
  close: () => void
}) {
  const viewport = useTerminalDimensions()
  const [hydratedChildMessages, setHydratedChildMessages] = createSignal<{
    token: symbol
    sessionID: string
    messages: ReadonlyArray<SessionMessageWithParts>
  }>()
  const placement = createMemo(() => placePopover(props.ownership().anchor, viewport(), POPOVER_SIZE))
  const callID = () => props.ownership().callID
  let portalWrapper: BoxRenderable | undefined
  let hydrationRequest = 0
  let requestedHydration: { token: symbol; sessionID: string } | undefined

  const fallback = (): TaskFallback => {
    const known = props.fallbackFor(callID())
    if (known) return known
    const sessionID = taskSessionID(props.fallbackPart)
    return { part: props.fallbackPart, ...(sessionID ? { sessionID } : {}) }
  }
  const part = createMemo(() => {
    props.revision()
    return props.tasksByCallID().get(callID()) ?? fallback().part
  })
  const childSessionID = () => taskSessionID(part() ?? fallback().part) ?? fallback().sessionID
  const childSession = () => {
    props.revision()
    const sessionID = childSessionID()
    return (sessionID ? props.api.state.session.get(sessionID) : undefined) ?? fallback().session
  }
  const model = createMemo(() => {
    props.revision()
    return resolvedModel(props.api, part() ?? fallback().part, childSession(), childSessionID())
  })
  const canOpen = () => canOpenTaskSession(childSessionID(), props.currentSessionID)
  const liveChildMessages = createMemo(() => {
    props.revision()
    const sessionID = childSessionID()
    if (!sessionID) return undefined

    const messages = props.api.state.session.messages(sessionID)
    const parts = new Map<string, ReadonlyArray<Part>>()
    let hasParts = false
    for (const message of messages) {
      const messageParts = props.api.state.part(message.id)
      parts.set(message.id, messageParts)
      if (messageParts.length) hasParts = true
    }
    return { sessionID, messages, parts, hasParts }
  })
  const ownsHydration = (token: symbol, sessionID: string, request: number): boolean => {
    if (props.api.lifecycle.signal.aborted || request !== hydrationRequest) return false
    return props.ownership().token === token && childSessionID() === sessionID
  }
  const hydrateChildMessages = async (token: symbol, sessionID: string, request: number): Promise<void> => {
    try {
      const result = await props.api.client.session.messages(
        { sessionID, directory: props.api.state.path.directory },
        { throwOnError: true },
      )
      if (!ownsHydration(token, sessionID, request)) return
      if (liveChildMessages()?.hasParts) return
      setHydratedChildMessages({ token, sessionID, messages: result.data })
    } catch {
      if (ownsHydration(token, sessionID, request)) requestedHydration = undefined
    }
  }

  createEffect(() => {
    const ownership = props.ownership()
    const sessionID = childSessionID()
    const live = liveChildMessages()
    if (!sessionID || live?.hasParts) {
      if (requestedHydration) {
        requestedHydration = undefined
        hydrationRequest += 1
      }
      return
    }
    if (requestedHydration?.token === ownership.token && requestedHydration.sessionID === sessionID) return

    const request = ++hydrationRequest
    requestedHydration = { token: ownership.token, sessionID }
    setHydratedChildMessages(undefined)
    void hydrateChildMessages(ownership.token, sessionID, request)
  })

  const latestResponse = createMemo(() => {
    const ownership = props.ownership()
    const sessionID = childSessionID()
    if (!sessionID) return undefined

    const live = liveChildMessages()
    if (live?.hasParts) return latestAssistantText(live.messages, (messageID) => live.parts.get(messageID) ?? [])

    const hydrated = hydratedChildMessages()
    if (!hydrated || hydrated.token !== ownership.token || hydrated.sessionID !== sessionID) return undefined
    const parts = new Map(hydrated.messages.map((message) => [message.info.id, message.parts]))
    return latestAssistantText(
      hydrated.messages.map((message) => message.info),
      (messageID) => parts.get(messageID) ?? [],
    )
  })
  const responseLabel = () => latestResponse() ?? (childSessionID() ? "Waiting for assistant response" : "Waiting for child session")
  const openSession = () => {
    const sessionID = childSessionID()
    if (!canOpen() || !sessionID) return
    props.api.route.navigate("session", { sessionID })
    props.close()
  }

  const applyPortalPlacement = (next = placement()): void => {
    const wrapper = portalWrapper
    if (!wrapper || wrapper.isDestroyed) return
    wrapper.position = "absolute"
    wrapper.left = next.left
    wrapper.top = next.top
    wrapper.width = next.width
    wrapper.height = next.height
    wrapper.zIndex = POPOVER_Z_INDEX
    wrapper.focusable = false
  }
  createEffect(() => applyPortalPlacement(placement()))

  onCleanup(() => {
    hydrationRequest += 1
    requestedHydration = undefined
    portalWrapper = undefined
  })

  return (
    <Portal
      mount={props.api.renderer.root}
      ref={(element) => {
        portalWrapper = element as BoxRenderable
        applyPortalPlacement()
      }}
    >
      <box
        width="100%"
        height="100%"
        focusable={false}
        live
        border
        borderColor={props.api.theme.current.borderActive}
        backgroundColor={props.api.theme.current.backgroundPanel}
        padding={1}
        flexDirection="column"
        overflow="hidden"
      >
        <text fg={props.api.theme.current.text} wrapMode="none" truncate>
          <b>Subagent details</b>
        </text>
        <text fg={props.api.theme.current.text} wrapMode="none" truncate>
          Agent: {taskAgent(part() ?? fallback().part)}
        </text>
        <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
          Assigned: {taskDescription(part() ?? fallback().part)}
        </text>
        <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
          Latest: {responseLabel()}
        </text>
        <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
          Status: {taskStatusLabel(part() ?? fallback().part, childSessionID() ? props.api.state.session.status(childSessionID()!) : undefined)}
        </text>
        <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
          Model: {modelName(props.api, model())} · {taskVariantLabel(model()) ?? "pending"}
        </text>
        <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
          {taskModeLabel(part() ?? fallback().part)} · {elapsedLabel(props.now() - props.startedAt(part() ?? fallback().part))}
        </text>
        <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
          Child: {childSessionID() ?? "Waiting for child session"}
        </text>
        <box flexDirection="row" gap={2}>
          <box onMouseUp={openSession}>
            <text fg={canOpen() ? props.api.theme.current.primary : props.api.theme.current.textMuted}>
              <b>Open Session</b>
            </text>
          </box>
          <box onMouseUp={props.close}>
            <text fg={props.api.theme.current.primary}>
              <b>Close</b>
            </text>
          </box>
        </box>
      </box>
    </Portal>
  )
}

function TaskCard(props: {
  api: TuiPluginApi
  callID: string
  tasksByCallID: () => Map<string, VisibleTaskPart>
  fallbackFor: (callID: string) => TaskFallback | undefined
  remember: (part: VisibleTaskPart) => void
  revision: () => number
  now: () => number
  startedAt: (part: VisibleTaskPart) => number
  openPopup: (callID: string, anchor: PopoverAnchor) => void
  updatePopupAnchor: (callID: string, anchor: PopoverAnchor) => void
}) {
  // The call ID is stable, while the actual ToolPart is re-read after each event.
  // This prevents cards from retaining a stale part object after a state update.
  const livePart = createMemo(() => props.tasksByCallID().get(props.callID))
  const part = () => livePart() ?? props.fallbackFor(props.callID)?.part
  const childSession = () => {
    props.revision()
    const current = part()
    if (!current) return undefined
    const sessionID = taskSessionID(current)
    return sessionID ? props.api.state.session.get(sessionID) : undefined
  }
  const model = () => {
    props.revision()
    const current = part()
    return current ? resolvedModel(props.api, current, childSession(), taskSessionID(current)) : undefined
  }
  const elapsed = () => {
    const current = part()
    return current ? elapsedLabel(props.now() - props.startedAt(current)) : ""
  }
  let card: BoxRenderable | undefined
  let lastAnchor: PopoverAnchor | undefined
  const anchor = (): PopoverAnchor | undefined =>
    card && { x: card.screenX, y: card.screenY, width: card.width, height: card.height }
  const updateAnchor = (): void => {
    const current = anchor()
    if (
      !current ||
      (lastAnchor &&
        lastAnchor.x === current.x &&
        lastAnchor.y === current.y &&
        lastAnchor.width === current.width &&
        lastAnchor.height === current.height)
    ) {
      return
    }
    lastAnchor = current
    props.updatePopupAnchor(props.callID, current)
  }
  onCleanup(() => {
    // The popover owns its last reported rect, so losing this card must not
    // reset its placement before the user explicitly closes it.
    card = undefined
    lastAnchor = undefined
  })
  const openDetails = () => {
    if (props.api.renderer.getSelection()?.getSelectedText()) return
    const part = livePart()
    const currentAnchor = anchor()
    if (!part || !currentAnchor) return
    props.remember(part)
    props.openPopup(props.callID, currentAnchor)
  }

  return (
    <box
      ref={(element) => {
        card = element
        updateAnchor()
      }}
      onSizeChange={updateAnchor}
      renderBefore={updateAnchor}
      width="100%"
      height={2}
      flexDirection="column"
      overflow="hidden"
      onMouseUp={openDetails}
    >
      <box width="100%" height={1} flexDirection="row" overflow="hidden">
        <text flexGrow={1} flexShrink={1} minWidth={0} wrapMode="none" truncate fg={props.api.theme.current.text}>
          <b>{part() ? taskAgent(part()!) : "subagent"}</b>
        </text>
        <box
          flexShrink={1}
          minWidth={0}
          maxWidth={28}
          marginLeft={1}
          flexDirection="row"
        >
          <text flexGrow={1} flexShrink={1} minWidth={0} wrapMode="none" truncate fg={props.api.theme.current.textMuted}>
            {modelName(props.api, model())}
          </text>
          <Show
            when={taskVariantLabel(model())}
            fallback={
              <Show when={model()}>
                <text flexShrink={0} marginLeft={1} wrapMode="none" truncate fg={props.api.theme.current.textMuted}>
                  · pending
                </text>
              </Show>
            }
          >
            {(variant) => (
              <text flexShrink={0} marginLeft={1} wrapMode="none" truncate fg={props.api.theme.current.textMuted}>
                · {variant()}
              </text>
            )}
          </Show>
        </box>
      </box>
      <box width="100%" height={1} flexDirection="row" overflow="hidden">
        <text
          flexGrow={1}
          flexShrink={1}
          minWidth={0}
          wrapMode="none"
          truncate
          fg={props.api.theme.current.textMuted}
        >
          {part() ? taskDescription(part()!) : "Working"}
        </text>
        <box width={8} flexShrink={0} flexDirection="row" justifyContent="flex-end">
          <text wrapMode="none" truncate fg={props.api.theme.current.textMuted}>
            {elapsed()}
          </text>
        </box>
      </box>
    </box>
  )
}

function RunningSubagents(props: { api: TuiPluginApi; sessionID: string }) {
  const [scopeSessionID, setScopeSessionID] = createSignal<string>()
  const [hydratedMessages, setHydratedMessages] = createSignal<ReadonlyArray<SessionMessageWithParts>>([])
  const [revision, setRevision] = createSignal(0)
  const [now, setNow] = createSignal(Date.now())
  const firstSeen = new Map<string, number>()
  const fallbacks = new Map<string, TaskFallback>()
  const [openPopup, setOpenPopup] = createSignal<PopupOwnership>()
  let sessionRequest = 0

  const loadMessages = async (sessionID: string, request: number): Promise<void> => {
    if (props.api.state.session.messages(sessionID).length) return

    try {
      const result = await props.api.client.session.messages(
        { sessionID, directory: props.api.state.path.directory },
        { throwOnError: true },
      )
      if (props.api.lifecycle.signal.aborted || request !== sessionRequest || scopeSessionID() !== sessionID) return
      setHydratedMessages(result.data)
      setRevision((value) => value + 1)
    } catch {
      // Live session events can populate the public TUI state after a failed hydration.
    }
  }

  const selectSession = async (sessionID: string, known?: Session): Promise<void> => {
    const currentRequest = ++sessionRequest
    setScopeSessionID(undefined)
    setHydratedMessages([])
    let session = known ?? props.api.state.session.get(sessionID)

    if (!session) {
      try {
        const result = await props.api.client.session.get(
          { sessionID, directory: props.api.state.path.directory },
          { throwOnError: true },
        )
        session = result.data
      } catch {
        // Leave the scope unset so a failed child lookup cannot show its own tasks.
        // A later session event retries after local state is populated.
        return
      }
    }

    if (props.api.lifecycle.signal.aborted || currentRequest !== sessionRequest) return
    const parentSessionID = session.parentID ?? session.id
    setScopeSessionID(parentSessionID)
    setRevision((value) => value + 1)
    void loadMessages(parentSessionID, currentRequest)
  }

  createEffect(
    on(() => props.sessionID, (sessionID, previousSessionID) => {
      if (previousSessionID !== undefined && sessionID !== previousSessionID) setOpenPopup(undefined)
      void selectSession(sessionID)
    }),
  )

  const allTaskParts = createMemo(() => {
    revision()
    const sessionID = scopeSessionID()
    if (!sessionID) return []

    const messages = props.api.state.session.messages(sessionID)
    const parts = messages.length
      ? messages.flatMap((message) => props.api.state.part(message.id))
      : hydratedMessages().flatMap((message) => message.parts)
    return parts.filter(isTaskPart)
  })
  const visibleTaskParts = createMemo(() => allTaskParts().filter((part) => isVisibleTask(part, props.api.state.session.status)))
  // Popups need the direct parent's complete/error parts too, even after their
  // visible card has gone away.
  const tasksByCallID = createMemo(() => new Map(allTaskParts().map((part) => [part.callID, part])))
  const taskCallIDs = createMemo(() => visibleTaskParts().map((part) => part.callID))
  const activeChildSessions = createMemo(
    () => new Set(visibleTaskParts().map(taskSessionID).filter((sessionID): sessionID is string => Boolean(sessionID))),
  )

  const remember = (part: VisibleTaskPart): void => {
    const sessionID = taskSessionID(part)
    const session = sessionID ? props.api.state.session.get(sessionID) : undefined
    fallbacks.set(part.callID, { part, ...(sessionID ? { sessionID } : {}), ...(session ? { session } : {}) })
  }
  const rememberLiveTasks = () => {
    revision()
    for (const part of allTaskParts()) remember(part)
  }
  createEffect(rememberLiveTasks)

  const popupPart = createMemo(() => {
    revision()
    const callID = openPopup()?.callID
    return callID ? tasksByCallID().get(callID) ?? fallbacks.get(callID)?.part : undefined
  })
  const popupSessionID = createMemo(() => {
    const callID = openPopup()?.callID
    const part = popupPart()
    return (part ? taskSessionID(part) : undefined) ?? (callID ? fallbacks.get(callID)?.sessionID : undefined)
  })

  const startedAt = (part: VisibleTaskPart): number => {
    if (part.state.status !== "pending") return part.state.time.start
    const existing = firstSeen.get(part.callID)
    if (existing !== undefined) return existing
    const value = now()
    firstSeen.set(part.callID, value)
    return value
  }

  const closePopup = (ownership: PopupOwnership): void => {
    if (openPopup()?.token !== ownership.token) return
    setOpenPopup(undefined)
  }
  const showPopup = (callID: string, anchor: PopoverAnchor): void => {
    const ownership = { callID, token: Symbol(callID), anchor }
    setOpenPopup(ownership)
  }
  const updatePopupAnchor = (callID: string, anchor: PopoverAnchor): void => {
    const ownership = openPopup()
    if (!ownership || ownership.callID !== callID) return
    if (
      ownership.anchor.x === anchor.x &&
      ownership.anchor.y === anchor.y &&
      ownership.anchor.width === anchor.width &&
      ownership.anchor.height === anchor.height
    ) {
      return
    }
    setOpenPopup({ ...ownership, anchor })
  }
  const dismissForHostDialog = (): void => {
    if (openPopup() && props.api.ui.dialog.open) setOpenPopup(undefined)
  }
  const dismissForHostDialogFrame = async (): Promise<void> => {
    dismissForHostDialog()
  }
  createEffect(dismissForHostDialog)

  const unregister: Array<() => void> = []
  let timer: ReturnType<typeof setInterval> | undefined

  onMount(() => {
    const syncCurrentSession = (session: Session) => {
      if (session.id === props.sessionID) void selectSession(session.id, session)
      if (session.parentID === scopeSessionID() || activeChildSessions().has(session.id) || session.id === popupSessionID()) {
        setRevision((value) => value + 1)
      }
    }
    const refreshSession = (sessionID: string) => {
      if (sessionID === scopeSessionID() || activeChildSessions().has(sessionID) || sessionID === popupSessionID()) {
        setRevision((value) => value + 1)
      }
    }

    unregister.push(
      () => {
        props.api.renderer.removeFrameCallback(dismissForHostDialogFrame)
      },
      props.api.event.on("session.created", (event) => syncCurrentSession(event.properties.info)),
      props.api.event.on("session.updated", (event) => syncCurrentSession(event.properties.info)),
      props.api.event.on("message.updated", (event) => refreshSession(event.properties.sessionID)),
      props.api.event.on("message.part.updated", (event) => refreshSession(event.properties.sessionID)),
      props.api.event.on("message.part.removed", (event) => refreshSession(event.properties.sessionID)),
    )
    props.api.renderer.setFrameCallback(dismissForHostDialogFrame)
    timer = setInterval(() => setNow(Date.now()), 1_000)
  })

  onCleanup(() => {
    sessionRequest += 1
    if (timer) clearInterval(timer)
    for (const dispose of unregister) dispose()
    setOpenPopup(undefined)
  })

  return (
    <box overflow="hidden">
      <text fg={props.api.theme.current.text}>
        <b>Subagents</b>
        <span style={{ fg: props.api.theme.current.textMuted }}>
          {visibleTaskParts().length ? ` (${visibleTaskParts().length} running)` : ""}
        </span>
      </text>

      <Show
        when={taskCallIDs().length > 0}
        fallback={<text fg={props.api.theme.current.textMuted}>No subagent running</text>}
      >
        <For each={taskCallIDs()}>
          {(callID) => (
            <TaskCard
              api={props.api}
              callID={callID}
              tasksByCallID={tasksByCallID}
              fallbackFor={(id) => fallbacks.get(id)}
              remember={remember}
              revision={revision}
              now={now}
              startedAt={startedAt}
              openPopup={showPopup}
              updatePopupAnchor={updatePopupAnchor}
            />
          )}
        </For>
      </Show>
      <Show when={openPopup()}>
        {(ownership) => (
          <TaskPopover
            api={props.api}
            ownership={ownership}
            currentSessionID={props.sessionID}
            fallbackPart={fallbacks.get(ownership().callID)!.part}
            tasksByCallID={tasksByCallID}
            fallbackFor={(id) => fallbacks.get(id)}
            revision={revision}
            now={now}
            startedAt={startedAt}
            close={() => closePopup(ownership())}
          />
        )}
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 90,
    slots: {
      sidebar_footer(_ctx, props) {
        return <RunningSubagents api={api} sessionID={props.session_id} />
      },
    },
  })
}

const plugin = {
  id: "opencode-subagents-sidebar-plugin",
  tui,
} satisfies TuiPluginModule

export default plugin
