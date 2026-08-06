import { Api, TelegramClient, utils } from "teleproto";
import { AIBot } from "../../ai/connect";
import { MessageBatcher } from "../utils/messageBatcher";
import { NewMessage, NewMessageEvent } from "teleproto/events";
 
 export async function NewMessageEventHandler (client: TelegramClient, aiclient: AIBot) {
    const batchers = new Map<number, MessageBatcher>();
    client.addEventHandler(async (event: NewMessageEvent) => {
        
        const message = event.message;
        if (event.isPrivate) {
            const sender = await message.getSender();
            const me = await client.getMe()
            
            if (!sender || sender.id == me.id) {
                console.error("Sender is undefined.");
                return;
            }
            const senderEntity = await message.getSender()
            if (!senderEntity) return

            
            const senderId = Number(sender?.id);
            console.log("generating response")
            let batcher = batchers.get(senderId);
            if (!batcher) {
                batcher = new MessageBatcher(async (messages: Api.Message[]) => {
                    const prompt: string[] = []
                    messages.forEach(m => {
                        if (!m.sender) return
                        const displayName = utils.getDisplayName(m.sender)
                        prompt.push(displayName + "" + m.message)
                    });
                    const response = await AIBot.generateResponse(prompt.toString());

                    if (!response) return

                    await client.sendMessage(sender, {
                        message: response,
                    });
                    });
                    batchers.set(senderId, batcher);
            }

            batcher.add(message)
        }

    }, new NewMessage({}));
    console.log("Message events is working")
}
