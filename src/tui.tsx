/** @jsxImportSource @opentui/solid */

import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import type { Message, Part, Session } from "@opencode-ai/sdk/v2"
import { activityForPart, elapsedLabel, normalizeMeaningful } from "./activity.js"
import { isVisibleTask, taskSessionID, type VisibleTaskPart } from "./tasks.js"
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from "solid-js"

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function taskAgent(part: VisibleTaskPart): string {
  return stringValue(part.state.input.subagent_type) ?? "subagent"
}

function taskDescription(part: VisibleTaskPart): string {
  return normalizeMeaningful(part.state.input.description) ?? normalizeMeaningful(objectValue(part.state).title) ?? "Working"
}

function taskModel(part: VisibleTaskPart): { providerID: string; modelID: string } | undefined {
  const metadata = objectValue(objectValue(part.state).metadata)
  const model = objectValue(metadata.model)
  const providerID = stringValue(model.providerID)
  const modelID = stringValue(model.modelID)
  return providerID && modelID ? { providerID, modelID } : undefined
}

function latestActivity(api: TuiPluginApi, sessionID: string | undefined, fallback: string): string {
  if (!sessionID) return fallback

  const messages = api.state.session.messages(sessionID)
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex]
    if (message?.role !== "assistant") continue

    const parts = api.state.part(message.id)
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const candidate = parts[partIndex]
      if (!candidate) continue
      const activity = activityForPart(candidate)
      if (activity) return activity
    }
  }
  return fallback
}

function modelLabel(api: TuiPluginApi, part: VisibleTaskPart): string {
  let model = taskModel(part)
  const childSessionID = taskSessionID(part)
  if (!model && childSessionID) {
    const messages = api.state.session.messages(childSessionID)
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role === "assistant") {
        model = { providerID: message.providerID, modelID: message.modelID }
        break
      }
    }
  }

  if (!model) return "starting…"
  return api.state.provider.find((provider) => provider.id === model.providerID)?.models[model.modelID]?.name ?? model.modelID
}

function TaskCard(props: {
  api: TuiPluginApi
  callID: string
  currentSessionID: string
  tasksByCallID: () => Map<string, VisibleTaskPart>
  revision: () => number
  now: () => number
  startedAt: (part: VisibleTaskPart) => number
}) {
  // The call ID is stable, while the actual ToolPart is re-read after each event.
  // This prevents cards from retaining a stale part object after a state update.
  const livePart = createMemo(() => props.tasksByCallID().get(props.callID))
  const childSessionID = () => taskSessionID(livePart()!)
  const isCurrent = () => childSessionID() === props.currentSessionID
  const model = () => {
    props.revision()
    return modelLabel(props.api, livePart()!)
  }
  const activity = () => {
    props.revision()
    return latestActivity(props.api, childSessionID(), taskDescription(livePart()!))
  }
  const elapsed = () => elapsedLabel(props.now() - props.startedAt(livePart()!))

  return (
    <box width="100%" height={2} overflow="hidden">
      <box width="100%" height={1} flexDirection="row" overflow="hidden">
        <text flexGrow={1} flexShrink={1} minWidth={0} wrapMode="none" truncate>
          <span
            style={{
              fg:
                livePart()!.state.status === "pending"
                  ? props.api.theme.current.warning
                  : props.api.theme.current.success,
            }}
          >
            {isCurrent() ? "›" : livePart()!.state.status === "pending" ? "…" : "●"}
          </span>
          <span style={{ fg: props.api.theme.current.text }}>
            {" "}
            <b>{taskAgent(livePart()!)}</b>
          </span>
        </text>
        <text
          flexShrink={0}
          maxWidth={20}
          marginLeft={1}
          wrapMode="none"
          truncate
          fg={props.api.theme.current.textMuted}
        >
          {model()}
        </text>
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
          {activity()}
        </text>
        <text
          width={8}
          flexShrink={0}
          marginLeft={1}
          wrapMode="none"
          truncate
          fg={props.api.theme.current.textMuted}
        >
          {elapsed()}
        </text>
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

  const running = createMemo(() => {
    revision()
    const sessionID = scopeSessionID()
    if (!sessionID) return []

    const messages = props.api.state.session.messages(sessionID)
    const parts = messages.length
      ? messages.flatMap((message) => props.api.state.part(message.id))
      : hydratedMessages().flatMap((message) => message.parts)
    return parts.filter((part) => isVisibleTask(part, props.api.state.session.status))
  })
  const tasksByCallID = createMemo(() => new Map(running().map((part) => [part.callID, part])))
  const taskCallIDs = createMemo(() => running().map((part) => part.callID))
  const activeChildSessions = createMemo(
    () => new Set(running().map(taskSessionID).filter((sessionID): sessionID is string => Boolean(sessionID))),
  )

  const startedAt = (part: VisibleTaskPart): number => {
    if (part.state.status !== "pending") return part.state.time.start
    const existing = firstSeen.get(part.callID)
    if (existing !== undefined) return existing
    const value = now()
    firstSeen.set(part.callID, value)
    return value
  }

  const unregister: Array<() => void> = []
  let timer: ReturnType<typeof setInterval> | undefined

  onMount(() => {
    const syncCurrentSession = (session: Session) => {
      if (session.id === props.sessionID) void selectSession(session.id, session)
      if (session.parentID === scopeSessionID() || activeChildSessions().has(session.id)) {
        setRevision((value) => value + 1)
      }
    }
    const refreshSession = (sessionID: string) => {
      if (sessionID === scopeSessionID() || activeChildSessions().has(sessionID)) {
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
  })

  return (
    <box overflow="hidden">
      <text fg={props.api.theme.current.text}>
        <b>Subagents</b>
        <span style={{ fg: props.api.theme.current.textMuted }}>
          {running().length ? ` (${running().length} running)` : ""}
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
              currentSessionID={props.sessionID}
              tasksByCallID={tasksByCallID}
              revision={revision}
              now={now}
              startedAt={startedAt}
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
