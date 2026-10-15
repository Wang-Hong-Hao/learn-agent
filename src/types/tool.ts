import type { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
/**
 * 开发者定义工具时的规范接口
 *
 * 这里的 <T extends z.ZodTypeAny> 是 TypeScript 泛型约束：
 * 它代表“T 可以是任何合法的 Zod 模式对象”（比如 z.object(...)）
 */
export interface Tool<T extends z.ZodTypeAny = z.ZodTypeAny> {
  /** 工具的唯一英文名称，大模型会用这个名字来指名调用，例如 "calculator" */
  name: string,
  /** 工具的功能说明，极其重要！大模型靠这段文字来判断什么时候使用该工具 */
  description: string
  /** 参数的 Zod Schema，不仅用于运行时校验，还用于生成 JSON Schema */
  parameters: T,
  /**
     * 是否为敏感/危险操作？（默认为 false）
     * 如果设为 true，后续在 Agent 执行时会暂停并向你在终端弹窗请求确认 (Human-in-the-loop)
     */
  dangerous?: boolean;

  /**
   * 本地执行的真实业务函数
   * 注意这里的类型提示：z.infer<T> 会自动将你的 Zod Schema 转换为纯正的 TS 类型！
   * 返回值必须是字符串（因为最终要把结果文字喂回给大模型）
   */
  execute: (args: z.infer<T>) => Promise<string> | string;
}


/**
 * 内部运行时工具接口（已经完成了转换与包装）
 * Agent 引擎在实际调度时，使用的是这个类型
 */
export interface RegisteredTool {
  /** 转换好的、符合大模型 SDK 规范的原始 JSON Schema */
  definition: ChatCompletionTool;
  /** 是否为危险操作 */
  dangerous: boolean;
  /**
     * 抹平参数类型的通用执行器：
     * 接收大模型给的原始 JSON 字符串，内部自动走 Zod 校验后执行真正的函数
     */
  execute: (argsJson: string) => Promise<string>;
}
