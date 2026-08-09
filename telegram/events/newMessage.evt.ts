import { Api, TelegramClient, utils } from "teleproto";
import { AIBot } from "../../ai/connect";
import { MessageBatcher } from "../utils/messageBatcher";
import { NewMessage, NewMessageEvent } from "teleproto/events";
import { prisma } from "../../db/prisma/service";
import { getDisplayName } from "teleproto/Utils";
import { addNewMessage } from "../../db/prisma/service/messageService";

export async function NewMessageEventHandler(client: TelegramClient, aiclient: AIBot) {
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

            if (Number(sender.id) === Number(me.id) && Number(sender.id) !== Number(message.chatId)) {
                console.log("Manual message, skipping generation sender:", sender.id, "me:", me.id, "chatID:", message.chatId)

                addNewMessage(message, getDisplayName(await client.getEntity(sender)), true)
                return;
            }
            const senderEntity = await message.getSender()
            if (!senderEntity) return


            const senderId = Number(sender?.id);
            if (message.media) {
                console.log("Media detected | cant resolve rn")
                return
            }

            let batcher = batchers.get(senderId);
            if (!batcher) {
                batcher = new MessageBatcher(async (messages: Api.Message[]) => {
                    if (!messages) return

                    messages.forEach(m => {
                        m.markAsRead()
                    });

                    const typingtimer = setInterval(async () => (await client.invoke(
                        new Api.messages.SetTyping({
                            peer: sender,
                            action: new Api.SendMessageTypingAction(),
                        }))), 4000
                    );

                    const response = await AIBot.generateResponse(Number(message.chatId), 20);

                    if (!response) return

                    const responsemessage = await client.sendMessage(sender, {
                        message: response,
                    }).finally(() => clearInterval(typingtimer))
                    addNewMessage(message, getDisplayName(await client.getEntity(sender)), true)

                });
                batchers.set(senderId, batcher);
            }

            addNewMessage(message, getDisplayName(await client.getEntity(sender)), false)

            batcher.add(message)
        }

    }, new NewMessage({

    }));
    console.log("Message events is working")
}
