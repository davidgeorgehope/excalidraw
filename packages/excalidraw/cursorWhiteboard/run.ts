import { toBrandedType, UserIdleState } from "@excalidraw/common";
import { convertToExcalidrawElements } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { AnimationController } from "../renderer/animation";
import { getScrollToContentState } from "../scene";

import { buildBoardSkeletons, nextBoardOrigin } from "./boards";
import { setWhiteboardSession } from "./session";
import { AGENT_IDS } from "./types";

import type { AppClassProperties, Collaborator, SocketId } from "../types";
import type { AgentId, AgentRuntime, BoardKind, ScenePoint } from "./types";

const ANIMATION_KEY = "cursorWhiteboard";
const GHOST_PREFIX = "cursor-wb-";
const MOVE_MS = 320;
const DRAW_MS = 480;
const FADE_MS = 700;
const STAGGER_MS = 280;

let nextRunId = 0;

const ghostSocketId = (id: AgentId): SocketId =>
  toBrandedType<SocketId>(`${GHOST_PREFIX}${id}`);

const GHOST_SOCKET_IDS = AGENT_IDS.map((id) => ghostSocketId(id));

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const wobble = ({ now, seed }: { now: number; seed: number }): ScenePoint => ({
  x: Math.sin(now * 0.008 + seed) * 3.6,
  y: Math.cos(now * 0.01 + seed * 1.7) * 3.6,
});

const elementAnchor = (element: ExcalidrawElement): ScenePoint => ({
  x: element.x,
  y: element.y,
});

const pointOnPerimeter = ({
  origin,
  width,
  height,
  progress,
}: {
  origin: ScenePoint;
  width: number;
  height: number;
  progress: number;
}): ScenePoint => {
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const perimeter = 2 * (w + h);
  const distance = clamp01(progress) * perimeter;

  if (distance < w) {
    return { x: origin.x + distance, y: origin.y };
  }
  if (distance < w + h) {
    return { x: origin.x + w, y: origin.y + (distance - w) };
  }
  if (distance < 2 * w + h) {
    return { x: origin.x + w - (distance - w - h), y: origin.y + h };
  }
  return { x: origin.x, y: origin.y + h - (distance - 2 * w - h) };
};

const clearGhosts = (app: AppClassProperties): void => {
  const next = new Map(app.state.collaborators);
  let changed = false;
  for (const socketId of GHOST_SOCKET_IDS) {
    if (next.delete(socketId)) {
      changed = true;
    }
  }
  if (changed) {
    app.setAppState({ collaborators: next });
  }
};

const publishGhosts = ({
  app,
  agents,
  now,
}: {
  app: AppClassProperties;
  agents: readonly AgentRuntime[];
  now: number;
}): void => {
  const next = new Map(app.state.collaborators);
  for (const socketId of GHOST_SOCKET_IDS) {
    next.delete(socketId);
  }

  agents.forEach((agent, index) => {
    if (agent.phase.kind === "gone") {
      return;
    }

    const shake = wobble({ now, seed: index * 2.3 });
    const collaborator: Collaborator = {
      pointer: {
        x: agent.x + shake.x,
        y: agent.y + shake.y,
        tool: "pointer",
      },
      button: agent.phase.kind === "drawing" ? "down" : "up",
      userState:
        agent.phase.kind === "fading"
          ? UserIdleState.IDLE
          : UserIdleState.ACTIVE,
    };

    next.set(ghostSocketId(agent.id), collaborator);
  });

  app.setAppState({ collaborators: next });
};

const takeNextElement = (
  pending: ExcalidrawElement[],
): ExcalidrawElement | null => {
  return pending.shift() ?? null;
};

const startMove = ({
  agent,
  element,
}: {
  agent: AgentRuntime;
  element: ExcalidrawElement;
}): AgentRuntime => {
  const to = elementAnchor(element);
  return {
    ...agent,
    phase: {
      kind: "moving",
      from: { x: agent.x, y: agent.y },
      to,
      elapsedMs: 0,
      durationMs: MOVE_MS,
      elementId: element.id,
    },
  };
};

const startFade = (agent: AgentRuntime): AgentRuntime => ({
  ...agent,
  phase: {
    kind: "fading",
    elapsedMs: 0,
    durationMs: FADE_MS,
    at: { x: agent.x, y: agent.y },
  },
});

type RunnerState = {
  board: BoardKind;
  runId: number;
  pending: ExcalidrawElement[];
  inserted: Set<string>;
  agents: AgentRuntime[];
  elementsById: Map<string, ExcalidrawElement>;
};

const insertIfNeeded = ({
  app,
  state,
  elementId,
}: {
  app: AppClassProperties;
  state: RunnerState;
  elementId: string;
}): void => {
  if (state.inserted.has(elementId)) {
    return;
  }
  const element = state.elementsById.get(elementId);
  if (!element) {
    return;
  }
  app.scene.insertElement(element);
  state.inserted.add(elementId);
};

const stepAgent = ({
  agent,
  deltaTime,
  state,
  app,
}: {
  agent: AgentRuntime;
  deltaTime: number;
  state: RunnerState;
  app: AppClassProperties;
}): AgentRuntime => {
  const { phase } = agent;

  switch (phase.kind) {
    case "waiting": {
      const remainingMs = phase.remainingMs - deltaTime;
      if (remainingMs > 0) {
        return {
          ...agent,
          phase: { kind: "waiting", remainingMs },
        };
      }
      const nextElement = takeNextElement(state.pending);
      if (!nextElement) {
        return startFade(agent);
      }
      return startMove({ agent, element: nextElement });
    }
    case "moving": {
      const elapsedMs = phase.elapsedMs + deltaTime;
      const t = easeInOut(clamp01(elapsedMs / phase.durationMs));
      const x = lerp(phase.from.x, phase.to.x, t);
      const y = lerp(phase.from.y, phase.to.y, t);
      if (elapsedMs < phase.durationMs) {
        return {
          ...agent,
          x,
          y,
          phase: { ...phase, elapsedMs },
        };
      }
      const element = state.elementsById.get(phase.elementId);
      if (!element) {
        return startFade({ ...agent, x: phase.to.x, y: phase.to.y });
      }
      insertIfNeeded({ app, state, elementId: element.id });
      return {
        ...agent,
        x: phase.to.x,
        y: phase.to.y,
        phase: {
          kind: "drawing",
          elementId: element.id,
          elapsedMs: 0,
          durationMs: DRAW_MS,
          origin: { x: element.x, y: element.y },
          width: element.width,
          height: element.height,
        },
      };
    }
    case "drawing": {
      const elapsedMs = phase.elapsedMs + deltaTime;
      const progress = clamp01(elapsedMs / phase.durationMs);
      const along = pointOnPerimeter({
        origin: phase.origin,
        width: phase.width,
        height: phase.height,
        progress,
      });
      if (elapsedMs < phase.durationMs) {
        return {
          ...agent,
          x: along.x,
          y: along.y,
          phase: { ...phase, elapsedMs },
        };
      }
      const nextElement = takeNextElement(state.pending);
      const settled = {
        ...agent,
        x: along.x,
        y: along.y,
      };
      if (!nextElement) {
        return startFade(settled);
      }
      return startMove({ agent: settled, element: nextElement });
    }
    case "fading": {
      const elapsedMs = phase.elapsedMs + deltaTime;
      if (elapsedMs < phase.durationMs) {
        return {
          ...agent,
          x: phase.at.x,
          y: phase.at.y,
          phase: { ...phase, elapsedMs },
        };
      }
      return { ...agent, phase: { kind: "gone" } };
    }
    case "gone":
      return agent;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
};

const finishRun = ({
  app,
  board,
  runId,
}: {
  app: AppClassProperties;
  board: BoardKind;
  runId: number;
}): void => {
  clearGhosts(app);
  setWhiteboardSession({ kind: "ready", lastBoard: board, runId });
};

export const startCursorWhiteboard = ({
  app,
  board,
  instant = false,
}: {
  app: AppClassProperties;
  board: BoardKind;
  instant?: boolean;
}): void => {
  AnimationController.cancel(ANIMATION_KEY);
  clearGhosts(app);

  const runId = nextRunId;
  nextRunId += 1;
  const origin = nextBoardOrigin({ runId });
  const skeletons = buildBoardSkeletons({ board, origin, runId });
  const elements = convertToExcalidrawElements(skeletons, {
    regenerateIds: false,
  });

  setWhiteboardSession({ kind: "drawing", board, runId });
  app.setAppState(getScrollToContentState(elements, app.state));

  if (instant) {
    for (const element of elements) {
      app.scene.insertElement(element);
    }
    finishRun({ app, board, runId });
    return;
  }

  const pending = [...elements];
  const elementsById = new Map(
    elements.map((element) => [element.id, element]),
  );
  const startPoints: ScenePoint[] = [
    { x: origin.x - 40, y: origin.y + 40 },
    { x: origin.x + 200, y: origin.y - 20 },
    { x: origin.x + 420, y: origin.y + 80 },
  ];

  const agents: AgentRuntime[] = AGENT_IDS.map((id, index) => ({
    id,
    x: startPoints[index].x,
    y: startPoints[index].y,
    phase: {
      kind: "waiting",
      remainingMs: index * STAGGER_MS,
    },
  }));

  const initial: RunnerState = {
    board,
    runId,
    pending,
    inserted: new Set(),
    agents,
    elementsById,
  };

  AnimationController.start<RunnerState>(
    ANIMATION_KEY,
    ({ deltaTime, state }) => {
      const current = state ?? initial;
      const now = performance.now();
      const nextAgents = current.agents.map((agent) =>
        stepAgent({
          agent,
          deltaTime,
          state: current,
          app,
        }),
      );
      const nextState: RunnerState = {
        ...current,
        agents: nextAgents,
      };

      publishGhosts({ app, agents: nextAgents, now });

      const allGone = nextAgents.every((agent) => agent.phase.kind === "gone");
      if (allGone) {
        finishRun({ app, board: current.board, runId: current.runId });
        return null;
      }

      return nextState;
    },
  );
};

export const resetCursorWhiteboardForTests = (): void => {
  AnimationController.cancel(ANIMATION_KEY);
  nextRunId = 0;
  setWhiteboardSession({ kind: "idle" });
};
