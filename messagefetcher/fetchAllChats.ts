import { createInterface } from "node:readline/promises";
import { TelegramClient, utils } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { prisma } from "../db/prisma/service";
import { AIBot } from "../ai/connect";

async function start() {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

    const client = new TelegramClient(stringSession, Number(process.env.APP_ID), process.env.API_HASH!, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: () => rl.question("Phone: "),
        password: () => rl.question("2FA password: "),
        phoneCode: () => rl.question("Code: "),
        onError: console.error,
    });


    if (!stringSession) {
        console.log("session string: " + client.session.save());
        console.log("ВВЕДИТЕ ТОКЕН ВЫШЕ В .env TELEGRAM_SESSION")
    }

    await client.connect();

    if (!await client.isUserAuthorized()) {
        console.error("User is not authorized!");
        throw new Error("Not authorized");
    }
    const me = await client.getMe()
    await prisma.telegramUser.upsert({
        where: { id: Number(me.id) },
        update: {
            id: Number(me.id),
            displayname: utils.getDisplayName(me),
            updatedAt: new Date()
        },
        create: {
            id: Number(me.id),
            displayname: utils.getDisplayName(me),
            relationShipStart: new Date(),
            inException: false,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
    const clientai = new AIBot()
    let transactionData: { messageid: number, telegramUserid: number, isMyMessage: boolean, content: string, media: boolean, createdAt: Date, updatedAt: Date }[] = []
    
    for await (const dialog of client.iterDialogs({ limit: 5, ignorePinned: true, folder: 0 })) {
        if (!dialog.id || !dialog.entity) continue

        const messages = await client.getMessages(dialog.entity)
        const entity = await client.getEntity(dialog.id)
        const displayName = utils.getDisplayName(entity)

        await prisma.telegramUser.upsert({
            where: { id: Number(dialog.id) },
            update: {
                id: Number(dialog.id),
                displayname: displayName,
                updatedAt: new Date()
            },
            create: {
                id: Number(dialog.id),
                displayname: displayName,
                relationShipStart: new Date(),
                inException: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log(Number(dialog.id), displayName)

        messages.forEach(message => {
            if (!message.message && !message.id && message.message == "") return
            transactionData.push({ messageid: message.id, telegramUserid: Number(dialog.id), isMyMessage: Number(message.senderId) === Number(me.id) ? true : false, content: message.message ?? '', media: message.media ? true : false, createdAt: new Date(), updatedAt: new Date() })
        });

        await prisma.messageHistory.createMany({
            data: transactionData,
        })

        const res = await AIBot.generateResponse(transactionData[0].telegramUserid, Math.min(transactionData.length, 10000), true)
        console.log(res)
        transactionData = []
    }

    console.log("DONE!")
}

start().catch(console.error)