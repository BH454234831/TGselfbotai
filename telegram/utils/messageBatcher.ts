
import { Api } from "teleproto";
import { maxMessagesBatch, maxTimems } from "./messageBatcherConst";

type FlushCallback = (messages: Api.Message[]) => void;

export class MessageBatcher {

    messages: Api.Message[] = [];
    interval: ReturnType<typeof setTimeout> | null = null
    maxMessages: number = maxMessagesBatch;
    maxTime: number = maxTimems;
    onFlush: FlushCallback;

        constructor(
        onFlush: FlushCallback,
        maxMessages?: number,
        maxTime?: number
    ) {
        this.onFlush = onFlush;
        this.maxMessages = maxMessages ?? maxMessagesBatch;
        this.maxTime = maxTime ?? maxTimems;
    }

    async add(message: Api.Message) {

        if (this.messages.length > this.maxMessages) {
            return await this.flush()
        }

        this.messages.push(message)
        if (this.interval) return null
        
        this.interval = setTimeout(() => this.flush(), this.maxTime);

    }

    async flush(): Promise<void> {
        const chunk = this.messages
        this.messages = []
        if (this.interval) {
        clearTimeout(this.interval)
        this.interval = null
        }
        this.onFlush(chunk)
    }
}
