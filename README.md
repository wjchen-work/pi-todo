<div align="center">

# 📝 pi-todo

**A persistent, branch-aware todo list for the pi coding agent.**

Give your model a real task list — with IDs, summaries, and detailed goals —
that stays in sync across branches and shows up as a tidy widget above the editor.

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![pi](https://img.shields.io/badge/pi-extension-7c3aed)](https://github.com/earendil-works/pi-coding-agent)
[![typescript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![repo](https://img.shields.io/badge/repo-pi--todo-181717?logo=github)](https://github.com/wjchen-work/pi-todo)

[English](./README.md) · [简体中文](./README_zh.md)

</div>

---

## ✨ What it is

`pi-todo` is an extension for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent).
It hands your model a **structured todo list** — not a wall of free-form text in the chat,
but a real list with IDs, short summaries, and longer goals that survives branching and forking.

Your model can:

- 🟢 **Add** a new todo (short summary + detailed goal)
- 🔴 **Delete** a completed todo (by ID)
- 🔍 **List** every todo, including the private goal text

And you'll see a slim, live panel **above the editor** — always knowing what the model is doing
and what's left.

---

## 👀 What it looks like

> The widget above the editor renders the todo list as a markdown bullet list. Up to 4 items show; the rest collapse into a `+N more...` hint. Status is expressed purely through inline markdown styling — no checkboxes:

```
* **Implement the store with branch replay**   ← in_progress (bold, sorted first)
* Wire up the todo tool handlers               ← pending
* Register the widget on session_start         ← pending
* ~~Design the schema with TypeBox types~~     ← completed (strikethrough, sorted last)
* +2 more...
```

Empty state: the widget is hidden — nothing renders above the editor until you add a todo.

### Status lifecycle

| Status        | Markdown form                          | Meaning                                  |
| ------------- | -------------------------------------- | ---------------------------------------- |
| `pending`     | `* summary`                            | Planned but not started yet              |
| `in_progress` | `* **summary**` (bold)                 | Currently being worked on                |
| `completed`   | `* ~~summary~~` (sorted last)          | Done; visually de-emphasized             |

New items start as `pending`. Use `start` to flip one to `in_progress`, `complete` to mark it done, and `reopen` to bring a completed item back to `pending`. When a full round of work is done, call `clean` to empty the list and reset id numbering.

---

## 📦 Installation

`pi-todo` is a [pi package](https://github.com/earendil-works/pi-coding-agent#pi-packages) and
installs straight from its git repository:

```bash
pi install git:https://github.com/wjchen-work/pi-todo.git
```

After install, enable it with `pi config` or explicitly in your project's `.pi/settings.json`.

---

## 🚀 Usage

Once installed, **you don't call any commands** — your model will use the `todo` tool when
multi-step work is on the table. Just talk to pi normally.

### Natural-language trigger

> **You**: Rewrite the README for this repo and add a few unit tests.
>
> **pi (internally)**: Let me lay out the work in `todo` first.
>
> ```
> todo create items=[{"summary":"Rewrite README","goal":"Keep the original structure, add install / usage / API sections, include an ASCII mockup"},{"summary":"Add unit tests","goal":"Cover store.create / reset / readState branches"},{"summary":"Run npm run check","goal":"tsc --noEmit && eslint . must pass"}]
> todo start id=1
> ... (work on README) ...
> todo complete id=1
> todo start id=2
> ... (work on tests) ...
> todo complete id=2
> todo start id=3
> ... (run npm run check) ...
> todo complete id=3
> todo clean
> ```
>
> (The widget above the editor updates immediately —)
>
> ```
> * **Run npm run check**
> * ~~Rewrite README~~
> * ~~Add unit tests~~
> ```
>
> (After `clean`, the widget disappears — the round is done.)

> **You**: `/tree` — jump back to the other branch.
>
> (The widget snaps back to that branch's snapshot. Todos added on other branches don't follow you.)

---

## � `todo` tool API

What the model sees (the TypeBox schema is rendered to the LLM automatically):

| Field      | Type                                                            | Required for                                  | Notes                                                |
| ---------- | --------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `action`   | `"create"` \| `"list"` \| `"start"` \| `"complete"` \| `"reopen"` \| `"clean"` | always                                        | The operation                                        |
| `items`    | `Array<{ summary: string; goal: string }>`                      | `create`                                      | Batch of todos — the whole array is committed atomically; each item has a short `summary` (shown in the widget) and a longer `goal` (private to the model) |
| `id`       | `number`                                                        | `start`, `complete`, `reopen`                  | ID of the todo to operate on                         |

### Examples

```jsonc
// 1) At the start of a round, batch-create the full plan in ONE call
{
  "action": "create",
  "items": [
    { "summary": "Implement store", "goal": "Support create/reset and branch replay" },
    { "summary": "Wire up the todo tool", "goal": "Add handlers, renderCall, renderResult" },
    { "summary": "Register the widget", "goal": "Sync on session_start, hide when empty" }
  ]
}

// 2) As you progress, flip status one step at a time
{ "action": "start", "id": 1 }      // pending -> in_progress
{ "action": "complete", "id": 1 }   // in_progress -> completed

// 3) Peek at the full picture any time
{ "action": "list" }

// 4) Reopen a step if you need to revisit it (completed -> pending).
//    There is no per-item delete — reopen it back to pending and let clean
//    drop the whole list at round end.
{ "action": "reopen", "id": 1 }

// 5) At the end of the round, once everything is done — clean slate for the next round
{ "action": "clean" }
```

Tool result:

```
Created 3 todos: #1, #2, #3
```

The full state snapshot is also written into the tool result's `details` — that's the secret
sauce that makes branch-aware persistence work.

### Round-based workflow

The widget above the editor is meant to track **one round of work** at a time:

1. When the user makes a new request, **batch-create the full plan in a single `create` call**
   — pass the entire `items: [...]` array up front. Don't spread plan creation across multiple
   calls and don't start any work before the plan is committed.
2. As you work, call `start` on the next item, do the work, then `complete` it. The widget
   reflects current status in real time.
3. If a step is no longer relevant, call `reopen` to send it back to `pending`; individual
   items cannot be deleted.
4. When the user's request is **fully** implemented, call `clean` once to empty the list and
   reset id numbering. Do **not** call `clean` mid-round — only after every todo for the
   current request is `completed`.

### Status transitions

The store enforces a small state machine so the model can't get into weird states:

| From          | Allowed next                                            | Action to use |
| ------------- | ------------------------------------------------------- | ------------- |
| `pending`     | `pending` (no-op), `in_progress`, `completed`            | `start`, `complete` |
| `in_progress` | `in_progress` (no-op), `completed`                       | `complete`    |
| `completed`   | `completed` (no-op), `pending`                           | `reopen`      |

Invalid transitions throw a clear error back to the LLM (e.g. `start` on an already-`completed`
todo is rejected — `reopen` first if you really mean to resume it).

---

## 🧠 Design notes

| Feature                  | Implementation                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| **Dual-track todos**     | `summary` (short, user-visible) + `goal` (long, model-private) — keeps the widget tidy     |
| **Lifecycle status**     | `pending` / `in_progress` / `completed` with strict transitions                            |
| **Markdown rendering**   | The widget delegates to pi's `Markdown` component — status is expressed via task checkboxes, bold, and strikethrough; no manual ANSI colors in widget code |
| **Round-based workflow** | One round = batch `create` at the start, step-by-step `start`/`complete`, then `clean` once the round is fully done; no per-item delete |
| **Widget throttling**    | Renders at most 4 items; the rest collapse into a `+N more...` hint                        |
| **Sort-by-status**       | Items are sorted by status at render time (`in_progress` first, `pending` next, `completed` last); insertion order is preserved as a secondary key |
| **Branch awareness**     | State is serialized into `toolResult.details`; `session_tree` replays the current branch   |
| **Legacy compat**        | Old snapshots without `status` are normalized to `pending` on replay — no migration needed  |
| **Zero-side-effect read**| `render()` always pulls the freshest state — no invalidation bookkeeping                    |
| **Strict types**         | TypeBox schema + strict TS; `npm run check` stays green before every commit                  |

---

## 📁 Project layout

```
src/
├── index.ts    # Extension entry: register widget + tool + session hooks
├── types.ts    # TodoItem / TodoState / TodoDetails / constants
├── schema.ts   # TypeBox parameter schema for the todo tool
├── store.ts    # Pure snapshot helpers + mutable store + branch replay
├── tool.ts     # todo tool: handlers + renderCall + renderResult
└── widget.ts   # TodoWidget: TUI component
```

---

## 🧑‍💻 Development

```bash
# Install dependencies
npm install

# Type-check + ESLint
npm run check

# Lint only
npm run lint
```

`npm run check` must pass before committing.

### Module boundaries

- `store.ts` and `widget.ts` don't depend on the pi API — easy to unit-test in isolation.
- `tool.ts` is the only place that hands a `TodoStore` to the `ExtensionAPI`.
- `index.ts` is just composition: build store → register widget → register tool.

---

## 📄 License

[MIT](./LICENSE) © [wjchen](https://github.com/wjchen-work)

---

## 🙏 Acknowledgements

- [pi coding agent](https://github.com/earendil-works/pi-coding-agent) — the minimal coding harness that made me want to write an extension.
- [@earendil-works/pi-tui](https://github.com/earendil-works/pi-tui) — the TUI library the widget is built on.
- [TypeBox](https://github.com/sinclairzx81/typebox) — schema and TS types from a single source of truth.

<div align="center">

**If this helped you, a ⭐ goes a long way!**

</div>