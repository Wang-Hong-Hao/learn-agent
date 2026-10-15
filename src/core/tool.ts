import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import type { Tool, RegisteredTool } from "../types/tool.js";

/**
 * 工厂函数：定义一个工具，并将其包装为标准化运行时的 RegisteredTool
 *
 * 这里的泛型 <T extends z.ZodTypeAny> 会精准捕获你传入的 Zod 规则类型
 */
export function defineTool<T extends z.ZodTypeAny>(toolConfig: Tool<T>): RegisteredTool {
  // 1. 将 Zod Schema 转换为 JSON Schema
  const jsonSchema = zodToJsonSchema(toolConfig.parameters, {
    target: "openAi",
  }) as Record<string, unknown>;

  // 清除 JSON Schema 根部无用的 $schema 声明，，确保符合 OpenAI 协议规范 避免某些大模型解析报 warning
  delete jsonSchema["$schema"];

  return {
    definition: {
      type: 'function',
      function: {
        name: toolConfig.name,
        description: toolConfig.description,
        parameters: jsonSchema
      }
    },
    // 透传危险标记
    dangerous: toolConfig.dangerous ?? false,
    // 抹平参数差异的通用执行器
    execute: async (argsJson: string): Promise<string> => {
      try {
        // 步骤 A: 解析 JSON 字符串
        const rawArgs = argsJson ? JSON.parse(argsJson) : {}

        // 步骤 B: 运行时 Zod 安检门校验！
        // 如果数据不对，Zod 会在此处抛出异常
        const validatedArgs = toolConfig.parameters.parse(rawArgs)

        // 步骤 C: 执行你手写的真正函数
        const result = await toolConfig.execute(validatedArgs);

        // 步骤 D: 确保返回的一定是字符串
        return typeof result === "string" ? result : JSON.stringify(result);
      } catch (err: any) {
        // 步骤 E: 错误捕获（触发大模型的自我反思能力）
        // 不抛出异常打崩进程，而是把错误原因告诉大模型，让它知道自己哪步做错了
        return `工具执行失败: ${err.message || String(err)}`;
      }
    }
  }
}
