import { Api, TelegramClient, utils } from "teleproto";
import { AIBot } from "../../ai/connect";
import { MessageBatcher } from "../utils/messageBatcher";
import { NewMessage, NewMessageEvent } from "teleproto/events";
import { prisma } from "../../db/prisma/service";
 
 export async function NewMessageEventHandler (client: TelegramClient, aiclient: AIBot) {
    const batchers = new Map<number, MessageBatcher>();
    client.addEventHandler(async (event: NewMessageEvent) => {
        
        const message = event.message;
        if (event.isPrivate) {
            const sender = await message.getSender();
            const me = await client.getMe()
            
            if (!sender) {
                console.error("Sender is undefined.");
                return;
            }
            await prisma.messageHistory.create({
            data: {
                messageid: message.id,
                telegramUserid: Number(message.chatId),
                isMyMessage: false,
                content: message.message,
                media: message.media ? true : false
            }});
            if (Number(sender.id) === Number(me.id)) {
                console.log("Manual message, skipping generation sender:", sender.id, "me:", me.id, "chatID:", message.chatId)
                return;
            }
            const senderEntity = await message.getSender()
            if (!senderEntity) return

            
            const senderId = Number(sender?.id);
            if (message.media) {
                console.log("Media detected | cant resolve rn")
                return
            }

            console.log("generating response in chat | chatID: " + message.chatId, "meID:", me.id, "senderID:", senderId)

            let batcher = batchers.get(senderId);
            if (!batcher) {
                batcher = new MessageBatcher(async (messages: Api.Message[]) => {
                    if (!messages) return
                    const prompt: string[] = []
                    
                    messages.forEach(m => {
                        if (!m.sender) return
                        const displayName = utils.getDisplayName(m.sender)
                        prompt.push(displayName + " " + m.message)
                    });

                    await client.invoke(
                    new Api.messages.SetTyping({
                        peer: sender,
                        action: new Api.SendMessageTypingAction(),
                    })
                    );

                    const response = await AIBot.generateResponse(Number(messages[0].senderId));

                    if (!response) return

                    const responsemessage = await client.sendMessage(sender, {
                        message: response,
                    });
                    await prisma.messageHistory.create({
                    data: {
                        messageid: responsemessage.id,
                        telegramUserid: Number(message.chatId),
                        isMyMessage: true,
                        content: responsemessage.message,
                        media: responsemessage.media ? true : false
                    }});
                    });
                    batchers.set(senderId, batcher);
            }
            
            batcher.add(message)
        }

    }, new NewMessage({
        
    }));
    console.log("Message events is working")
}
