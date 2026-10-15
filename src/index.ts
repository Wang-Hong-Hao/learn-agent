import dotenv from "dotenv";
import pc from "picocolors";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

dotenv.config();

console.log(pc.green("✔ Agent 项目环境就绪！"));
console.log(pc.cyan("当前模型配置："), process.env.MODEL_NAME || "未配置 (请配置 .env)");

import { Agent } from './core/agent.js'
import { calculatorTool } from "./tools/calculator.js";
import { readFileTool, writeFileTool } from "./tools/file.js";

async function main() {
  // 1. 创建终端交互输入流
  const rl = readline.createInterface({ input, output });
  console.log(pc.bold(pc.cyan("\n==========================================")));
  console.log(pc.bold(pc.green("   🤖 Mini-Agent (TypeScript 原生手写版) ")));
  console.log(pc.bold(pc.cyan("==========================================")));
  console.log(pc.dim("已挂载工具: calculator, read_file, write_file (含敏感拦截)"));
  console.log(pc.dim("输入 'exit' 退出程序\n"));

  // 2. 实例化 Agent，装配工具与审批钩子
  const agent = new Agent({
    tools: [calculatorTool, readFileTool, writeFileTool],
    maxSteps: 5,
    // 核心：敏感操作人工审批 (Human-in-the-loop)
    onApproveTool: async (toolName, argsJson) => {
      console.log(pc.bgYellow(pc.black(`\n ⚠️  敏感操作警告: 大模型试图调用 [${toolName}] `)));
      console.log(pc.yellow(`调用参数:`), pc.dim(argsJson));
      // 挂起流程，等待用户在终端确认
      const answer = await rl.question(pc.bold("\n是否批准执行该操作？(输入 y 确认，其他键拒绝): "));
      return answer.trim().toLowerCase() === "y";
    }
  })

  // 3. 开启终端对话循环 (REPL)
  while (true) {
    const question = await rl.question(pc.magenta("\n你: "));
    if (!question.trim()) continue

    if (question.trim().toLocaleLowerCase() === 'exit') {
      console.log(pc.dim("程序已退出，再见！"));
      rl.close();
      break;
    }

    try {
      // 启动 Agent 循环
      const answer = await agent.run(question)
      console.log(pc.bold(pc.green("\n💡 Agent 最终回答:\n")), answer);
    } catch (err: any) {
      console.error(pc.red("\n❌ 发生错误:"), err.message);
    }
  }
}

main()
