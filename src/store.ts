import type {
  TodoState,
  TodoItem,
  TodoStatus,
  CreateTodoInput,
} from "./types.js";
import { DEFAULT_STATUS } from "./types.js";

// ----------------------------------------------------------------------------
// Pure functions — no closure over mutable state.
// ----------------------------------------------------------------------------

/**
 * True when the list has at least one item and every item is `completed`.
 * Used by the tool layer to remind the LLM (via the result text) that the
 * round looks done and it should call `clean`.
 */
export function isAllCompleted(state: TodoState): boolean {
  return state.todos.length > 0 && state.todos.every((t) => t.status === "completed");
}

// ----------------------------------------------------------------------------
// State-machine helpers
// ----------------------------------------------------------------------------

/**
 * Allowed transitions between statuses. Encoded as a map from current → set of
 * valid next states. The map is small enough to keep inline; rejecting an
 * invalid transition throws so the tool layer can surface a clear error to the
 * LLM.
 */
const TRANSITIONS: Record<TodoStatus, ReadonlySet<TodoStatus>> = {
  pending: new Set(["pending", "in_progress", "completed"]),
  in_progress: new Set(["in_progress", "completed"]),
  completed: new Set(["completed", "pending"]),
};

/** Throws if `next` is not reachable from `current`. */
export function assertTransition(current: TodoStatus, next: TodoStatus): void {
  if (!TRANSITIONS[current].has(next)) {
    throw new Error(`cannot transition todo from "${current}" to "${next}"`);
  }
}

// ----------------------------------------------------------------------------
// Mutable store — scoped to one extension instance / session.
// ----------------------------------------------------------------------------

export interface TodoStore {
  /** Live state. Reads always return the latest snapshot. */
  readonly state: TodoState;
  /**
   * Batch-create one or more todos atomically. Returns the created items in
   * input order. Throws if any summary already exists in the list or appears
   * more than once in the batch — the whole batch is rejected without
   * mutating state.
   */
  create(items: ReadonlyArray<CreateTodoInput>): TodoItem[];
  list(): readonly TodoItem[];
  /** Move a todo identified by `summary` to `in_progress`. */
  start(summary: string): TodoItem;
  /** Mark a todo identified by `summary` as completed. */
  complete(summary: string): TodoItem;
  /** Reopen a completed todo identified by `summary` back to pending. */
  reopen(summary: string): TodoItem;
  /** Empty the list — used between rounds of work. */
  clear(): void;
}

function findTodoBySummary(state: TodoState, summary: string): TodoItem {
  const todo = state.todos.find((t) => t.summary === summary);
  if (!todo) throw new Error(`todo with summary "${summary}" not found`);
  return todo;
}

function transition(state: TodoState, summary: string, next: TodoStatus): TodoItem {
  const todo = findTodoBySummary(state, summary);
  assertTransition(todo.status, next);
  todo.status = next;
  return todo;
}

export function createStore(): TodoStore {
  // Use a fresh object literal — never spread from `EMPTY_STATE` (or any shared
  // constant), because `create()` mutates `state.todos` in place. A shallow copy
  // would alias `state.todos` with the shared constant, so a later `clear()`
  // (which only replaces `state.todos`) would leave the shared constant
  // pointing at the old array — and the *next* `createStore()` call would
  // inherit the previous session's todos across `/new`.
  const state: TodoState = { todos: [] };

  return {
    get state() { return state; },
    create(items) {
      if (items.length === 0) {
        throw new Error("create requires at least one item");
      }
      // Two-pass atomicity: validate the whole batch against the current
      // state, then commit. The first collision short-circuits with no
      // mutation to `state.todos`.
      const seen = new Set(state.todos.map((t) => t.summary));
      for (const input of items) {
        if (seen.has(input.summary)) {
          throw new Error(`todo with summary "${input.summary}" already exists`);
        }
        seen.add(input.summary);
      }
      const created: TodoItem[] = [];
      for (const input of items) {
        const item: TodoItem = {
          status: DEFAULT_STATUS,
          summary: input.summary,
          goal: input.goal,
        };
        state.todos.push(item);
        created.push(item);
      }
      return created;
    },
    list() {
      return state.todos;
    },
    start(summary) {
      return transition(state, summary, "in_progress");
    },
    complete(summary) {
      return transition(state, summary, "completed");
    },
    reopen(summary) {
      return transition(state, summary, "pending");
    },
    clear() {
      state.todos = [];
    },
  };
}
