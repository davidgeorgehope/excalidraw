import type { ExcalidrawElementSkeleton } from "@excalidraw/element";

import type { BoardKind, ScenePoint } from "./types";

const STROKE = "#26251e";
const ACCENT = "#f54e00";
const TITLE_SIZE = 28;
const BODY_SIZE = 18;
const LABEL_SIZE = 20;

const FILLS = {
  rose: "#ffc9c9",
  yellow: "#ffec99",
  green: "#b2f2bb",
  blue: "#a5d8ff",
  orange: "#ffd8a8",
  violet: "#d0bfff",
  gray: "#e9ecef",
} as const;

const boxStyle = (backgroundColor: string) =>
  ({
    strokeColor: STROKE,
    backgroundColor,
    fillStyle: "solid",
    roughness: 1,
    strokeWidth: 2,
  } as const);

const labeledBox = ({
  id,
  x,
  y,
  width,
  height,
  text,
  fill,
  fontSize = LABEL_SIZE,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fill: string;
  fontSize?: number;
}): ExcalidrawElementSkeleton => ({
  type: "rectangle",
  id,
  x,
  y,
  width,
  height,
  label: {
    text,
    fontSize,
    strokeColor: STROKE,
  },
  ...boxStyle(fill),
});

const titleText = ({
  x,
  y,
  text,
  fontSize = TITLE_SIZE,
}: {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
}): ExcalidrawElementSkeleton => ({
  type: "text",
  x,
  y,
  text,
  fontSize,
  strokeColor: STROKE,
});

const boundArrow = ({
  id,
  x,
  y,
  startId,
  endId,
  strokeColor = STROKE,
  animated = false,
}: {
  id: string;
  x: number;
  y: number;
  startId: string;
  endId: string;
  strokeColor?: string;
  animated?: boolean;
}): ExcalidrawElementSkeleton => ({
  type: "arrow",
  id,
  x,
  y,
  strokeColor,
  strokeStyle: animated ? "animated" : "solid",
  strokeWidth: 2,
  roughness: 1,
  start: { id: startId, type: "rectangle" },
  end: { id: endId, type: "rectangle" },
});

const buildIncidentBoard = (
  origin: ScenePoint,
): ExcalidrawElementSkeleton[] => {
  const y = origin.y + 90;
  return [
    titleText({ x: origin.x, y: origin.y, text: "1 · Detect the signal" }),
    labeledBox({
      id: "datadog-alert",
      x: origin.x,
      y,
      width: 260,
      height: 120,
      text: "Datadog\nproduction alert",
      fill: FILLS.rose,
    }),
    boundArrow({
      id: "alert-to-slack",
      x: origin.x + 260,
      y: y + 60,
      startId: "datadog-alert",
      endId: "incident-channel",
      strokeColor: ACCENT,
      animated: true,
    }),
    labeledBox({
      id: "incident-channel",
      x: origin.x + 360,
      y,
      width: 280,
      height: 120,
      text: "Slack\n#incidents",
      fill: FILLS.violet,
    }),
    titleText({
      x: origin.x,
      y: y + 160,
      text: "The incident thread becomes the shared source of truth.",
      fontSize: BODY_SIZE,
    }),
  ];
};

const buildDispatchBoard = (
  origin: ScenePoint,
): ExcalidrawElementSkeleton[] => {
  const y = origin.y + 90;
  return [
    titleText({ x: origin.x, y: origin.y, text: "2 · Dispatch with identity" }),
    labeledBox({
      id: "slack-trigger",
      x: origin.x,
      y,
      width: 220,
      height: 110,
      text: "Slack trigger",
      fill: FILLS.violet,
    }),
    boundArrow({
      id: "trigger-to-agent",
      x: origin.x + 220,
      y: y + 55,
      startId: "slack-trigger",
      endId: "cloud-agent",
      strokeColor: ACCENT,
      animated: true,
    }),
    labeledBox({
      id: "cloud-agent",
      x: origin.x + 320,
      y,
      width: 250,
      height: 110,
      text: "Cursor Cloud Agent",
      fill: FILLS.orange,
    }),
    boundArrow({
      id: "agent-to-worker",
      x: origin.x + 570,
      y: y + 55,
      startId: "cloud-agent",
      endId: "private-worker",
      strokeColor: ACCENT,
      animated: true,
    }),
    labeledBox({
      id: "private-worker",
      x: origin.x + 670,
      y,
      width: 280,
      height: 110,
      text: "Private Worker\ninside Iterable",
      fill: FILLS.blue,
    }),
    titleText({
      x: origin.x + 320,
      y: y + 145,
      text: "Runs with the initiating user's identity",
      fontSize: BODY_SIZE,
    }),
  ];
};

const buildInvestigateBoard = (
  origin: ScenePoint,
): ExcalidrawElementSkeleton[] => {
  const y = origin.y + 90;
  return [
    titleText({
      x: origin.x,
      y: origin.y,
      text: "3 · Investigate inside the boundary",
    }),
    labeledBox({
      id: "private-worker",
      x: origin.x,
      y,
      width: 250,
      height: 120,
      text: "Private Worker",
      fill: FILLS.blue,
    }),
    boundArrow({
      id: "worker-to-backstage",
      x: origin.x + 250,
      y: y + 45,
      startId: "private-worker",
      endId: "backstage",
      strokeColor: ACCENT,
      animated: true,
    }),
    labeledBox({
      id: "backstage",
      x: origin.x + 370,
      y: y - 30,
      width: 240,
      height: 95,
      text: "Backstage",
      fill: FILLS.yellow,
    }),
    boundArrow({
      id: "worker-to-k8s",
      x: origin.x + 250,
      y: y + 75,
      startId: "private-worker",
      endId: "kubernetes",
      strokeColor: ACCENT,
      animated: true,
    }),
    labeledBox({
      id: "kubernetes",
      x: origin.x + 370,
      y: y + 95,
      width: 240,
      height: 95,
      text: "Kubernetes",
      fill: FILLS.green,
    }),
    labeledBox({
      id: "network-boundary",
      x: origin.x + 680,
      y: y - 30,
      width: 290,
      height: 220,
      text: "Iterable network\nPrivate endpoints stay private",
      fill: FILLS.gray,
      fontSize: 18,
    }),
  ];
};

const buildRemediateBoard = (
  origin: ScenePoint,
): ExcalidrawElementSkeleton[] => {
  const y = origin.y + 90;
  const stages = [
    { id: "root-cause", text: "Root cause", fill: FILLS.yellow },
    { id: "fix", text: "Proposed fix", fill: FILLS.orange },
    { id: "pull-request", text: "Open PR", fill: FILLS.green },
    { id: "human-review", text: "Human review", fill: FILLS.blue },
  ] as const;
  const boxWidth = 190;
  const gap = 55;

  return [
    titleText({ x: origin.x, y: origin.y, text: "4 · Remediate with control" }),
    ...stages.map((stage, index) =>
      labeledBox({
        id: stage.id,
        x: origin.x + index * (boxWidth + gap),
        y,
        width: boxWidth,
        height: 105,
        text: stage.text,
        fill: stage.fill,
        fontSize: 18,
      }),
    ),
    ...stages.slice(0, -1).map((stage, index) =>
      boundArrow({
        id: `arrow-${stage.id}-${stages[index + 1].id}`,
        x: origin.x + (index + 1) * (boxWidth + gap) - gap,
        y: y + 52,
        startId: stage.id,
        endId: stages[index + 1].id,
        strokeColor: ACCENT,
        animated: true,
      }),
    ),
    titleText({
      x: origin.x,
      y: y + 145,
      text: "Agent speed. Existing review and deployment controls.",
      fontSize: BODY_SIZE,
    }),
  ];
};

export const BOARD_STACK_GAP = 480;
export const RUN_OFFSET = 72;

export const nextBoardOrigin = ({ runId }: { runId: number }): ScenePoint => ({
  x: 80 + runId * RUN_OFFSET,
  y: 60 + runId * BOARD_STACK_GAP,
});

const prefixIds = ({
  skeletons,
  runId,
}: {
  skeletons: ExcalidrawElementSkeleton[];
  runId: number;
}): ExcalidrawElementSkeleton[] => {
  const prefix = `wb-${runId}-`;
  return skeletons.map((skeleton) => {
    if (!("id" in skeleton) || !skeleton.id) {
      return skeleton;
    }
    const next = { ...skeleton, id: `${prefix}${skeleton.id}` };
    if (next.type !== "arrow") {
      return next;
    }
    const start =
      next.start && "id" in next.start && next.start.id
        ? { ...next.start, id: `${prefix}${next.start.id}` }
        : next.start;
    const end =
      next.end && "id" in next.end && next.end.id
        ? { ...next.end, id: `${prefix}${next.end.id}` }
        : next.end;
    return { ...next, start, end };
  });
};

export const buildBoardSkeletons = ({
  board,
  origin,
  runId,
}: {
  board: BoardKind;
  origin: ScenePoint;
  runId: number;
}): ExcalidrawElementSkeleton[] => {
  const skeletons = (() => {
    switch (board) {
      case "incident":
        return buildIncidentBoard(origin);
      case "dispatch":
        return buildDispatchBoard(origin);
      case "investigate":
        return buildInvestigateBoard(origin);
      case "remediate":
        return buildRemediateBoard(origin);
      default: {
        const _exhaustive: never = board;
        return _exhaustive;
      }
    }
  })();

  return prefixIds({ skeletons, runId });
};

export const boardTitle = (board: BoardKind): string => {
  switch (board) {
    case "incident":
      return "Detect the signal";
    case "dispatch":
      return "Dispatch with identity";
    case "investigate":
      return "Investigate inside the boundary";
    case "remediate":
      return "Remediate with control";
    default: {
      const _exhaustive: never = board;
      return _exhaustive;
    }
  }
};
