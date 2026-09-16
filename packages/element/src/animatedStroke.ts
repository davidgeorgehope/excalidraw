import {
  DEFAULT_ADAPTIVE_RADIUS,
  DEFAULT_PROPORTIONAL_RADIUS,
  ROUNDNESS,
  THEME,
  applyDarkModeFilter,
  assertNever,
} from "@excalidraw/common";

import type { ExcalidrawElement } from "./types";
import type { Drawable } from "roughjs/bin/core";

type AnimatedStrokeSnapshot = {
  strokeLineDashOffset: number | undefined;
  stroke: string | undefined;
};

/** milliseconds per dash-offset unit — matches the linear-element flow speed */
export const ANIMATED_STROKE_OFFSET_MS = 40;

export const getDashArrayDashed = (strokeWidth: number) => [
  8,
  8 + strokeWidth,
];

export const getDashArrayDotted = (strokeWidth: number) => [
  1.5,
  6 + strokeWidth,
];

export const getAnimatedStrokeLineDashOffset = (
  now: number = performance.now(),
) => -now / ANIMATED_STROKE_OFFSET_MS;

/**
 * Closed shapes whose roughjs outline is emitted as one subpath per edge.
 * Canvas restarts the dash pattern on each subpath, so the flow never travels
 * around the box unless we stroke a single continuous outline ourselves.
 */
export const isClosedStrokeElement = (
  element: ExcalidrawElement,
): element is Extract<
  ExcalidrawElement,
  {
    type: "rectangle" | "iframe" | "embeddable" | "diamond" | "ellipse";
  }
> => {
  switch (element.type) {
    case "rectangle":
    case "iframe":
    case "embeddable":
    case "diamond":
    case "ellipse":
      return true;
    case "arrow":
    case "line":
    case "freedraw":
    case "text":
    case "image":
    case "frame":
    case "magicframe":
    case "selection":
      return false;
    default: {
      return assertNever(
        element,
        `unhandled element type ${(element as ExcalidrawElement).type}`,
        true,
      );
    }
  }
};

export const shouldStrokeAnimatedClosedOutline = (
  element: ExcalidrawElement,
  isExporting: boolean,
) =>
  !isExporting &&
  element.strokeStyle === "animated" &&
  isClosedStrokeElement(element);

/**
 * Ensures the cached roughjs drawable carries a dash array + marching offset.
 * Closed shapes hide the per-edge rough stroke so we can paint a single
 * continuous outline instead (see strokeAnimatedClosedOutline).
 */
export const applyAnimatedStrokeOptions = (
  shape: Drawable,
  element: ExcalidrawElement,
  isExporting: boolean,
): AnimatedStrokeSnapshot | undefined => {
  if (
    !shape?.options ||
    element.strokeStyle !== "animated" ||
    isExporting
  ) {
    return undefined;
  }

  const snapshot: AnimatedStrokeSnapshot = {
    strokeLineDashOffset: shape.options.strokeLineDashOffset,
    stroke: shape.options.stroke,
  };

  if (!shape.options.strokeLineDash?.length) {
    shape.options.strokeLineDash = getDashArrayDashed(element.strokeWidth);
  }
  shape.options.strokeLineDashOffset = getAnimatedStrokeLineDashOffset();

  if (isClosedStrokeElement(element)) {
    shape.options.stroke = "transparent";
  }

  return snapshot;
};

export const restoreAnimatedStrokeOptions = (
  shape: Drawable,
  snapshot: AnimatedStrokeSnapshot | undefined,
) => {
  if (!snapshot || !shape?.options) {
    return;
  }

  if (snapshot.strokeLineDashOffset === undefined) {
    delete shape.options.strokeLineDashOffset;
  } else {
    shape.options.strokeLineDashOffset = snapshot.strokeLineDashOffset;
  }

  if (snapshot.stroke === undefined) {
    delete shape.options.stroke;
  } else {
    shape.options.stroke = snapshot.stroke;
  }

  // Keep an injected dash array on the cached shape so later frames do not
  // depend on generateRoughOptions having copied it through.
};

// Inlined from getCornerRadius() so this module stays free of the
// shape <-> bounds <-> utils import cycle.
const getClosedShapeCornerRadius = (
  size: number,
  element: ExcalidrawElement,
) => {
  if (
    element.roundness?.type === ROUNDNESS.PROPORTIONAL_RADIUS ||
    element.roundness?.type === ROUNDNESS.LEGACY
  ) {
    return size * DEFAULT_PROPORTIONAL_RADIUS;
  }

  if (element.roundness?.type === ROUNDNESS.ADAPTIVE_RADIUS) {
    const fixedRadiusSize = element.roundness?.value ?? DEFAULT_ADAPTIVE_RADIUS;
    const cutoffSize = fixedRadiusSize / DEFAULT_PROPORTIONAL_RADIUS;

    if (size <= cutoffSize) {
      return size * DEFAULT_PROPORTIONAL_RADIUS;
    }

    return fixedRadiusSize;
  }

  return 0;
};

const traceClosedElementOutline = (
  context: CanvasRenderingContext2D,
  element: Extract<
    ExcalidrawElement,
    {
      type: "rectangle" | "iframe" | "embeddable" | "diamond" | "ellipse";
    }
  >,
) => {
  switch (element.type) {
    case "rectangle":
    case "iframe":
    case "embeddable": {
      if (element.roundness && context.roundRect) {
        const radius = getClosedShapeCornerRadius(
          Math.min(element.width, element.height),
          element,
        );
        context.roundRect(0, 0, element.width, element.height, radius);
        break;
      }
      context.rect(0, 0, element.width, element.height);
      break;
    }
    case "diamond": {
      // Keep this inlined so this module does not import bounds (shape -> this
      // file -> bounds -> shape). Matches getDiamondPoints().
      const topX = Math.floor(element.width / 2) + 1;
      const topY = 0;
      const rightX = element.width;
      const rightY = Math.floor(element.height / 2) + 1;
      const bottomX = topX;
      const bottomY = element.height;
      const leftX = 0;
      const leftY = rightY;
      context.moveTo(topX, topY);
      context.lineTo(rightX, rightY);
      context.lineTo(bottomX, bottomY);
      context.lineTo(leftX, leftY);
      context.closePath();
      break;
    }
    case "ellipse": {
      context.ellipse(
        element.width / 2,
        element.height / 2,
        Math.abs(element.width / 2),
        Math.abs(element.height / 2),
        0,
        0,
        Math.PI * 2,
      );
      break;
    }
    default: {
      assertNever(element, "unhandled closed stroke element", true);
    }
  }
};

export const strokeAnimatedClosedOutline = (
  context: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  theme: typeof THEME.LIGHT | typeof THEME.DARK = THEME.LIGHT,
) => {
  if (!isClosedStrokeElement(element)) {
    return;
  }

  context.save();
  context.strokeStyle = applyDarkModeFilter(
    element.strokeColor,
    theme === THEME.DARK,
  );
  // match generateRoughOptions: non-solid strokes are drawn slightly thicker
  // because multi-stroke is disabled
  context.lineWidth = element.strokeWidth + 0.5;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.setLineDash(getDashArrayDashed(element.strokeWidth));
  context.lineDashOffset = getAnimatedStrokeLineDashOffset();
  context.beginPath();
  traceClosedElementOutline(context, element);
  context.stroke();
  context.restore();
};
