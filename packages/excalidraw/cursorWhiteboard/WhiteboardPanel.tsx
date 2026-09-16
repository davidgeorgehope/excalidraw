import { useSyncExternalStore } from "react";

import { Island } from "../components/Island";
import { t } from "../i18n";

import { startCursorWhiteboard } from "./run";
import { getWhiteboardSession, subscribeWhiteboardSession } from "./session";
import { BOARD_KINDS } from "./types";

import "./WhiteboardPanel.scss";

import type { AppClassProperties } from "../types";

export const CursorWhiteboardPanel = ({ app }: { app: AppClassProperties }) => {
  const session = useSyncExternalStore(
    subscribeWhiteboardSession,
    getWhiteboardSession,
    getWhiteboardSession,
  );

  if (session.kind === "idle") {
    return null;
  }

  const drawing = session.kind === "drawing";

  return (
    <div className="cursor-whiteboard-panel-host">
      <Island className="cursor-whiteboard-panel" padding={3}>
        <div className="cursor-whiteboard-panel__title">
          {t("cursorWhiteboard.menu")}
        </div>
        {drawing && (
          <div className="cursor-whiteboard-panel__status">
            {t("cursorWhiteboard.drawing")}
          </div>
        )}
        <div className="cursor-whiteboard-panel__buttons">
          {BOARD_KINDS.map((board) => (
            <button
              key={board}
              type="button"
              className="cursor-whiteboard-panel__button"
              data-testid={`cursor-whiteboard-${board}`}
              disabled={drawing}
              onClick={() => startCursorWhiteboard({ app, board })}
            >
              {t(`cursorWhiteboard.${board}`)}
            </button>
          ))}
        </div>
      </Island>
    </div>
  );
};
