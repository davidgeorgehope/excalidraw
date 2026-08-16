import type { WhiteboardSession } from "./types";

let session: WhiteboardSession = { kind: "idle" };
const listeners = new Set<() => void>();

export const getWhiteboardSession = (): WhiteboardSession => session;

export const subscribeWhiteboardSession = (
  onStoreChange: () => void,
): (() => void) => {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
};

export const setWhiteboardSession = (next: WhiteboardSession): void => {
  session = next;
  for (const listener of listeners) {
    listener();
  }
};

export const resetWhiteboardSession = (): void => {
  setWhiteboardSession({ kind: "idle" });
};
