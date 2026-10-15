import { z } from "zod";
import { defineTool } from "../core/tool.js";

export const calculatorTool = defineTool({
  // 1. 工具名称：必须简短清晰，英文字符
  name: 'calculator',
  // 2. 工具描述：这行中文非常关键！大模型读到用户有计算需求时，就会匹配到这个描述
  description: "用于执行数学表达式计算（加、减、乘、除、括号等四则运算）",
  // 3. 用 Zod 定义参数规则，并给每个字段写清楚中文说明
  parameters: z.object({
    expression: z.string().describe("需要计算的数学表达式字符串，例如: '((120 * 15) + 350) / 2'"),
    // 计算只是纯内存运算，不危险，不需要人工弹窗确认
  }),
  dangerous: false,
  // 4. 业务逻辑函数：参数在这里自动拥有 { expression: string } 的强类型提示！
  execute: function (expression) {
    // 关键安全防线：正则白名单校验，杜绝任何代码注入
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error("表达式包含非法字符！仅允许数字和基本运算符 (+ - * / ())");
    }

    try {
      // 在沙箱作用域内安全执行四则运算
      const result = Function(`"use strict"; return (${expression})`)();

      // 返回计算结果字符串
      return `计算结果: ${result}`;
    } catch {
      throw new Error(`无法计算该数学表达式: ${expression}`);
    }
  }
})
