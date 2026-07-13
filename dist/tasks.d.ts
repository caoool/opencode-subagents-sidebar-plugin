import type { Part, SessionStatus, ToolPart } from "@opencode-ai/sdk/v2";
export type VisibleTaskPart = ToolPart;
export declare function taskSessionID(part: ToolPart): string | undefined;
export declare function isVisibleTask(part: Part, sessionStatus: (sessionID: string) => SessionStatus | undefined): part is VisibleTaskPart;
//# sourceMappingURL=tasks.d.ts.map