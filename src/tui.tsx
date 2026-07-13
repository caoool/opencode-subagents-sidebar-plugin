/** @jsxImportSource @opentui/solid */

import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import type { Message, Part, Session } from "@opencode-ai/sdk/v2"
import { elapsedLabel } from "./activity.js"
import {
  canOpenTaskSession,
  isTaskPart,
  isVisibleTask,
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

type PopupOwnership = {
  callID: string
  token: symbol
}

function resolvedModel(api: TuiPluginApi, part: VisibleTaskPart, session: Session | undefined, sessionID?: string) {
  return resolveTaskModel(part, session, sessionID ? api.state.session.messages(sessionID) : [])
}

function modelName(api: TuiPluginApi, model: ReturnType<typeof resolvedModel>): string {
  const name = model
    ? api.state.provider.find((provider) => provider.id === model.providerID)?.models[model.modelID]?.name
    : undefined
  return taskModelLabel(model, name)
}

function TaskDetails(props: {
  api: TuiPluginApi
  callID: string
  currentSessionID: string
  fallbackPart: VisibleTaskPart
  tasksByCallID: () => Map<string, VisibleTaskPart>
  fallbackFor: (callID: string) => TaskFallback | undefined
  revision: () => number
  now: () => number
  startedAt: (part: VisibleTaskPart) => number
  close: () => void
}) {
  const fallback = (): TaskFallback => {
    const known = props.fallbackFor(props.callID)
    if (known) return known
    const sessionID = taskSessionID(props.fallbackPart)
    return { part: props.fallbackPart, ...(sessionID ? { sessionID } : {}) }
  }
  const part = createMemo(() => {
    props.revision()
    return props.tasksByCallID().get(props.callID) ?? fallback().part
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
  const openSession = () => {
    const sessionID = childSessionID()
    if (!canOpen() || !sessionID) return
    props.api.route.navigate("session", { sessionID })
    props.close()
  }

  return (
    <box width="100%" flexDirection="column" padding={1} gap={1}>
      <text fg={props.api.theme.current.text}>
        <b>Subagent details</b>
      </text>
      <box flexDirection="column">
        <text fg={props.api.theme.current.text}>Agent: {taskAgent(part() ?? fallback().part)}</text>
        <text fg={props.api.theme.current.textMuted} wrapMode="word">
          Assigned task: {taskDescription(part() ?? fallback().part)}
        </text>
        <text fg={props.api.theme.current.textMuted}>
          Status: {taskStatusLabel(part() ?? fallback().part, childSessionID() ? props.api.state.session.status(childSessionID()!) : undefined)}
        </text>
        <text fg={props.api.theme.current.textMuted}>
          Model: {modelName(props.api, model())}
        </text>
        <text fg={props.api.theme.current.textMuted}>
          Effort/variant: {taskVariantLabel(model()) ?? "pending"}
        </text>
        <text fg={props.api.theme.current.textMuted}>
          Elapsed: {elapsedLabel(props.now() - props.startedAt(part() ?? fallback().part))}
        </text>
        <text fg={props.api.theme.current.textMuted}>Child session ID: {childSessionID() ?? "Waiting for child session"}</text>
        <text fg={props.api.theme.current.textMuted}>Mode: {taskModeLabel(part() ?? fallback().part)}</text>
      </box>
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
  openPopup: (callID: string, part: VisibleTaskPart) => void
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
  const openDetails = () => {
    if (props.api.renderer.getSelection()?.getSelectedText()) return
    const part = livePart()
    if (!part) return
    props.remember(part)
    props.openPopup(props.callID, part)
  }

  return (
    <box width="100%" height={2} overflow="hidden" onMouseUp={openDetails}>
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
        <box width={8} flexShrink={0} justifyContent="flex-end">
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
  const [hydratedMessages, setHydratedMessages] = createSignal<ReadonlyArray<{ info: Message; parts: ReadonlyArray<Part> }>>([])
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

  createEffect(on(() => props.sessionID, (sessionID) => void selectSession(sessionID)))

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

  const releasePopup = (ownership: PopupOwnership): void => {
    if (openPopup()?.token === ownership.token) setOpenPopup(undefined)
  }
  const closePopup = (ownership: PopupOwnership): void => {
    if (openPopup()?.token !== ownership.token) return
    setOpenPopup(undefined)
    props.api.ui.dialog.clear()
  }
  const showPopup = (callID: string, part: VisibleTaskPart): void => {
    const ownership = { callID, token: Symbol(callID) }
    setOpenPopup(ownership)
    props.api.ui.dialog.replace(() => (
      <TaskDetails
        api={props.api}
        callID={callID}
        currentSessionID={props.sessionID}
        fallbackPart={part}
        tasksByCallID={tasksByCallID}
        fallbackFor={(id) => fallbacks.get(id)}
        revision={revision}
        now={now}
        startedAt={startedAt}
        close={() => closePopup(ownership)}
      />
    ), () => releasePopup(ownership))
  }

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
      props.api.event.on("session.created", (event) => syncCurrentSession(event.properties.info)),
      props.api.event.on("session.updated", (event) => syncCurrentSession(event.properties.info)),
      props.api.event.on("message.updated", (event) => refreshSession(event.properties.sessionID)),
      props.api.event.on("message.part.updated", (event) => refreshSession(event.properties.sessionID)),
      props.api.event.on("message.part.removed", (event) => refreshSession(event.properties.sessionID)),
    )
    timer = setInterval(() => setNow(Date.now()), 1_000)
  })

  onCleanup(() => {
    sessionRequest += 1
    if (timer) clearInterval(timer)
    for (const dispose of unregister) dispose()
    const ownership = openPopup()
    if (ownership) closePopup(ownership)
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
            />
          )}
        </For>
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
