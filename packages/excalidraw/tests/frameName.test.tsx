import React from "react";

import { FRAME_STYLE } from "@excalidraw/common";

import { Excalidraw } from "../index";

import { getNormalizedZoom } from "../scene/normalize";

import { API } from "./helpers/api";
import {
  act,
  mockBoundingClientRect,
  render,
  restoreOriginalGetBoundingClientRect,
  waitFor,
  GlobalTestState,
} from "./test-utils";

const { h } = window;

const queryFrameName = () =>
  GlobalTestState.renderResult.container.querySelector(
    ".frame-name",
  ) as HTMLDivElement | null;

const setZoom = (value: number) => {
  act(() => {
    h.setState({ zoom: { value: getNormalizedZoom(value) } });
  });
};

// A frame wide enough that its label shows at 100% zoom, but collapses below
// the hide-threshold (`nameFontSize * 3`) when fully zoomed out.
const FRAME_WIDTH = 200;

const createNamedFrame = () => {
  const frame = API.createElement({
    type: "frame",
    x: 0,
    y: 0,
    width: FRAME_WIDTH,
    height: 200,
  });
  API.setElements([frame]);
  API.updateElement(frame, { name: "Frame 1" });
  return frame;
};

describe("frame name readability while zooming", () => {
  beforeEach(async () => {
    mockBoundingClientRect();
    await render(<Excalidraw handleKeyboardGlobally={true} />);
    await waitFor(() => expect(h.state.width).toBe(200));
  });

  afterEach(() => {
    restoreOriginalGetBoundingClientRect();
  });

  it("renders the label as a constant 14px HUD across zoom levels", async () => {
    const frame = createNamedFrame();
    // keep it selected so it stays visible even fully zoomed out
    API.setSelectedElements([frame]);

    for (const zoom of [1, 2, 0.1]) {
      setZoom(zoom);
      const div = await waitFor(() => {
        const el = queryFrameName();
        expect(el).not.toBe(null);
        return el as HTMLDivElement;
      });
      expect(div.style.fontSize).toBe(`${FRAME_STYLE.nameFontSize}px`);
    }
  });

  it("clips an unselected label to the frame width at normal zoom", async () => {
    createNamedFrame();

    setZoom(1);
    const div = await waitFor(() => {
      const el = queryFrameName();
      expect(el).not.toBe(null);
      return el as HTMLDivElement;
    });
    // ellipsis behavior: label bounded by the on-screen frame width
    expect(div.style.maxWidth).toBe(`${FRAME_WIDTH}px`);
    expect(div.style.textOverflow).toBe("ellipsis");
  });

  it("hides an unselected label when the frame is too small on screen", async () => {
    createNamedFrame();

    // 200 * 0.1 = 20px on screen, below nameFontSize * 3 (42px) -> hidden
    setZoom(0.1);
    await waitFor(() => {
      expect(h.state.zoom.value).toBe(getNormalizedZoom(0.1));
    });
    expect(queryFrameName()).toBe(null);
  });

  it("keeps a selected label visible and unclipped when zoomed out", async () => {
    const frame = createNamedFrame();
    API.setSelectedElements([frame]);

    setZoom(0.1);
    const div = await waitFor(() => {
      const el = queryFrameName();
      expect(el).not.toBe(null);
      return el as HTMLDivElement;
    });
    // fully readable: no width clip so the name isn't ellipsized to nothing
    expect(div.style.maxWidth).toBe("none");
  });

  it("keeps the edited frame's label visible when zoomed out", async () => {
    const frame = createNamedFrame();
    API.setAppState({ editingFrame: frame.id });

    setZoom(0.1);
    const input = await waitFor(() => {
      const el =
        GlobalTestState.renderResult.container.querySelector(
          ".frame-name input",
        );
      expect(el).not.toBe(null);
      return el as HTMLInputElement;
    });
    expect(input).not.toBe(null);
  });
});
