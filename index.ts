/**
 * pi-todo Extension
 *
 * Provides a todo list for the agent:
 * - A `todo` tool with `create` / `list` / `start` / `complete` / `reopen` / `clean`
 *   actions; items are batch-created via `create items: [{summary, goal}, ...]`
 *   and never individually deleted (use `clean` to reset between rounds)
 * - Each item has a short `summary` (shown in the widget) and a longer `goal` (for the agent)
 * - A widget above the editor shows up to 4 summaries and a `+N more` hint
 *   for the hidden remainder
 *
 * State is persisted in tool result `details` so branching/forking reconstructs
 * the correct list for the current branch.
 *
 * Module layout:
 * - `types.ts`   — shared interfaces and constants
 * - `schema.ts`  — TypeBox schema for the `todo` tool parameters
 * - `store.ts`   — state container + branch replay helpers
 * - `widget.ts`  — TUI widget rendering the current list
 * - `tool.ts`    — `todo` tool definition (handlers + render callbacks)
 * - `index.ts`   — extension entry point (this file)
 *
 * Note: this entry file lives at the project root; sibling modules are
 * imported from `./src/...`.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { TodoWidget } from "./src/widget.js";
import { createStore, readState } from "./src/store.js";
import { registerTodoTool } from "./src/tool.js";

export default function (pi: ExtensionAPI) {
  // Single source of truth, scoped to this extension instance (a new factory
  // call is made for each session).
  const store = createStore();

  function syncWidget(ctx: ExtensionContext): void {
    if (!ctx.hasUI) return;
    ctx.ui.setWidget(
      "pi-todo",
      (_tui, theme) => new TodoWidget(() => store.state, theme),
      { placement: "aboveEditor" },
    );
  }

  pi.on("session_start", async (_event, ctx) => {
    store.reset(readState(ctx));
    syncWidget(ctx);
  });

  pi.on("session_tree", async (_event, ctx) => {
    store.reset(readState(ctx));
  });

  registerTodoTool(pi, store);
}