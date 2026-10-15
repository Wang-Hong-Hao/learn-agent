import { z } from "zod";
// 引入转换函数
import { zodToJsonSchema } from "zod-to-json-schema";


// 1. 用 Zod 定义一个“规则模式”（Schema）
// 这不是类型，而是一个真实存在的 JS 对象！
const UserSchema = z.object({
  name: z.string(),
  age: z.number().min(0, "年龄不能小于 0 岁"),
  email: z.string().email("邮箱格式不正确").optional(), // optional 表示可选
});

// 2. 利用 z.infer 自动提取出 TypeScript 类型
// 你不需要手写 interface，Zod 自动帮你推导出来了！
type User = z.infer<typeof UserSchema>;

// 测试数据 1：完全合规的数据
const validData = {
  name: "张三",
  age: 18,
  email: "zhangsan@example.com",
};

// 3. 执行校验
console.log("--- 测试合规数据 ---");
const result1 = UserSchema.parse(validData);
console.log("校验通过！解析出的数据：", result1);

// 测试数据 2：故意构造非法数据（模拟大模型传错参数）
const badData = {
  name: "李四",
  age: -5, // 年龄小于 0
  email: "not-an-email", // 邮箱不合法
};

console.log("\n--- 测试非法数据 ---");
try {
  UserSchema.parse(badData);
} catch (error: any) {
  // 打印 Zod 捕获到的错误详情
  console.log("捕获到错误！模型传参不合法：");
  console.log(error.issues);
}


// 1. 定义一个“天气查询工具”的参数规则
// 注意：我们在每个字段后面加了 .describe(...)
// 这个 description 非常重要！大模型就是靠这段中文说明来理解参数含义的
const WeatherParamsSchema = z.object({
  city: z.string().describe('需要查询天气的城市名称，如：北京、上海'),
  unit: z.enum(["celsius", "fahrenheit"]).default("celsius").describe("温度单位：摄氏度或华氏度")
})

// 2. 将 Zod 对象一键转换为大模型标准的 JSON Schema
const openAiSchema = zodToJsonSchema(WeatherParamsSchema, {
  target: 'openAi' // 指定目标格式符合 OpenAI / 大模型通用标准
})

console.log("\n--- 转换后给大模型看的 JSON Schema ---");
console.log(JSON.stringify(openAiSchema, null, 2));
