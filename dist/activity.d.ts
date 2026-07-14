import type { Message, Part } from "@opencode-ai/sdk/v2";
export declare function activityForPart(part: Part): string | undefined;
/** Returns the newest visible assistant activity as a single display line. */
export declare function latestAssistantActivity(messages: ReadonlyArray<Message>, partsForMessage: (messageID: string) => ReadonlyArray<Part>): string | undefined;
export declare function elapsedLabel(milliseconds: number): string;
//# sourceMappingURL=activity.d.ts.map