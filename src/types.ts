/** Lifecycle state of a todo item. */
export type TodoStatus = "pending" | "in_progress" | "completed";

/**
 * Single todo item: a short summary shown in the widget, plus a longer goal
 * for the agent. The `summary` is the item's identity — there is no separate
 * numeric id; lookups and references in `start` / `complete` / `reopen`
 * pass the exact summary string.
 */
export interface TodoItem {
  status: TodoStatus;
  summary: string;
  goal: string;
}

/** In-memory todo state. */
export interface TodoState {
  todos: TodoItem[];
}

/**
 * One entry inside a `create` action's `items` array. Each entry becomes a
 * `TodoItem` (assigned `pending` status) once the batch is committed
 * atomically. The whole batch is rejected if any summary already exists in
 * the list or collides with another entry in the same batch.
 */
export interface CreateTodoInput {
  summary: string;
  goal: string;
}

export const EMPTY_STATE: TodoState = { todos: [] };

/** Default status assigned to a freshly-added todo. */
export const DEFAULT_STATUS: TodoStatus = "pending";

/** Maximum number of items rendered in the widget before showing a `+N more` hint. */
export const MAX_DISPLAY = 4;
