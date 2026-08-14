/** Lifecycle state of a todo item. */
export type TodoStatus = "pending" | "in_progress" | "completed";

/** Single todo item: a short summary shown in the widget, plus a longer goal for the agent. */
export interface TodoItem {
  id: number;
  status: TodoStatus;
  summary: string;
  goal: string;
}

/** In-memory todo state. */
export interface TodoState {
  todos: TodoItem[];
  nextId: number;
}

/**
 * One entry inside a `create` action's `items` array. Each entry becomes a
 * `TodoItem` (assigned a fresh id and `pending` status) once the batch is
 * committed atomically.
 */
export interface CreateTodoInput {
  summary: string;
  goal: string;
}

/** Snapshot persisted into tool result `details` so branching/forking reconstructs the list. */
export interface TodoDetails {
  action:
    | "create"
    | "list"
    | "start"
    | "complete"
    | "reopen"
    | "clean";
  todos: TodoItem[];
  nextId: number;
}

export const EMPTY_STATE: TodoState = { todos: [], nextId: 1 };

/** Default status assigned to a freshly-added todo. */
export const DEFAULT_STATUS: TodoStatus = "pending";

/** Maximum number of items rendered in the widget before showing a `+N more` hint. */
export const MAX_DISPLAY = 4;
