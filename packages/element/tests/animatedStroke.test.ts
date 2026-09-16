import { afterEach, describe, expect, it, vi } from "vitest";

import { ROUNDNESS } from "@excalidraw/common";

import { API } from "@excalidraw/excalidraw/tests/helpers/api";

import {
  ANIMATED_STROKE_OFFSET_MS,
  applyAnimatedStrokeOptions,
  getAnimatedStrokeLineDashOffset,
  getDashArrayDashed,
  isClosedStrokeElement,
  restoreAnimatedStrokeOptions,
  shouldStrokeAnimatedClosedOutline,
  strokeAnimatedClosedOutline,
} from "../src/animatedStroke";
import { mutateElement } from "../src/mutateElement";
import { ShapeCache } from "../src/shape";

import type { Drawable } from "roughjs/bin/core";

const renderConfig = {
  isExporting: false,
  canvasBackgroundColor: "#ffffff",
  embedsValidationStatus: new Map(),
  theme: "light" as const,
};

const createDrawable = (overrides: Partial<Drawable["options"]> = {}): Drawable =>
  ({
    shape: "rectangle",
    sets: [],
    options: { ...overrides },
  }) as Drawable;

describe("animated closed-shape strokes", () => {
  afterEach(() => {
    ShapeCache.destroy();
  });

  it("treats boxes as closed stroke elements and lines as open", () => {
    const rectangle = API.createElement({ type: "rectangle" });
    const diamond = API.createElement({ type: "diamond" });
    const ellipse = API.createElement({ type: "ellipse" });
    const arrow = API.createElement({ type: "arrow" });
    const line = API.createElement({ type: "line" });

    expect(isClosedStrokeElement(rectangle)).toBe(true);
    expect(isClosedStrokeElement(diamond)).toBe(true);
    expect(isClosedStrokeElement(ellipse)).toBe(true);
    expect(isClosedStrokeElement(arrow)).toBe(false);
    expect(isClosedStrokeElement(line)).toBe(false);
  });

  it("strokes a continuous outline for animated boxes but not while exporting", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      strokeStyle: "animated",
    });

    expect(shouldStrokeAnimatedClosedOutline(rectangle, false)).toBe(true);
    expect(shouldStrokeAnimatedClosedOutline(rectangle, true)).toBe(false);
    expect(
      shouldStrokeAnimatedClosedOutline(
        { ...rectangle, strokeStyle: "dashed" },
        false,
      ),
    ).toBe(false);
  });

  it("generates a dash array on animated rectangle shapes", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      width: 160,
      height: 80,
      strokeStyle: "animated",
      strokeWidth: 2,
      roundness: null,
    });

    const shape = ShapeCache.generateElementShape(rectangle, renderConfig);

    expect(shape).toBeTruthy();
    expect(shape.options.strokeLineDash).toEqual(getDashArrayDashed(2));
  });

  it("generates a dash array on rounded animated rectangles", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      width: 160,
      height: 80,
      strokeStyle: "animated",
      strokeWidth: 2,
      roundness: { type: ROUNDNESS.ADAPTIVE_RADIUS },
    });

    const shape = ShapeCache.generateElementShape(rectangle, renderConfig);

    expect(shape.options.strokeLineDash).toEqual(getDashArrayDashed(2));
  });

  it("injects a dash array when the cached shape is missing one", () => {
    vi.spyOn(performance, "now").mockReturnValue(800);

    const rectangle = API.createElement({
      type: "rectangle",
      strokeStyle: "animated",
      strokeWidth: 2,
    });
    const shape = createDrawable();

    const snapshot = applyAnimatedStrokeOptions(shape, rectangle, false);

    expect(shape.options.strokeLineDash).toEqual(getDashArrayDashed(2));
    expect(shape.options.strokeLineDashOffset).toBe(
      getAnimatedStrokeLineDashOffset(800),
    );
    expect(shape.options.stroke).toBe("transparent");
    expect(snapshot).toEqual({
      strokeLineDashOffset: undefined,
      stroke: undefined,
    });

    restoreAnimatedStrokeOptions(shape, snapshot);

    expect(shape.options.strokeLineDash).toEqual(getDashArrayDashed(2));
    expect(shape.options.strokeLineDashOffset).toBeUndefined();
    expect(shape.options.stroke).toBeUndefined();
  });

  it("does not hide the stroke of animated arrows", () => {
    const arrow = API.createElement({
      type: "arrow",
      strokeStyle: "animated",
      strokeWidth: 2,
    });
    const shape = createDrawable({ stroke: "#1e1e1e" });

    applyAnimatedStrokeOptions(shape, arrow, false);

    expect(shape.options.stroke).toBe("#1e1e1e");
    expect(shape.options.strokeLineDash).toEqual(getDashArrayDashed(2));
  });

  it("advances the dash offset over time", () => {
    expect(getAnimatedStrokeLineDashOffset(0)).toBe(0);
    expect(getAnimatedStrokeLineDashOffset(ANIMATED_STROKE_OFFSET_MS)).toBe(-1);
    expect(getAnimatedStrokeLineDashOffset(400)).toBe(-10);
  });

  it("strokes a single closed path around an animated box", () => {
    vi.spyOn(performance, "now").mockReturnValue(400);

    const rectangle = API.createElement({
      type: "rectangle",
      width: 200,
      height: 100,
      strokeStyle: "animated",
      strokeWidth: 2,
      strokeColor: "#1971c2",
      roundness: null,
    });

    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      roundRect: vi.fn(),
      ellipse: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      lineJoin: "",
      lineCap: "",
      lineWidth: 0,
      strokeStyle: "",
      lineDashOffset: 0,
    } as unknown as CanvasRenderingContext2D;

    strokeAnimatedClosedOutline(context, rectangle, "light");

    expect(context.setLineDash).toHaveBeenCalledWith(getDashArrayDashed(2));
    expect(context.lineDashOffset).toBe(-10);
    expect(context.rect).toHaveBeenCalledWith(0, 0, 200, 100);
    expect(context.stroke).toHaveBeenCalledTimes(1);
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });

  it("invalidates the shape cache when strokeStyle is mutated in place", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      width: 120,
      height: 60,
      strokeStyle: "solid",
      strokeWidth: 2,
      roundness: null,
    });
    const elementsMap = new Map([[rectangle.id, rectangle]]);

    const solidShape = ShapeCache.generateElementShape(rectangle, renderConfig);
    expect(solidShape.options.strokeLineDash).toBeUndefined();

    mutateElement(rectangle, elementsMap, { strokeStyle: "animated" });

    expect(ShapeCache.get(rectangle, "light")).toBeUndefined();

    const animatedShape = ShapeCache.generateElementShape(
      rectangle,
      renderConfig,
    );
    expect(animatedShape.options.strokeLineDash).toEqual(getDashArrayDashed(2));
  });
});
