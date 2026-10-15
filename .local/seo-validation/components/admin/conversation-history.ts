export const DEFAULT_HISTORY_WINDOW_SIZE = 4;

export type HistoryDirection = "older" | "newer" | null;

export type ConversationHistoryState = {
  windowStart: number;
  selectedMessageId: string | null;
  direction: HistoryDirection;
  motionKey: number;
};

export type ConversationHistoryAction =
  | { type: "open"; messageId: string }
  | { type: "close" }
  | { type: "older"; currentStart: number; historyCount: number; windowSize: number }
  | { type: "newer"; currentStart: number };

export const initialConversationHistoryState: ConversationHistoryState = {
  windowStart: 0,
  selectedMessageId: null,
  direction: null,
  motionKey: 0,
};

export function effectiveWindowStart(start: number, historyCount: number, windowSize: number) {
  return Math.max(0, Math.min(start, Math.max(0, historyCount - windowSize)));
}

export function historyWindow<T>(items: T[], start: number, windowSize: number) {
  const effectiveStart = effectiveWindowStart(start, items.length, windowSize);
  const visible = items.slice(effectiveStart, effectiveStart + windowSize);
  return {
    start: effectiveStart,
    visible,
    hiddenOlder: Math.max(0, items.length - effectiveStart - visible.length),
  };
}

export function conversationHistoryReducer(
  state: ConversationHistoryState,
  action: ConversationHistoryAction,
): ConversationHistoryState {
  if (action.type === "open") return { ...state, selectedMessageId: action.messageId };
  if (action.type === "close") return { ...state, selectedMessageId: null };
  if (action.type === "newer") {
    if (action.currentStart === 0) return state;
    return {
      ...state,
      windowStart: action.currentStart - 1,
      direction: "newer",
      motionKey: state.motionKey + 1,
    };
  }
  const nextStart = effectiveWindowStart(
    action.currentStart + 1,
    action.historyCount,
    action.windowSize,
  );
  if (nextStart === state.windowStart) return state;
  return {
    ...state,
    windowStart: nextStart,
    direction: "older",
    motionKey: state.motionKey + 1,
  };
}
