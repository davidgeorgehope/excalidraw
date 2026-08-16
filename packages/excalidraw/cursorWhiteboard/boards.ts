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
}: {
  id: string;
  x: number;
  y: number;
  startId: string;
  endId: string;
  strokeColor?: string;
}): ExcalidrawElementSkeleton => ({
  type: "arrow",
  id,
  x,
  y,
  strokeColor,
  strokeWidth: 2,
  roughness: 1,
  start: { id: startId, type: "rectangle" },
  end: { id: endId, type: "rectangle" },
});

const buildEffortBoard = (origin: ScenePoint): ExcalidrawElementSkeleton[] => {
  const boxWidth = 220;
  const boxHeight = 130;
  const gap = 24;
  const boxesY = origin.y + 70;
  const labels = [
    { id: "ktlo", text: "KTLO", fill: FILLS.rose },
    { id: "refactor", text: "Refactor", fill: FILLS.yellow },
    { id: "products", text: "New products", fill: FILLS.green },
    { id: "moonshot", text: "R&D / moonshot", fill: FILLS.blue },
  ] as const;

  return [
    titleText({
      x: origin.x,
      y: origin.y,
      text: "Where is effort going?",
    }),
    ...labels.map((item, index) =>
      labeledBox({
        id: item.id,
        x: origin.x + index * (boxWidth + gap),
        y: boxesY,
        width: boxWidth,
        height: boxHeight,
        text: item.text,
        fill: item.fill,
      }),
    ),
    titleText({
      x: origin.x,
      y: boxesY + boxHeight + 28,
      text: "If we freed capacity, where does it go?",
      fontSize: BODY_SIZE,
    }),
  ];
};

const buildSdlcBoard = (origin: ScenePoint): ExcalidrawElementSkeleton[] => {
  const stages = [
    { id: "plan", text: "Plan", fill: FILLS.gray },
    { id: "design", text: "Design", fill: FILLS.gray },
    { id: "write", text: "Write", fill: FILLS.orange },
    { id: "review", text: "Review", fill: FILLS.rose },
    { id: "test", text: "Test", fill: FILLS.rose },
    { id: "deploy", text: "Deploy", fill: FILLS.green },
  ] as const;
  const boxWidth = 130;
  const boxHeight = 72;
  const gap = 36;
  const boxesY = origin.y + 70;
  const gitY = boxesY + boxHeight + 56;
  const span = stages.length * boxWidth + (stages.length - 1) * gap;

  const boxes = stages.map((stage, index) =>
    labeledBox({
      id: stage.id,
      x: origin.x + index * (boxWidth + gap),
      y: boxesY,
      width: boxWidth,
      height: boxHeight,
      text: stage.text,
      fill: stage.fill,
    }),
  );

  const arrows = stages.slice(0, -1).map((stage, index) => {
    const next = stages[index + 1];
    return boundArrow({
      id: `arrow-${stage.id}-${next.id}`,
      x: origin.x + (index + 1) * (boxWidth + gap) - gap,
      y: boxesY + boxHeight / 2,
      startId: stage.id,
      endId: next.id,
    });
  });

  return [
    titleText({
      x: origin.x,
      y: origin.y,
      text: "The bottleneck moves",
    }),
    ...boxes,
    ...arrows,
    labeledBox({
      id: "git",
      x: origin.x,
      y: gitY,
      width: span,
      height: 52,
      text: "Git",
      fill: FILLS.violet,
    }),
    {
      type: "text",
      x: origin.x + 2 * (boxWidth + gap),
      y: boxesY - 36,
      text: "AI compresses Write",
      fontSize: 16,
      strokeColor: ACCENT,
    },
    {
      type: "text",
      x: origin.x + 3 * (boxWidth + gap),
      y: gitY + 64,
      text: "Bottleneck slides into Review / Test",
      fontSize: 16,
      strokeColor: ACCENT,
    },
  ];
};

const buildMaturityBoard = (
  origin: ScenePoint,
): ExcalidrawElementSkeleton[] => {
  const stages = [
    { id: "assisted", text: "AI-assisted", fill: FILLS.gray },
    { id: "sync", text: "Agents sync", fill: FILLS.yellow },
    { id: "async", text: "Cloud agents async", fill: FILLS.orange },
    { id: "factory", text: "AI software factory", fill: FILLS.green },
  ] as const;
  const boxWidth = 210;
  const boxHeight = 110;
  const gap = 40;
  const boxesY = origin.y + 80;

  const boxes = stages.map((stage, index) =>
    labeledBox({
      id: stage.id,
      x: origin.x + index * (boxWidth + gap),
      y: boxesY - index * 12,
      width: boxWidth,
      height: boxHeight + index * 8,
      text: stage.text,
      fill: stage.fill,
      fontSize: 18,
    }),
  );

  const arrows = stages.slice(0, -1).map((stage, index) => {
    const next = stages[index + 1];
    return boundArrow({
      id: `arrow-${stage.id}-${next.id}`,
      x: origin.x + (index + 1) * (boxWidth + gap) - gap,
      y: boxesY + boxHeight / 2,
      startId: stage.id,
      endId: next.id,
    });
  });

  return [
    titleText({
      x: origin.x,
      y: origin.y,
      text: "AI maturity",
    }),
    ...boxes,
    ...arrows,
  ];
};

const buildPlatformBoard = (
  origin: ScenePoint,
): ExcalidrawElementSkeleton[] => {
  const pillars = [
    { id: "agnostic", text: "Agnostic", fill: FILLS.blue },
    { id: "enterprise", text: "Enterprise", fill: FILLS.violet },
    { id: "platform", text: "Platform", fill: FILLS.orange },
  ] as const;
  const boxWidth = 260;
  const boxHeight = 150;
  const gap = 32;
  const boxesY = origin.y + 70;

  return [
    titleText({
      x: origin.x,
      y: origin.y,
      text: "Why Cursor",
    }),
    ...pillars.map((pillar, index) =>
      labeledBox({
        id: pillar.id,
        x: origin.x + index * (boxWidth + gap),
        y: boxesY,
        width: boxWidth,
        height: boxHeight,
        text: pillar.text,
        fill: pillar.fill,
        fontSize: 22,
      }),
    ),
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
      case "effort":
        return buildEffortBoard(origin);
      case "sdlc":
        return buildSdlcBoard(origin);
      case "maturity":
        return buildMaturityBoard(origin);
      case "platform":
        return buildPlatformBoard(origin);
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
    case "effort":
      return "Where is effort going?";
    case "sdlc":
      return "The bottleneck moves";
    case "maturity":
      return "AI maturity";
    case "platform":
      return "Why Cursor";
    default: {
      const _exhaustive: never = board;
      return _exhaustive;
    }
  }
};
