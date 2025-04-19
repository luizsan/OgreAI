// imports the base class, required for all API modes
import API from "../types/api.ts";

// imports type constraints
import type {
    IUser,
    IReply,
    ICharacter,
    ISettings,
    IGenerationData,
} from "../../shared/types.d.ts";

// imports the prompt builder
import {
    buildPrompt,
    squashPrompt
} from "../lib/prompt.ts";

// imports the tokenizer for token counts
import * as Tokenizer from "../tokenizer/gpt.ts"


export default class OpenAI extends API {
    API_NAME = "OpenAI";
    API_VERSION = "2024-02-01";
    API_ADDRESS = "https://api.openai.com";
    API_SETTINGS = {
        model: {
            title: "Model",
            description: "The OpenAI API is powered by a diverse set of models with different capabilities and price points.",
            type: "select", default: "gpt-3.5-turbo", choices: [
                "gpt-4.1",
                "gpt-4.1-mini",
                "gpt-4.1-nano",
                "gpt-4o",
                "gpt-4o-mini",
                "gpt-4-turbo",
                "gpt-4-turbo-preview",
                "gpt-4-32k",
                "gpt-4",
                "gpt-3.5-turbo-16k",
                "gpt-3.5-turbo",
            ]
        },

        max_length: {
            title: "Max Length",
            description: "Number of tokens to generate in a reply. A higher amount of tokens takes longer to generate.",
            type: "range", default: 128, min: 8, max: 512, step: 8,
        },

        context_size: {
            title: "Context Size",
            description: "Number of context tokens to submit to the AI for sampling. Make sure this is higher than Output Length. Higher values increase VRAM/RAM usage.",
            type: "range", default: 1024, min: 128, max: 16384, step: 8,
        },

        temperature: {
            title: "Temperature",
            description: "Randomness of sampling. Higher values can increase creativity, but make the output less meaningful. As the temperature approaches zero, the model will become deterministic and repetitive.",
            type: "range", default: 0.5, min: 0, max: 1, step: 0.01,
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

        stop_sequences: {
            title: "Stop Sequences",
            description: "Up to 4 sequences where the API will stop generating further tokens. The returned text will not contain the stop sequence.",
            type: "list", limit: 4, default: [],
        },

        logit_bias: {
            title: "Logit Bias",
            description: "Modify the likelihood of specified tokens appearing in the completion.",
            type: "dictionary", value: "number", default: [],
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
        return squashPrompt(buildPrompt( this, data, offset ))
    }

    buildLogitBias(bias: any, model?: string): Map<number, number> {
        const logit_bias = new Map<number, number>()
        if( !Array.isArray(bias) )
            return null
        bias.forEach(([k, v]) => {
            let value: number = parseInt(v)
            value = Math.max(-100, Math.min(100, value))

            if( typeof k === "number" && !isNaN(k) ){
                logit_bias.set(k, value)

            }else if( typeof k === "string" ){
                const parsed_keys = Tokenizer.getTokens(k, model)
                parsed_keys.forEach(id => {
                    logit_bias.set(id, value)
                })
            }
        })
        return logit_bias
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
            logit_bias: this.buildLogitBias(settings.logit_bias, settings.model),
            stream: settings.stream,
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
        const target: string = `${url}/v1/chat/completions?api-version=${this.API_VERSION}`
        console.debug(`Sending prompt\n > ${target}\n\n%o`, outgoing_data)
        return await fetch(target, options)
    }

    receiveData( raw: string, swipe: boolean ): IReply | { error: any } {
        var reply: IReply = this.createReply(swipe)
        try{
            const parsed: any = JSON.parse(raw);
            if (parsed.error){
                return parsed
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

    receiveStream( raw: string, swipe: boolean = false, replace: boolean = false ): IReply | { error: any } {
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
                    return parsed
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