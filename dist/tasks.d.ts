import type { Message, Part, Session, SessionStatus, ToolPart } from "@opencode-ai/sdk/v2";
export type VisibleTaskPart = ToolPart;
export type TaskModel = {
    providerID: string;
    modelID: string;
    variant?: string;
};
export declare function normalizeTaskDescription(value: unknown): string | undefined;
export declare function taskSessionID(part: ToolPart): string | undefined;
export declare function taskAgent(part: VisibleTaskPart): string;
export declare function taskDescription(part: VisibleTaskPart): string;
/** Returns the latest visible assistant response as a single display line. */
export declare function latestAssistantText(messages: ReadonlyArray<Message>, partsForMessage: (messageID: string) => ReadonlyArray<Part>): string | undefined;
export declare function resolveTaskModel(part: VisibleTaskPart, childSession: Session | undefined, childMessages: ReadonlyArray<Message>): TaskModel | undefined;
export declare function taskModelLabel(model: TaskModel | undefined, displayName?: string): string;
export declare function taskVariantLabel(model: TaskModel | undefined): string | undefined;
export declare function taskStatusLabel(part: VisibleTaskPart, childStatus?: SessionStatus): string;
export declare function taskModeLabel(part: VisibleTaskPart): "Foreground" | "Background";
export declare function canOpenTaskSession(sessionID: string | undefined, currentSessionID: string): boolean;
export declare function isTaskPart(part: Part): part is VisibleTaskPart;
export declare function isVisibleTask(part: Part, sessionStatus: (sessionID: string) => SessionStatus | undefined): part is VisibleTaskPart;
//# sourceMappingURL=tasks.d.ts.map