import OpenAI from "openai";
import { masterPrompt, model, temperature, tools } from "./modelSettingsConst";
import { prisma } from "../db/prisma/service";
import { handleFactTool, handleRelationTool } from "./tools/toolsHandler";
import fs from 'fs'

export class AIBot {
    private static clientAi: OpenAI;
    private static transcriptionClient: OpenAI
    constructor() {
        AIBot.clientAi = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_URL,
        });
        AIBot.transcriptionClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_TRANSCRIPTION_URL,
        });
    }

    static async generateResponse(userid: number, fetchMessage: number, forceTools: boolean, extraprompt?: string, pathtomedia?: string) {
        const dialogHistory = await prisma.messageHistory.findMany({ where: { telegramUserid: userid }, take: fetchMessage, select: { content: true, isMyMessage: true, user: true, messageid: true, media: true, pathToMedia: true }, orderBy: { messageid: 'desc' } })

        const facts = await prisma.facts.findMany({ where: { telegramUserid: userid }, select: { id: true, class: true, content: true, important: true } })
        const relation = await prisma.relation.findFirst({
            where: { id: userid },
            select: {
                trust: true, warm: true, respect: true, affection: true, conflict: true
            }
        })
        

        const factsPrompt = "Далее представлены факты о собеседнике в формате {content: Описание факта о человеке, class: Классификация факта, important: Важность от 0 до 1 в формате float}. Используй факты только при необходимости, например имя при обращении или если пользователь спрашивает о прошедших событиях о которых рассказывал, в остальное время игнорируй их"
            + JSON.stringify(facts)
        const relationPrompt = "Далее представлены твои отношения с собеседником в формате {trust: float; warm: float;respect: float;affection: float;conflict: float;} Значение 1 - максимальное, например максимальное доверие, теплота, симпатия или максимальная конфликтная ситуация. Значение 0 - минимальное"
            + JSON.stringify(relation)

        const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
        dialogHistory.forEach(m => {
            if (history.length > 0) {
                if ((history[history.length - 1].role == "assistant" && m.isMyMessage) || (history[history.length - 1].role == "user" && !m.isMyMessage)) {
                    history[history.length - 1].content = history[history.length - 1].content + " " + m.content
                }
            }
            history.push({ role: m.isMyMessage ? "assistant" : "user", content: m.content });
        })

        let completion = await this.clientAi.chat.completions.create({
            messages: [
                {
                    role: 'system', content: masterPrompt + " " + relationPrompt + " " + factsPrompt + " " + extraprompt
                },
                ...(history.reverse()), // reverse нужен чтобы выстроить правильный ход диалога
            ],
            tools: tools,
            tool_choice: forceTools ? 'required' : 'auto',
            model: model,
            temperature: temperature,
        });
        
        if (completion.choices[0]?.message?.tool_calls) {
            console.log("tools resolved", completion.choices[0]?.message?.tool_calls)
            completion.choices[0]?.message?.tool_calls.forEach(tool => {
                const args = JSON.parse(tool.function.arguments);
                handleRelationTool(args.relation, userid);
                handleFactTool(args.facts, userid);
            });
            const args = JSON.parse(completion.choices[0]?.message?.tool_calls[0].function.arguments);
            console.log("generation response: ", args.response)
            return args.response
        }
        return completion.choices[0]?.message?.content;
    }

    static async generateTranscription(buffer: Buffer<ArrayBufferLike>, extension: string) {

        const file = new File([buffer.buffer as ArrayBuffer], `media${extension}`)

        const transcription = await this.transcriptionClient.audio.transcriptions.create({
            model: 'whisper-1',
            file: file,
            language: 'ru'
        })

        return transcription.text
    }

}