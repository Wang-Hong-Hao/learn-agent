// 初始化 OpenAI 客户端
import OpenAI from "openai";
import dotenv from "dotenv";


// 加载 .env 环境变量
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;

if (!apiKey) {
  throw new Error("请在 .env 文件中配置 OPENAI_API_KEY！");
}

export const llmClient = new OpenAI({
  apiKey,
  baseURL: baseURL || undefined,
})

// 默认使用的模型名称
export const DEFAULT_MODEL = process.env.MODEL_NAME || "gemini-2.5-flash";
