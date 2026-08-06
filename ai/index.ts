import { AIBot } from "./connect";

export async function createAiBot(): Promise<AIBot> {
    const aiclient = new AIBot()
    return aiclient
}