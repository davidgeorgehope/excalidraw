import { convertToExcalidrawElements } from "@excalidraw/element";

import { boardTitle, buildBoardSkeletons, nextBoardOrigin } from "./boards";
import { BOARD_KINDS, isBoardKind } from "./types";

const textOf = (elements: readonly { type: string; text?: string }[]) =>
  elements
    .filter((element) => element.type === "text")
    .map((element) => element.text ?? "");

describe("cursor whiteboard boards", () => {
  it("builds effort with the four investment buckets", () => {
    const origin = nextBoardOrigin({ runId: 0 });
    const elements = convertToExcalidrawElements(
      buildBoardSkeletons({
        board: "effort",
        origin,
        runId: 0,
      }),
      { regenerateIds: false },
    );

    const labels = textOf(elements);
    expect(labels).toContain("Where is effort going?");
    expect(labels).toContain("KTLO");
    expect(labels).toContain("Refactor");
    expect(labels).toContain("New products");
    expect(labels).toContain("R&D / moonshot");
    expect(labels).toContain("If we freed capacity, where does it go?");
    expect(elements.some((element) => element.type === "rectangle")).toBe(true);
  });

  it("builds sdlc with git under the line and the write callout", () => {
    const elements = convertToExcalidrawElements(
      buildBoardSkeletons({
        board: "sdlc",
        origin: nextBoardOrigin({ runId: 1 }),
        runId: 1,
      }),
      { regenerateIds: false },
    );
    const labels = textOf(elements);
    expect(labels).toEqual(
      expect.arrayContaining([
        "The bottleneck moves",
        "Plan",
        "Design",
        "Write",
        "Review",
        "Test",
        "Deploy",
        "Git",
        "AI compresses Write",
        "Bottleneck slides into Review / Test",
      ]),
    );
    expect(elements.some((element) => element.type === "arrow")).toBe(true);
  });

  it("builds maturity and platform boards", () => {
    const maturity = convertToExcalidrawElements(
      buildBoardSkeletons({
        board: "maturity",
        origin: nextBoardOrigin({ runId: 2 }),
        runId: 2,
      }),
      { regenerateIds: false },
    );
    const platform = convertToExcalidrawElements(
      buildBoardSkeletons({
        board: "platform",
        origin: nextBoardOrigin({ runId: 3 }),
        runId: 3,
      }),
      { regenerateIds: false },
    );

    expect(textOf(maturity)).toEqual(
      expect.arrayContaining([
        "AI-assisted",
        "Agents sync",
        "Cloud agents async",
        "AI software factory",
      ]),
    );
    expect(textOf(platform)).toEqual(
      expect.arrayContaining(["Agnostic", "Enterprise", "Platform"]),
    );
  });

  it("offsets later runs so boards do not stack", () => {
    const first = nextBoardOrigin({ runId: 0 });
    const second = nextBoardOrigin({ runId: 1 });
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBeGreaterThan(first.y);

    const a = convertToExcalidrawElements(
      buildBoardSkeletons({ board: "effort", origin: first, runId: 0 }),
      { regenerateIds: false },
    );
    const b = convertToExcalidrawElements(
      buildBoardSkeletons({ board: "effort", origin: second, runId: 1 }),
      { regenerateIds: false },
    );
    const firstBox = a.find((element) => element.type === "rectangle");
    const secondBox = b.find((element) => element.type === "rectangle");
    expect(firstBox).toBeDefined();
    expect(secondBox).toBeDefined();
    if (!firstBox || !secondBox) {
      return;
    }
    expect(secondBox.x).not.toBe(firstBox.x);
    expect(secondBox.y).not.toBe(firstBox.y);
    expect(secondBox.id).not.toBe(firstBox.id);
  });

  it("covers every board kind", () => {
    for (const board of BOARD_KINDS) {
      expect(isBoardKind(board)).toBe(true);
      expect(boardTitle(board).length).toBeGreaterThan(0);
      expect(
        buildBoardSkeletons({
          board,
          origin: { x: 0, y: 0 },
          runId: 9,
        }).length,
      ).toBeGreaterThan(0);
    }
    expect(isBoardKind("account")).toBe(false);
  });
});
