import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";
import {
  resetCursorWhiteboardForTests,
  startCursorWhiteboard,
} from "../cursorWhiteboard/run";
import { getWhiteboardSession } from "../cursorWhiteboard/session";

import { API } from "./helpers/api";
import { GlobalTestState, act, fireEvent, render } from "./test-utils";

describe("cursor whiteboard", () => {
  beforeEach(() => {
    resetCursorWhiteboardForTests();
  });

  it("shows the overflow action and draws board 1 as real elements", async () => {
    await render(<Excalidraw />);

    fireEvent.click(
      GlobalTestState.renderResult.container.querySelector(
        ".App-toolbar__extra-tools-trigger",
      )!,
    );

    const item = document.querySelector<HTMLButtonElement>(
      '[data-testid="toolbar-cursor-whiteboard"]',
    );
    expect(item).not.toBeNull();
    expect(item?.textContent).toMatch(/Cursor Whiteboard/i);

    act(() => {
      startCursorWhiteboard({
        app: window.h.app,
        board: "effort",
        instant: true,
      });
    });

    const texts = window.h.elements
      .filter((element) => element.type === "text")
      .map((element) => ("text" in element ? element.text : ""));
    expect(texts).toContain("Where is effort going?");
    expect(texts).toContain("KTLO");
    expect(
      window.h.elements.some((element) => element.type === "rectangle"),
    ).toBe(true);
    expect(getWhiteboardSession().kind).toBe("ready");
  });

  it("advances later boards without stacking on the first origin", async () => {
    await render(<Excalidraw />);

    act(() => {
      startCursorWhiteboard({
        app: window.h.app,
        board: "effort",
        instant: true,
      });
    });
    act(() => {
      startCursorWhiteboard({
        app: window.h.app,
        board: "sdlc",
        instant: true,
      });
    });

    const texts = window.h.elements
      .filter((element) => element.type === "text")
      .map((element) => ("text" in element ? element.text : ""));
    expect(texts).toContain("Where is effort going?");
    expect(texts).toContain("The bottleneck moves");
    expect(texts).toContain("Git");

    const boxes = window.h.elements.filter(
      (element) => element.type === "rectangle",
    );
    const ys = new Set(boxes.map((element) => element.y));
    expect(ys.size).toBeGreaterThan(1);

    const firstBox = boxes.find(
      (
        element,
      ): element is NonDeletedExcalidrawElement & { type: "rectangle" } =>
        element.isDeleted === false,
    );
    expect(firstBox).toBeDefined();
    if (!firstBox) {
      return;
    }
    API.setSelectedElements([firstBox]);
    expect(API.getSelectedElement().id).toBe(firstBox.id);
  });

  it("exposes board 2-4 controls after spawn", async () => {
    await render(<Excalidraw />);

    act(() => {
      startCursorWhiteboard({
        app: window.h.app,
        board: "effort",
        instant: true,
      });
    });

    expect(
      document.querySelector('[data-testid="cursor-whiteboard-sdlc"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="cursor-whiteboard-maturity"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="cursor-whiteboard-platform"]'),
    ).not.toBeNull();
  });
});
