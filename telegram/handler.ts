
import { NewMessageEventHandler } from "./events/newMessage.evt";
import { AIBot } from "../ai/connect";
import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { createInterface } from "node:readline/promises";

const input = require("input");

export async function telegramBootstrap(aiclient: AIBot): Promise<TelegramClient> {

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");
    
    const client = new TelegramClient(stringSession, Number(process.env.APP_ID), process.env.API_HASH!, {
        connectionRetries: 5,
    });
    
    await client.start({
    phoneNumber: () => rl.question("Phone: "),
    password:    () => rl.question("2FA password: "),
    phoneCode:   () => rl.question("Code: "),
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
    
    await NewMessageEventHandler(client, aiclient);
    
    return client;
}