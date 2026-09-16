import { convertToExcalidrawElements } from "@excalidraw/element";

import { boardTitle, buildBoardSkeletons, nextBoardOrigin } from "./boards";
import { BOARD_KINDS, isBoardKind } from "./types";

const textOf = (elements: readonly { type: string; text?: string }[]) =>
  elements
    .filter((element) => element.type === "text")
    .map((element) => element.text ?? "");

describe("cursor whiteboard boards", () => {
  it("builds the incident signal flow with an animated alert", () => {
    const origin = nextBoardOrigin({ runId: 0 });
    const elements = convertToExcalidrawElements(
      buildBoardSkeletons({
        board: "incident",
        origin,
        runId: 0,
      }),
      { regenerateIds: false },
    );

    const labels = textOf(elements);
    expect(labels).toContain("1 · Detect the signal");
    expect(labels).toContain("Datadog\nproduction alert");
    expect(labels).toContain("Slack\n#incidents");
    expect(elements.some((element) => element.type === "rectangle")).toBe(true);
    expect(
      elements.some(
        (element) =>
          element.type === "arrow" && element.strokeStyle === "animated",
      ),
    ).toBe(true);
  });

  it("builds dispatch from Slack to an Iterable private worker", () => {
    const elements = convertToExcalidrawElements(
      buildBoardSkeletons({
        board: "dispatch",
        origin: nextBoardOrigin({ runId: 1 }),
        runId: 1,
      }),
      { regenerateIds: false },
    );
    const labels = textOf(elements);
    expect(labels).toEqual(
      expect.arrayContaining([
        "2 · Dispatch with identity",
        "Slack trigger",
        "Cursor Cloud Agent",
        "Private Worker\ninside Iterable",
        "Runs with the initiating user's identity",
      ]),
    );
    expect(elements.some((element) => element.type === "arrow")).toBe(true);
  });

  it("builds investigation and remediation boards", () => {
    const investigate = convertToExcalidrawElements(
      buildBoardSkeletons({
        board: "investigate",
        origin: nextBoardOrigin({ runId: 2 }),
        runId: 2,
      }),
      { regenerateIds: false },
    );
    const remediate = convertToExcalidrawElements(
      buildBoardSkeletons({
        board: "remediate",
        origin: nextBoardOrigin({ runId: 3 }),
        runId: 3,
      }),
      { regenerateIds: false },
    );

    expect(textOf(investigate)).toEqual(
      expect.arrayContaining([
        "Private Worker",
        "Backstage",
        "Kubernetes",
        "Iterable private network · private endpoints stay private",
        "Approved MCP tools\nNo PII access",
      ]),
    );
    const boundary = investigate.find((element) =>
      element.id.endsWith("network-boundary"),
    );
    const internalSystems = investigate.filter(
      (element) =>
        element.id.endsWith("backstage") ||
        element.id.endsWith("kubernetes") ||
        element.id.endsWith("governed-access"),
    );
    expect(boundary?.type).toBe("rectangle");
    expect(internalSystems).toHaveLength(3);
    for (const system of internalSystems) {
      expect(system.x).toBeGreaterThan(boundary?.x ?? Number.POSITIVE_INFINITY);
      expect(system.x + system.width).toBeLessThan(
        (boundary?.x ?? 0) + (boundary?.width ?? 0),
      );
    }
    expect(textOf(remediate)).toEqual(
      expect.arrayContaining([
        "Root cause",
        "Proposed fix",
        "Open PR",
        "Human review",
      ]),
    );
  });

  it("offsets later runs so boards do not stack", () => {
    const first = nextBoardOrigin({ runId: 0 });
    const second = nextBoardOrigin({ runId: 1 });
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBeGreaterThan(first.y);

    const a = convertToExcalidrawElements(
      buildBoardSkeletons({ board: "incident", origin: first, runId: 0 }),
      { regenerateIds: false },
    );
    const b = convertToExcalidrawElements(
      buildBoardSkeletons({ board: "incident", origin: second, runId: 1 }),
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
