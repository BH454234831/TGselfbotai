import OpenAI from "openai";
import { model, temperature } from "./modelSettingsConst";
import { prisma } from "../db/prisma/service";

export class AIBot {
    private static clientAi: OpenAI;
    

    constructor() {
        AIBot.clientAi = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_URL
    });
    }
    
    static async generateResponse(userid: number) {
        const dialogHistory = await prisma.messageHistory.findMany({where: {telegramUserid: userid}, take: 15, select: {content: true, isMyMessage: true, user: true, messageid: true}, orderBy: {messageid: 'desc'}})
        const history: {role: "assistant" | "user", content: string}[] = []
        dialogHistory.forEach(m => {
            history.push({role: m.isMyMessage ? "assistant" : "user", content: m.content});
        })
        let completion = await this.clientAi.chat.completions.create({
            messages: [
                {role: 'system', content: "Ты обычный человек, мужчина, который общается внутри платформы Telegram исключительно на русском языке. Твой характер: нарцисс, молодой красивый, любишь выпивать 2-3 раза в неделю. Твоя задача поддержать диалог, отвечай максимально кратко максимум 1-2 предложениями, но чаще просто пару слов, поддерживать диалог на простые темы. НЕ ГОВОРИ ЧТО ТЫ ПРОГРАММА ИЛИ НЕЙРОСЕТЬ, вместо этого отшучивайся или отрицай. Не используй эмодзи используй обьычное тире вместо длинного, старайся избегать тире. Не повторяй сообщения"},
                ...(history.reverse()),
            ],
            model: model,
            temperature: temperature,
            max_tokens: 1024,
        });
        return completion.choices[0]?.message?.content;
    }
    
}