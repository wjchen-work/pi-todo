<div align="center">

# 📝 pi-todo

**为 pi 编码代理提供一份持久化、分支感知的 todo 列表。**

把一份带 ID、短摘要、详细目标的真实任务清单交到模型手里——
跨分支稳定保留，并以简洁的 widget 形态呈现在编辑器正上方。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![pi](https://img.shields.io/badge/pi-extension-7c3aed)](https://github.com/earendil-works/pi-coding-agent)
[![typescript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![repo](https://img.shields.io/badge/repo-pi--todo-181717?logo=github)](https://github.com/wjchen-work/pi-todo)

[English](./README.md) · [简体中文](./README_zh.md)

</div>

---

## ✨ 它是什么

`pi-todo` 是 [pi 编码代理](https://github.com/earendil-works/pi-coding-agent) 的扩展。
它把一份**结构化的 todo 列表**交到模型手里——不是埋在聊天里的一行行自由文本，
而是带 ID、短摘要、详细目标的真实清单，能跨分支、分叉重建。

模型可以：

- 🟢 **添加** 一条新的 todo（短摘要 + 详细目标）
- 🔴 **删除** 已完成的 todo（按 ID）
- 🔍 **查看** 当前所有 todo（包括模型私有的目标描述）

而你，会在**编辑器正上方**看到一个简洁、实时的面板——
始终知道模型正在做什么、还剩什么。

---

## 👀 长这样

> 编辑器上方的 widget，最多展示 4 条；超出部分以 `+N more...` 收尾。每条 todo 会按生命周期状态着色：

```
  #1 实现 store 与分支回放逻辑      ← in_progress（最亮，纯文本）
  #2 编写 todo 工具的 handler      ← pending（较灰）
  #3 注册 widget 并接入 session_start ← pending（较灰）
  ~~#4 设计 schema 并落 TypeBox 类型~~ ← completed（最灰 + 删除线，固定在末尾）
  +2 more...
```

空状态：widget 完全隐藏——在添加第一条 todo 之前，编辑器上方不会渲染任何内容。

### 状态生命周期

| 状态           | widget 样式                        | 含义                      |
| -------------- | ---------------------------------- | ------------------------- |
| `pending`      | 较灰文本                            | 已规划但还未开始          |
| `in_progress`  | 最亮（默认 `text` 色）             | 正在处理                  |
| `completed`    | 最灰 + 删除线，固定排到末尾         | 已完成，视觉上弱化        |

新增 todo 默认为 `pending`。调用 `start` 推进到 `in_progress`，调用 `complete` 标记完成，调用 `reopen` 把已完成的 todo 退回 `pending`。

---

## 📦 安装

`pi-todo` 是一个 [pi package](https://github.com/earendil-works/pi-coding-agent#pi-packages)，
直接从 git 仓库安装即可：

```bash
pi install git:https://github.com/wjchen-work/pi-todo.git
```

安装后用 `pi config` 启用扩展，或在项目的 `.pi/settings.json` 中显式启用。

---

## 🚀 使用方法

安装并启用后，**你不需要手动调用任何命令**——
模型在处理多步任务时会主动使用 `todo` 工具。正常和 pi 对话即可。

### 自然语言触发示例

> **你**：帮我把这个仓库的 README 重写一下，再加几个单元测试。
>
> **pi（内部）**：先在 `todo` 里把任务列出来。
>
> ```
> todo add summary="重写 README" goal="保持原有结构，新增安装/使用/API 三个章节，配 ASCII mockup"
> todo add summary="补充单元测试" goal="覆盖 store.add / delete / reset / readState 四个分支"
> todo add summary="运行 pnpm check" goal="tsc --noEmit && eslint . 必须通过"
> ```
>
> （编辑器上方的 widget 立刻更新——）
>
> ```
>   #1 重写 README
>   #2 补充单元测试
>   #3 运行 pnpm check
> ```
>
> **pi**：好的，按这三步推进。先重写 README……

> **你**：`/tree` —— 切回上一个分支看看。
>
> （widget 立刻回滚到那个分支对应的快照；其他分支上加的 todo 不会跟过来。）

---

## 🛠 `todo` 工具 API

模型侧接口（TypeBox schema 自动渲染给 LLM）：

| 字段      | 类型                              | 必填时机 | 说明                                        |
| --------- | --------------------------------- | -------- | ------------------------------------------- |
| `action`  | `"add"` \| `"delete"` \| `"list"` \| `"start"` \| `"complete"` \| `"reopen"` | 始终     | 操作类型                                    |
| `summary` | `string`                          | `add`    | 短摘要，**会显示在 widget 上**              |
| `goal`    | `string`                          | `add`    | 详细目标，**仅模型可见**，用于决策          |
| `id`      | `number`                          | `delete`, `start`, `complete`, `reopen` | 要操作的 todo ID               |

### 示例

```jsonc
// 1) 添加一条（默认状态为 `pending`）
{ "action": "add", "summary": "实现 store", "goal": "支持 add/delete/reset 与分支回放" }

// 2) 开始处理（pending -> in_progress）
{ "action": "start", "id": 1 }

// 3) 标记完成（in_progress -> completed，自动排到 widget 末尾）
{ "action": "complete", "id": 1 }

// 4) 列出所有（含仅模型可见的 `goal` 和当前状态）
{ "action": "list" }

// 5) 重新打开已完成项（completed -> pending）
{ "action": "reopen", "id": 1 }

// 6) 完全删除
{ "action": "delete", "id": 1 }
```

返回：

```
Added todo #1: 实现 store
```

完整状态快照同时写入 tool result 的 `details`——这是分支感知持久化的关键。

### 状态转换

store 内置一个最小状态机，防止模型误用：

| 当前状态       | 允许的下一状态                              | 调用动作               |
| -------------- | ------------------------------------------- | ---------------------- |
| `pending`      | `pending`（no-op）、`in_progress`、`completed` | `start`、`complete`    |
| `in_progress`  | `in_progress`（no-op）、`completed`           | `complete`             |
| `completed`    | `completed`（no-op）、`pending`               | `reopen`               |

非法转换会向模型抛出一个明确的错误（例如：试图 `start` 一个已 `completed` 的 todo 会被拒绝——要继续处理请先 `reopen`）。

---

## 🧠 设计要点

| 特性              | 实现                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| **每条 todo 双轨** | `summary`（短，用户可见）+ `goal`（长，模型私有），避免冗长污染 widget        |
| **生命周期状态**    | `pending` / `in_progress` / `completed`，由状态机约束；widget 以颜色 + 删除线呈现 |
| **widget 节流**    | 最多渲染 4 条，超过则 `+N more...`，避免长列表喧宾夺主                         |
| **按状态排序**      | 渲染时按状态排序（`in_progress` → `pending` → `completed`）；插入顺序作为次要顺序保留 |
| **分支感知**       | 状态序列化进 `toolResult.details`；`session_tree` 重放当前分支                |
| **老数据兼容**      | 旧快照中缺少 `status` 字段时，重放时补齐为 `pending`，无需迁移              |
| **零副作用读**     | `render()` 每次拉取最新 state，无需缓存失效处理                                |
| **类型严格**       | TypeBox schema + strict TS，提交前 `pnpm check` 全绿                          |

---

## 📁 项目结构

```
src/
├── index.ts    # 扩展入口：注册 widget + 工具 + session 钩子
├── types.ts    # TodoItem / TodoState / TodoDetails / 常量
├── schema.ts   # TypeBox 工具参数 schema
├── store.ts    # 纯函数快照 + 可变 store + 分支回放
├── tool.ts     # todo 工具：handler + renderCall + renderResult
└── widget.ts   # TodoWidget：TUI 组件
```

---

## 🧑‍💻 开发

```bash
# 安装依赖
pnpm install

# 类型检查 + ESLint
pnpm check

# 仅 lint
pnpm lint
```

提交前请确保 `pnpm check` 全绿。

### 模块边界

- `store.ts` 与 `widget.ts` 不依赖 pi API，便于单独测试。
- `tool.ts` 是唯一把 `TodoStore` 暴露给 `ExtensionAPI` 的地方。
- `index.ts` 只做组合：建 store → 注册 widget → 注册 tool。

---

## 📄 许可证

[MIT](./LICENSE) © [wjchen](https://github.com/wjchen-work)

---

## 🙏 致谢

- [pi coding agent](https://github.com/earendil-works/pi-coding-agent) —— 优雅到让人想写扩展的最小编码代理。
- [@earendil-works/pi-tui](https://github.com/earendil-works/pi-tui) —— 拿来画 widget 的 TUI 库。
- [TypeBox](https://github.com/sinclairzx81/typebox) —— 让 schema 与 TS 类型同源。

<div align="center">

**如果这个项目对你有帮助，欢迎 ⭐ 一下！**

</div>