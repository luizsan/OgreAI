import API from "../core/api.ts";
import type {
    IReply,
    ISettings,
    IGenerationData,
    IPromptEntry,
    IError,
} from "../../shared/types.js";

import {
    buildPrompt,
    squashPrompt
} from "../lib/prompt.ts";

import * as Tokenizer from "../tokenizer/gpt.ts"


export default class ZAI extends API {
    API_NAME = "Z.AI";
    API_VERSION = "1.0.0";
    API_ADDRESS = "https://api.z.ai";
    API_SETTINGS = {
        model: {
            title: "Model",
            description: "The model code to be called.",
            type: "select", default: "glm-4.6", choices: [
                "glm-4.6",
                "glm-4.5",
                "glm-4.5-x",
                "glm-4.5-air",
                "glm-4.5-airx",
                "glm-4.5-flash",
                "glm-4-32b-0414-128k"
            ]
        },

        max_length: {
            title: "Max Length",
            description: "The maximum number of tokens for model output.",
            type: "range", default: 1024, min: 8, max: 16384, step: 8,
        },

        context_size: {
            title: "Context Size",
            description: "Number of context tokens to submit to the AI for sampling.",
            type: "range", default: 4096, min: 128, max: 64000, step: 8,
        },

        temperature: {
            title: "Temperature",
            description: "Sampling temperature, controls the randomness of the output.",
            type: "range", default: 0.6, min: 0, max: 1, step: 0.01,
        },

        top_p: {
            title: "top_p",
            description: "Another method of temperature sampling.",
            type: "range", default: 0.95, min: 0, max: 1, step: 0.01,
        },

        stream: {
            title: "Stream",
            description: "This parameter should be set to false or omitted when using synchronous call.",
            type: "checkbox", default: true,
        },

        stop_sequences: {
            title: "Stop",
            description: "Stop word list. Generation stops when the model encounters any specified string.",
            type: "list", limit: 1, default: [],
        }
    }

    async getStatus(settings: { api_auth: string, api_url?: string; }): Promise<boolean> {
        const options = { method: "GET", headers:{ "Authorization": `Bearer ${settings.api_auth}` }}
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch( `${url}/api/paas/v4/chat/completions`, options ).then(async (response) => response.ok)
    }

    getTokenCount(text: string, model: string): number {
        return Tokenizer.getTokenCount(text, model)
    }

    makePrompt(data: IGenerationData, offset?: number ): any {
        let list: Array<IPromptEntry> = squashPrompt(buildPrompt( this, data, offset ))
        list = squashPrompt(list)
        return list
    }

    async generate(data: IGenerationData): Promise<any> {
        const settings: ISettings & Record<string, any> = data.settings;
        const output: any = data.output;

        let outgoing_data = {
            model: settings.model,
            messages: output,
            stop: this.sanitizeStopSequences(settings.stop_sequences, data.user, data.character),
            max_tokens: parseInt(settings.max_length),
            temperature: parseFloat(settings.temperature),
            top_p: parseFloat(settings.top_p),
            stream: settings.stream,
            thinking: { type: "disabled" }
        }

        let options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.api_auth}`,
            },
            body: JSON.stringify(outgoing_data)
        }

        const url: string = settings.api_url ? settings.api_url : this.API_ADDRESS
        const target: string = `${url}/api/paas/v4/chat/completions`
        console.debug(`Sending prompt\n > ${target}\n\n%o`, outgoing_data)
        return await fetch(target, options)
    }

    receiveData( raw: string, swipe: boolean ): IReply | { error: any } {
        var reply: IReply = this.createReply(swipe)
        try{
            const parsed: any = JSON.parse(raw);
            if (parsed.error){
                return { error: { type: parsed.code, message: parsed.error }}
            }
            reply.candidate.model = parsed.model ?? undefined
            const reason: string = parsed.choices[0]?.message.reasoning_content;
            if (reason){
                reply.candidate.reasoning = reason;
                this.__message_chunk = "";
            }
            const message: string = parsed.choices[0]?.message?.content;
            if (message){
                reply.done = true;
                reply.candidate.text = message;
                reply.candidate.model = parsed.model ?? undefined;
                this.__message_chunk = "";
            }
        }catch(error: any){
            console.error(error)
            this.handleError(error, raw)
        }
        return reply
    }

    receiveStream( raw: string, swipe: boolean = false, replace: boolean = false ): IReply | IError {
        var reply: IReply = this.createReply(swipe, replace)
        const lines: string[] = this.cleanIncomingStream(raw)
        for (const line of lines) {
            if (line.startsWith(":")) continue;
            if (line === '[DONE]') {
                reply.done = true;
                break;
            }
            try{
                const parsed: any = JSON.parse(line);
                if (parsed.error){
                    return { error: { type: parsed.code, message: parsed.error }}
                }
                reply.candidate.model = parsed.model ?? undefined
                if (parsed.choices[0]?.delta?.finish_reason){
                    reply.done = true
                    reply.candidate.text = parsed.choices[0]?.delta?.finish_reason
                    this.__message_chunk = "";
                }
                const reason: string = parsed.choices[0]?.delta?.reasoning_content;
                if (reason){
                    if( !reply.candidate.reasoning )
                        reply.candidate.reasoning = "";
                    reply.candidate.reasoning += reason;
                    this.__message_chunk = "";
                }
                const delta: string = parsed.choices[0]?.delta?.content;
                if (delta){
                    reply.candidate.text += delta;
                    reply.candidate.model = parsed.model ?? undefined
                    this.__message_chunk = "";
                }
            }catch(error: any){
                console.error("%o", error)
                this.handleError(error, line)
            }
        }
        return reply
    }
}