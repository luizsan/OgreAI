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
    squashPrompt,
    stringifyPrompt
} from "../lib/prompt.ts";

import * as Tokenizer from "../tokenizer/gpt.ts"


export default class NovelAI extends API {
    API_NAME = "NovelAI";
    API_VERSION = "1.0.0";
    API_ADDRESS = "https://text.novelai.net/";
    API_SETTINGS = {
        api_endpoint: {
            title: "API Endpoint",
            description: "The endpoint of the NovelAI API. Some models may require a different endpoint.",
            type: "select", default: "https://text.novelai.net/", choices: [
                "https://text.novelai.net/",
                "https://api.novelai.net/",
            ]
        },

        model: {
            title: "Model",
            description: "The model code to be called.",
            type: "select", default: "glm-4.6", choices: [
                "llama-3-erato-v1",
                "kayra-v1",
                "clio-v1",
                "purple",
                "green",
                "red",
                "blue",
                "sigurd-2.9b-v1",
                "cassandra",
                "infillmodel",
                "hypebot",
                "krake-v2",
                "genji-jp-6b-v2",
                "genji-jp-6b",
                "genji-python-6b",
                "euterpe-v2",
                "6B-v4",
                "2.7B",
            ]
        },

        min_length: {
            title: "Min Length",
            description: "The minimum number of tokens for model output.",
            type: "range", default: 4, min: 4, max: 2048, step: 8,
        },

        max_length: {
            title: "Max Length",
            description: "The maximum number of tokens for model output.",
            type: "range", default: 2048, min: 4, max: 2048, step: 8,
        },

        temperature: {
            title: "Temperature",
            description: "Sampling temperature, controls the randomness of the output.",
            type: "range", default: 1.35, min: 0.1, max: 2.5, step: 0.01,
        },

        top_p: {
            title: "top_p",
            description: "Another method of temperature sampling.",
            type: "range", default: 0.85, min: 0, max: 1, step: 0.01,
        },

        top_k: {
            title: "top_k",
            description: "Another method of temperature sampling.",
            type: "range", default: 15, min: 0, max: 150, step: 1,
        },

        top_a: {
            title: "top_a",
            description: "Another method of temperature sampling.",
            type: "range", default: 0.1, min: 0, max: 1, step: 0.01,
        },

        tail_free_sampling: {
            title: "Tail Free Sampling",
            description: "Another method of temperature sampling.",
            type: "range", default: 0.915, min: 0, max: 1, step: 0.01,
        },

        repetition_penalty: {
            title: "Repetition Penalty",
            description: "Penalize the model for generating tokens that have already been generated.",
            type: "range", default: 2.8, min: 1, max: 8, step: 0.01,
        },

        stream: {
            title: "Stream",
            description: "This parameter should be set to false or omitted when using synchronous call.",
            type: "checkbox", default: true,
        },


    }

    async getStatus(settings: { api_auth: string, api_url?: string; }): Promise<boolean> {
        const options = { method: "GET", headers:{ "Authorization": `Bearer ${settings.api_auth}` }}
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch(`${url}`, options).then (async (response) => response.ok)    }

    getTokenCount(text: string, model: string): number {
        return Tokenizer.getTokenCount(text, model)
    }

    makePrompt(data: IGenerationData, offset?: number ): any {
        let list: Array<IPromptEntry> = buildPrompt( this, data, offset )
        list = squashPrompt(list)
        return stringifyPrompt(list, `${data.user.name}`, `${data.character.data.name}`)
    }

    async generate(data: IGenerationData): Promise<any> {
        const settings: ISettings & Record<string, any> = data.settings;
        const output: any = data.output;

        const tokens_min: number = parseInt(settings.min_length);
        const tokens_max: number = parseInt(settings.max_length);

        let outgoing_data = {
            model: settings.model,
            input: output,
            parameters: {
                use_string: true,
                min_length: Math.min(tokens_min, tokens_max),
                max_length: Math.max(tokens_min, tokens_max),
                top_p: parseFloat(settings.top_p),
                top_k: parseFloat(settings.top_k),
                top_a: parseFloat(settings.top_a),
                repetition_penalty: parseFloat(settings.repetition_penalty),
                tail_free_sampling: parseFloat(settings.tail_free_sampling),
                temperature: parseFloat(settings.temperature),
                generate_until_sentence: true,
            },
        }

        let options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.api_auth}`,
            },
            body: JSON.stringify(outgoing_data)
        }

        const url: string = settings.api_url ? settings.api_url : settings.api_endpoint
        const target: string = settings.stream ? `${url}/ai/generate-stream` : `${url}/ai/generate`
        console.debug(`Sending prompt\n > ${target}\n\n%o`, outgoing_data)
        return await fetch(target, options)
    }

    receiveData( raw: string, swipe: boolean ): IReply | { error: any } {
        var reply: IReply = this.createReply(swipe)
        try{
            const parsed: any = JSON.parse(raw);
            if (parsed?.statusCode){
                return { error: { type: `[${parsed.statusCode}] ${parsed.details}`, message: parsed.message }}
            }
            const message: string = parsed?.output;
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
                if(line.startsWith("event:")) continue
                if(line.startsWith("id:")) continue
                const parsed: any = JSON.parse(line);
                if (parsed?.statusCode){
                    return { error: { type: `[${parsed.statusCode}] ${parsed.details}`, message: parsed.message }}
                }
                if (parsed.final){
                    reply.done = true;
                    break;
                }
                const delta: string = parsed.token;
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