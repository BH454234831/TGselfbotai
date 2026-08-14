import { Api } from "teleproto";
import { prisma } from ".";
export async function addNewMessage(message: Api.Message, displayName: string, isMyMessage: boolean, pathToMedia?: string) {
    await prisma.telegramUser.upsert({
        where: { id: Number(message.chatId) },
        update: {
            id: Number(message.chatId),
            displayname: displayName,
            updatedAt: new Date(),
            messageHistory: {
                upsert: {
                    where: { telegramUserid_messageid: { messageid: message.id, telegramUserid: Number(message.chatId) } },
                    update: {},
                    create: {
                        messageid: message.id,
                        isMyMessage: false,
                        content: message.message,
                        media: message.media ? true : false,
                        pathToMedia: pathToMedia ? pathToMedia : '',

                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                }
            }
        },
        create: {
            id: Number(message.chatId),
            displayname: displayName,
            relationShipStart: new Date(),
            inException: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            messageHistory: {
                create: {
                    messageid: message.id,
                    isMyMessage: isMyMessage,
                    content: message.message,
                    media: message.media ? true : false,

                    pathToMedia: pathToMedia ? pathToMedia : '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }
        }
    });;
}