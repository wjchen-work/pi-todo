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

> The widget above the editor renders up to 4 items, then falls back to a `+N more...` hint:

```
  #1 Design the schema with TypeBox types
  #2 Implement the store with branch replay
  #3 Wire up the todo tool handlers
  #4 Register the widget on session_start
  +2 more...
```

Empty state: the widget is hidden — nothing renders above the editor until you add a todo.

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
> todo add summary="Rewrite README" goal="Keep the original structure, add install / usage / API sections, include an ASCII mockup"
> todo add summary="Add unit tests" goal="Cover store.add / delete / reset / readState branches"
> todo add summary="Run pnpm check" goal="tsc --noEmit && eslint . must pass"
> ```
>
> (The widget above the editor updates immediately —)
>
> ```
>   #1 Rewrite README
>   #2 Add unit tests
>   #3 Run pnpm check
> ```
>
> **pi**: Got it. I'll work through these three. First up: the README rewrite…

> **You**: `/tree` — jump back to the other branch.
>
> (The widget snaps back to that branch's snapshot. Todos added on other branches don't follow you.)

---

## 🛠 `todo` tool API

What the model sees (the TypeBox schema is rendered to the LLM automatically):

| Field      | Type                              | Required for | Notes                                                |
| ---------- | --------------------------------- | ------------ | ---------------------------------------------------- |
| `action`   | `"add"` \| `"delete"` \| `"list"` | always       | The operation                                        |
| `summary`  | `string`                          | `add`        | Short label — **shown in the widget**                |
| `goal`     | `string`                          | `add`        | Detailed goal — **private to the model**, for planning |
| `id`       | `number`                          | `delete`     | ID of the todo to remove                             |

### Examples

```jsonc
// 1) Add an item
{ "action": "add", "summary": "Implement store", "goal": "Support add/delete/reset and branch replay" }

// 2) List everything
{ "action": "list" }

// 3) Delete a finished item
{ "action": "delete", "id": 1 }
```

Tool result:

```
Added todo #1: Implement store
```

The full state snapshot is also written into the tool result's `details` — that's the secret
sauce that makes branch-aware persistence work.

---

## 🧠 Design notes

| Feature                  | Implementation                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| **Dual-track todos**     | `summary` (short, user-visible) + `goal` (long, model-private) — keeps the widget tidy     |
| **Widget throttling**    | Renders at most 4 items; the rest collapse into `+N more...` to stay out of your way        |
| **Branch awareness**     | State is serialized into `toolResult.details`; `session_tree` replays the current branch   |
| **Zero-side-effect read**| `render()` always pulls the freshest state — no invalidation bookkeeping                    |
| **Strict types**         | TypeBox schema + strict TS; `pnpm check` stays green before every commit                  |

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
pnpm install

# Type-check + ESLint
pnpm check

# Lint only
pnpm lint
```

`pnpm check` must pass before committing.

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