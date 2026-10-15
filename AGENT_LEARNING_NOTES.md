# 🧠 TypeScript 原生 AI Agent 开发实战笔记

> **项目名称**：Mini-Agent (从零到一原生手写版)  
> **核心定位**：专为前端工程师打造的 AI Agent 底层原理与工程实践指南  
> **技术栈**：Node.js 24 + TypeScript + Zod + OpenAI SDK (兼容 Google Gemini & DeepSeek)

---

## 🎯 一、项目的目标与核心价值

### 1. 为什么我们要“脱离重型框架，纯手写底层”？
在 Agent 开发领域，很多人一上来就使用 LangChain 等重型框架，导致遇到以下痛点：
- **黑盒效应**：不知道大模型究竟是何时调用的工具、如何解析的参数；
- **排错极其困难**：框架内部嵌套数十层抽象，报错时调用栈深不见底；
- **类型丢失**：很多库对 TypeScript 支持不够极致，充斥着 `any`。

**本 Demo 的核心价值**在于：
1. **剥除魔法**：用不到 200 行核心代码，揭示整个行业 Agent（如 Claude Code、Cursor、AutoGPT）最底层的运行逻辑。
2. **端到端类型安全**：将前端最熟悉的 `Zod` 与 TypeScript 泛型推导融会贯通，实现从“参数定义”到“代码补全”再到“运行时校验”的 Single Source of Truth（单一事实源）。
3. **建立 ReAct 心智模型**：亲手实现“思考 (Reason) $\rightarrow$ 行动 (Act) $\rightarrow$ 观察 (Observe)”的状态机循环。

---

## 💎 二、核心收获与技术沉淀（Takeaways）

通过本项目的动手搭建，你已经掌握了以下核心工程能力：

### 1. 搞懂了大模型与本地函数的交互本质
- **大模型不是神仙**：它本质是一个文本推理器，根本看不到、也调用不到你电脑里的 TypeScript 函数。
- **中间桥梁是 JSON Schema**：大模型读懂 JSON Schema 规格后，生成符合格式的 JSON 字符串意图；我们在本地执行函数后，将结果包装为 `{ role: "tool", content: ... }` 再塞回历史，形成上下文闭环。

### 2. 运行时与静态类型的双重防线
- **TypeScript 静态编译擦除**：TS 的 `interface` 在运行时完全不存在，无法防御大模型随意传参导致的程序崩溃。
- **Zod 的双重角色**：
  - 角色 1：在运行时充当“安检门”（`.parse(rawArgs)`），拦截不合规参数并优雅提示模型纠错。
  - 角色 2：通过 `z.infer<T>` 自动生成 TS 类型，保证开发体验零冗余。

### 3. 人机协同（Human-in-the-Loop, HITL）工程规范
- 工具分类管理：区分**安全只读工具**（如计算、读文件）与**敏感破坏工具**（如写文件、执行命令）。
- 拦截机制：在 Agent 调度主循环中植入审批钩子，敏感操作暂停执行并向用户索取权限，这是工业级企业 Agent 的必备安全规范。

---

## 🗺️ 三、前端转 Agent 开发者：必须吃透的知识清单

以下是你需要深入理解和逐步掌握的知识体系，分为 4 个层次：

### 维度 1：TypeScript 进阶技巧与类型体操
- [x] **Zod 运行时校验**：熟练掌握 `z.object`、`z.string().describe()`、`z.enum()`、`.optional()`、`.default()`。
- [x] **泛型约束与提取**：理解 `<T extends z.ZodTypeAny>` 以及 `z.infer<T>` 是如何自动推导函数的形参类型的。
- [ ] **条件类型与类型收窄（Type Narrowing）**：在处理大模型返回的不同 message 联合类型时（如 `assistant` 是否含 `tool_calls`），利用 `type guard`（如 `if (toolCall.type === 'function')`）安全收窄类型。

### 维度 2：大模型底层协议与提示词工程（Prompt Engineering）
- [x] **OpenAI 兼容协议规范**：理解各大厂商（Gemini, DeepSeek, Moonshot）如何统一通过 `baseURL` 和标准请求体复用生态。
- [x] **四种角色分工（Role）**：
  - `system`：立人设与规则规范。
  - `user`：接收人类意图。
  - `assistant`：大模型回复（包含 `content` 思考与 `tool_calls` 意图）。
  - `tool`：回传本地函数的执行结果（必须与 `tool_call_id` 一一对应）。
- [x] **工具描述 Prompting**：工具的 `description` 和参数的 `.describe()` 并不是写给给人看的注释，而是**给大模型看的提示词（Prompt）**，描述越清晰精准，大模型调用越准确。
- [ ] **参数调优**：
  - `temperature`：Agent 任务建议设为 `0` 或 `0.2`，抑制大模型的随机发散，提高工具调用的精准度。
  - `max_tokens` 与 Context Window 限制计算。

### 维度 3：Agent 核心架构设计模式
- [x] **ReAct 循环模式**：`while` 循环状态机，何时继续（有 tool_calls）、何时终止（无 tool_calls）。
- [x] **安全熔断机制（Circuit Breaker）**：设置 `maxSteps`，防止大模型陷入死循环导致账单爆炸。
- [x] **自愈与自我纠错（Self-Correction）**：工具报错时 `return` 错误信息而非 `throw`，利用大模型自然语言理解能力让其根据报错修正参数重试。
- [ ] **短期记忆压缩（Memory Management）**：
  - 当对话轮数过长时，如何使用滑动窗口（Sliding Window）或让模型生成摘要（Summary Buffer）以防止超过 Token 上限。
- [ ] **流式输出（Streaming）与事件驱动**：
  - 将 `console.log` 升级为 `EventEmitter`，在 Web 界面逐字呈现“思考中”、“调用工具中”、“最终回答”。

### 维度 4：前端优势延伸与全栈演进
- [ ] **Generative UI（动态生成式组件）**：
  - 前端不仅展示文本，还可以根据工具执行结果直接渲染 React / Vue 组件（例如机票卡片、代码 Diff 查看器）。
- [ ] **Vercel AI SDK 进阶**：
  - 在理解了原生原理后，学习使用 `@ai-sdk/openai` 与 React 的 `useChat` 快速构建全栈 Web 界面。
- [ ] **MCP (Model Context Protocol)**：
  - 学习 Anthropic 推出的统一协议，把我们手写的 Tools 改造为标准 MCP Server，一键接入 Cursor、Claude Desktop 等生态工具。

---

## 📂 四、项目架构全景代码速查

```text
learn_agent/
├── .env                  # 配置 OPENAI_API_KEY 与 MODEL_NAME
├── AGENT_LEARNING_NOTES.md # 本学习笔记
├── package.json          # ES Module 规范与依赖
├── tsconfig.json         # NodeNext 严格类型配置
└── src/
    ├── types/
    │   └── tool.ts       # Tool<T> 开发者契约 与 RegisteredTool 运行时规范
    ├── core/
    │   ├── llm.ts        # OpenAI 统一协议通信客户端
    │   ├── tool.ts       # defineTool 工厂函数 (Zod -> JSON Schema 转换与执行包装)
    │   └── agent.ts      # Agent 状态机调度引擎 (ReAct 循环、熔断与审批)
    ├── tools/
    │   ├── calculator.ts # 具备防注入校验的数学计算器
    │   └── file.ts       # 本地文件安全读取与敏感写入 (HITL)
    └── index.ts          # 终端交互 REPL 与控制台可视化
```

---

## 🏆 结语

你已经完成了从“普通前端开发者”向“全栈 AI Agent 工程师”迈出的最坚实一步！  
所有看似复杂的上层 AI 框架，本质上都是建立在你今天亲手写出的这套 **“类型验证 + JSON Schema + 状态循环 + 上下文追加”** 的基石之上。带着这份透彻的理解，你已经具备了构建更复杂自主智能体的全部底层底气！
