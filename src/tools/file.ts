import { z } from "zod";
import { defineTool } from "../core/tool.js";
import fs from "node:fs/promises";
import path from "node:path";


/**
 * 1. 读文件工具 (安全的只读操作)
 */
export const readFileTool = defineTool({
  name: 'read_file',
  description: "读取指定路径的文件内容文本。当需要查看某个文件的代码、配置或文档时调用此工具。",
  parameters: z.object({
    filePath: z.string().describe('文件的路径，支持相对路径（如 ./package.json）或绝对路径')
  }),
  dangerous: true,
  execute: async ({ filePath }) => {
    // 将相对路径解析为基于当前项目根目录的绝对路径
    const resolvedPath = path.resolve(process.cwd(), filePath);

    try {
      // 异步读取文件 UTF-8 文本内容
      const content = await fs.readFile(resolvedPath, "utf-8");
      return content;
    } catch (err: any) {
      throw new Error(`读取文件失败 [${filePath}]: ${err.message}`);
    }
  }
})

/**
 * 2. 写文件工具 (带有破坏性的修改操作)
 */

export const writeFileTool = defineTool({
  name: "write_file",
  description: "向指定路径写入文件内容。如果文件不存在会自动创建；如果已存在则会覆盖原有内容！",
  parameters: z.object({
    filePath: z.string().describe("目标文件路径，例如 ./dist/output.txt"),
    content: z.string().describe("需要写入的纯文本内容"),
  }),
  dangerous: true,
  execute: async ({ filePath, content }) => {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    try {
      // 自动确保目标目录存在（类似 mkdir -p）
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
      // 写入文件
      await fs.writeFile(resolvedPath, content, "utf-8");
      return `文件写入成功: ${filePath} (共写入 ${content.length} 个字符)`;
    } catch (err: any) {
      throw new Error(`写入文件失败 [${filePath}]: ${err.message}`);
    }
  }
})
