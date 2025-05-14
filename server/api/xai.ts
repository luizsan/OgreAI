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


export default class xAI extends API {
    API_NAME = "xAI";
    API_VERSION = "1.0.0";
    API_ADDRESS = "https://api.x.ai";
    API_SETTINGS = {
        model: {
            title: "Model",
            description: "Both grok-3 and grok-3-fast use the exact same underlying model and deliver identical response quality. The difference lies in how they're served: grok-3-fast is served on faster infrastructure, offering response times that are significantly faster than the standard grok-3. The increased speed comes at a higher cost per output token.",
            type: "select", default: "grok-3-beta", choices: [
                "grok-3-beta",
                "grok-3-fast-beta",
                "grok-3-mini-beta",
                "grok-3-mini-fast-beta"
            ]
        },

        max_length: {
            title: "Max Length",
            description: "Number of tokens to generate in a reply. A higher amount of tokens takes longer to generate.",
            type: "range", default: 128, min: 8, max: 1024, step: 8,
        },

        context_size: {
            title: "Context Size",
            description: "Number of context tokens to submit to the AI for sampling. Make sure this is higher than Output Length. Higher values increase VRAM/RAM usage.",
            type: "range", default: 4096, min: 128, max: 131072, step: 8,
        },

        temperature: {
            title: "Temperature",
            description: "Randomness of sampling. Higher values can increase creativity, but make the output less meaningful. As the temperature approaches zero, the model will become deterministic and repetitive.",
            type: "range", default: 0.5, min: 0, max: 2, step: 0.01,
        },

        frequency_penalty: {
            title: "Frequency Penalty",
            description: "How much to penalize new tokens based on their existing frequency in the text so far. Decreases the model's likelihood to repeat the same line verbatim.",
            type: "range", default: 0, min: -2, max: 2, step: 0.01,
        },

        presence_penalty: {
            title: "Presence Penalty",
            description: "How much to penalize new tokens based on whether they appear in the text so far. Increases the model's likelihood to talk about new topics.",
            type: "range", default: 0, min: -2, max: 2, step: 0.01,
        },

        top_p: {
            title: "top_p",
            description: "Used to discard unlikely text in the sampling process. Lower values will make the output more predictable, but also repetitive. Put this value on 1 to disable its effect.",
            type: "range", default: 0.9, min: 0, max: 1, step: 0.01,
        },

        stream: {
            title: "Stream",
            description: "Whether to stream back partial progress. If set, tokens will be sent as data-only server-sent events as they become available.",
            type: "checkbox", default: true,
        },

        reasoning_effort: {
            title: "Reasoning Effort",
            description: "Constrains how hard a reasoning model thinks before responding.",
            type: "select", default: "low", choices: [ "low", "high" ], capitalize: true,
        },

        stop_sequences: {
            title: "Stop Sequences",
            description: "Up to 4 sequences where the API will stop generating further tokens. The returned text will not contain the stop sequence.",
            type: "list", limit: 4, default: [],
        }
    }

    async getStatus(settings: { api_auth: string, api_url?: string; }): Promise<boolean> {
        const options = { method: "GET", headers:{ "Authorization": `Bearer ${settings.api_auth}` }}
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch( `${url}/v1/models`, options ).then(async (response) => response.ok)
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
        const prompt: any = data.prompt;

        let outgoing_data = {
            model: settings.model,
            messages: prompt,
            stop: this.sanitizeStopSequences(settings.stop_sequences, data.user, data.character),
            max_completion_tokens: parseInt(settings.max_length),
            frequency_penalty: parseFloat(settings.frequency_penalty),
            presence_penalty: parseFloat(settings.presence_penalty),
            temperature: parseFloat(settings.temperature),
            top_p: parseFloat(settings.top_p),
            stream: settings.stream,
        }

        if( settings.model.toLowerCase().includes("-mini") ){
            outgoing_data.presence_penalty = undefined
            outgoing_data.frequency_penalty = undefined
            if( this.API_SETTINGS.reasoning_effort.choices.includes(settings.reasoning_effort)){
                outgoing_data["reasoning_effort"] = settings.reasoning_effort
            }
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
        const target: string = `${url}/v1/chat/completions`
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
                this.handleError(error, line)
            }
        }
        return reply
    }
}