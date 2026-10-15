import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { llmClient, DEFAULT_MODEL } from "./llm.js";
import type { RegisteredTool } from "../types/tool.js";
import pc from "picocolors";


/**
 * 构造 Agent 时的配置项
 */
export interface AgentOptions {
  /** 使用的模型名称，默认读取 DEFAULT_MODEL */
  model?: string;
  /** 系统预设提示词 (System Prompt) */
  systemPrompt?: string;
  /** Agent 拥有的工具库 */
  tools?: RegisteredTool[];
  /** 最大思考循环步数，防止死循环 (默认 10 步) */
  maxSteps?: number;
  /**
    * 人机协同审批钩子 (Human-in-the-loop)
    * 遇到标记为 dangerous: true 的工具时触发
    */
  onApproveTool?: (toolName: string, argsJson: string) => Promise<boolean>
}

export class Agent {
  // 对话历史上下文列表（Agent 的短期记忆）
  private messages: ChatCompletionMessageParam[] = []

  // 工具名称到具体实现对象的 Map 字典，方便 O(1) 快速查找
  private toolsMap = new Map<string, RegisteredTool>()

  private maxSteps: number
  private model: string
  private onApproveTool?: (toolName: string, argsJson: string) => Promise<boolean>;

  constructor(options: AgentOptions = {}) {
    this.model = options.model || DEFAULT_MODEL
    this.maxSteps = options.maxSteps || 10
    this.onApproveTool = options.onApproveTool

    // 1. 初始化 System Prompt
    const systemContent = options.systemPrompt || "你是一个高效、严谨的自主 AI 助手。你可以自主调用外部工具获取事实和完成任务。"
    this.messages.push({ role: 'system', content: systemContent })

    // 2. 将传入的工具建立索引
    if (options.tools) {
      for (const t of options.tools) {
        this.toolsMap.set(t.definition.function.name, t)
      }
    }
  }
  /**
   * 启动一次任务对话，驱动 ReAct 循环
   */
  async run(userInput: string): Promise<string> {
    // 将用户输入加入记忆
    this.messages.push({ role: 'user', content: userInput })

    // 提取给大模型看的工具定义列表
    const toolsPayload = Array.from(this.toolsMap.values()).map(t => t.definition)

    let currentStep = 0;

    // 核心 ReAct 状态循环！
    while (currentStep < this.maxSteps) {
      currentStep++
      console.log(pc.dim(`\n[第 ${currentStep} 步] Agent 正在思考并向模型发起请求...`));

      // 步骤 1: 请求大模型
      const response = await llmClient.chat.completions.create({
        model: this.model,
        messages: this.messages,
        // 如果有工具就传入，没有就传 undefined
        tools: toolsPayload.length > 0 ? toolsPayload : undefined,
        temperature: 0.2, // 低温度减少随机胡说，提高工具调用的准确率
      })

      const choice = response.choices[0]
      const assistantMessage = choice.message

      // 步骤 2: 将模型的本次回复追加到历史上下文中
      this.messages.push(assistantMessage)


      // 如果模型输出了思考/过渡文本，在终端展示给用户看
      if (assistantMessage.content) {
        console.log(pc.cyan(`Agent 思考: `), assistantMessage.content);
      }

      // 步骤 3: 检查大模型是否产生了工具调用意图 (tool_calls)
      const toolCalls = assistantMessage.tool_calls
      if (!toolCalls || toolCalls.length === 0) {
        return assistantMessage.content || "(无文本回复)";
      }

      // 步骤 4: 存在工具调用，遍历执行每一个工具
      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue

        const { name, arguments: argsJson } = toolCall.function
        console.log(pc.yellow(`⚡ 模型决定调用工具: [${name}]`), pc.dim(`参数: ${argsJson}`));

        const targetTool = this.toolsMap.get(name)

        let toolOutput = ''

        if (!targetTool) {
          toolOutput = `错误：找不到名为 [${name}] 的工具！`;
        } else {
          // 4.1 敏感操作拦截 (Human-in-the-loop)
          let approved = true
          if (targetTool.dangerous && this.onApproveTool) {
            approved = await this.onApproveTool(name, argsJson)
          }

          if (!approved) {
            // 用户在终端按了拒绝
            toolOutput = "用户在终端拒绝了执行该操作。请根据用户拒绝的情况调整后续方案。";
            console.log(pc.red(`❌ 用户拒绝执行工具 [${name}]`));
          } else {
            // 4.2 真正执行工具
            toolOutput = await targetTool.execute(argsJson)
            const preview = toolOutput.length > 200 ? toolOutput.slice(0, 200) + "..." : toolOutput;
            console.log(pc.green(`✔ 工具执行结果:`), pc.dim(preview));
          }
        }

        // 4.3 核心纽带：把工具的执行结果以 role: "tool" 存入记忆中
        this.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolOutput
        })
      }
      // 执行完本轮所有工具后，自动重新进入 while 循环，
      // 模型会结合刚出炉的 tool 结果，继续下一步推理！
    }
    // 如果达到了最大循环步数还没结束，主动熔断抛错
    throw new Error(`Agent 达到最大步数限制 (${this.maxSteps})，已强制终止，防止死循环。`);
  }
}
