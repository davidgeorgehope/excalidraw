export const BOARD_KINDS = ["effort", "sdlc", "maturity", "platform"] as const;

export type BoardKind = typeof BOARD_KINDS[number];

export type ScenePoint = {
  x: number;
  y: number;
};

export type WhiteboardSession =
  | { kind: "idle" }
  | { kind: "drawing"; board: BoardKind; runId: number }
  | { kind: "ready"; lastBoard: BoardKind; runId: number };

export const AGENT_IDS = ["agent-a", "agent-b", "agent-c"] as const;

export type AgentId = typeof AGENT_IDS[number];

export type AgentPhase =
  | { kind: "waiting"; remainingMs: number }
  | {
      kind: "moving";
      from: ScenePoint;
      to: ScenePoint;
      elapsedMs: number;
      durationMs: number;
      elementId: string;
    }
  | {
      kind: "drawing";
      elementId: string;
      elapsedMs: number;
      durationMs: number;
      origin: ScenePoint;
      width: number;
      height: number;
    }
  | {
      kind: "fading";
      elapsedMs: number;
      durationMs: number;
      at: ScenePoint;
    }
  | { kind: "gone" };

export type AgentRuntime = {
  id: AgentId;
  phase: AgentPhase;
  x: number;
  y: number;
};

export const isBoardKind = (value: unknown): value is BoardKind => {
  return (
    value === "effort" ||
    value === "sdlc" ||
    value === "maturity" ||
    value === "platform"
  );
};
