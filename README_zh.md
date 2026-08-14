<div align="center">

# 📝 pi-todo

**为 pi 编码代理提供一份内存态 todo 列表。**

把一份带短摘要、详细目标、状态流转的真实任务清单交到模型手里——
在当前会话内以简洁的 widget 形态呈现在编辑器正上方。摘要本身即 todo 的唯一键，模型通过摘要字符串引用 todo，不需要额外的 id。

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
而是带短摘要、详细目标、生命周期状态的真实清单，仅在当前会话内存中存活。每条 todo 的 `summary` 同时也是它的唯一键——模型在后续调用里直接以摘要字符串引用，不再依赖额外的 id。

模型可以：

- 🟢 **批量创建** todo（每条含短摘要 + 详细目标）
- ▶️ **开始** / ✅ **完成** / 🔁 **重开** 条目，随工作推进流转状态
- 🔍 **查看** 当前所有 todo（包括模型私有的目标描述）
- 🧹 **清空** 列表，在一轮工作完成后重置

而你，会在**编辑器正上方**看到一个简洁、实时的面板——
始终知道模型正在做什么、还剩什么。

---

## 👀 长这样

> 编辑器上方的 widget，把 todo 列表渲染为 markdown 圆点列表。最多展示 4 条；超出部分以 `+N more...` 收尾。状态完全通过行内样式表达——不加 checkbox：

```
* **实现内存态 store**    ← in_progress（加粗，排在最前）
* 编写 todo 工具的 handler        ← pending
* 注册 widget 并接入 session_start ← pending
* ~~设计 schema 并落 TypeBox 类型~~ ← completed（删除线 + 固定末尾）
* +2 more...
```

空状态：widget 完全隐藏——在添加第一条 todo 之前，编辑器上方不会渲染任何内容。

### 状态生命周期

| 状态           | markdown 形式                         | 含义                |
| -------------- | ------------------------------------- | ------------------- |
| `pending`      | `* summary`                           | 已规划但还未开始    |
| `in_progress`  | `* **summary**`（加粗）                | 正在处理            |
| `completed`    | `* ~~summary~~`（固定末尾）            | 已完成，视觉上弱化  |

新增 todo 默认为 `pending`。调用 `start` 推进到 `in_progress`，调用 `complete` 标记完成，调用 `reopen` 把已完成的 todo 退回 `pending`。整轮工作完成时调用 `clean` 清空列表。

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
> （编辑器上方的 widget 实时反映状态——）
>
> ```
> * **运行 npm run check**
> * ~~重写 README~~
> * ~~补充单元测试~~
> ```
>
> （调用 `clean` 后 widget 隐藏——这一轮就结束了。）

---

## 📁 项目结构

```
src/
├── types.ts    # TodoItem / TodoState / 常量
├── schema.ts   # TypeBox 工具参数 schema
├── store.ts    # 内存态 store + 状态机
├── tool.ts     # todo 工具：handler + renderCall + renderResult
└── widget.ts   # TodoWidget：TUI 组件
index.ts        # 扩展入口（位于项目根目录）：注册 widget + 工具
```

---

## 🧑‍💻 开发

```bash
# 安装依赖
npm install

# 类型检查 + ESLint
npm run check

# 仅 lint
npm run lint
```

提交前请确保 `npm run check` 全绿。

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