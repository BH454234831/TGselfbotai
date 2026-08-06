import dotenv from "dotenv";
import { createAiBot } from "./ai";
import { telegramBootstrap } from "./telegram/handler";

dotenv.config();

async function main() {
    const clientAi = await createAiBot();
    const client = await telegramBootstrap(clientAi);
}

main().catch(console.error);