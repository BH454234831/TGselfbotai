import OpenAI from "openai";
import { model, temperature } from "./modelSettingsConst";

export class AIBot {
    private static clientAi: OpenAI;
    

    constructor() {
        AIBot.clientAi = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_URL
    });
    }
    
    static async generateResponse(message: string) {
        let completion = await this.clientAi.chat.completions.create({
            messages: [
                {role: 'system', content: "Твоя задача ответить на предложение пользователя не более чем одним абзацем"},
                {role: 'user', content: message},
            ],
            model: model,
            temperature: temperature,
            
        });
        return completion.choices[0]?.message?.content;
    }
    
}