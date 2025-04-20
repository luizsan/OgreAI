import API from "../core/api.ts"
import * as Tokenizer from "../tokenizer/mistral.ts"
import { IError, IGenerationData, IPromptEntry, IReply, ISettings } from "../../shared/types.js"
import { buildPrompt, squashPrompt } from "../lib/prompt.ts"


export default class Mistral extends API{
    API_NAME = "Mistral"
    API_VERSION = "1.0"
    API_ADDRESS = "https://api.mistral.ai/"
    API_SETTINGS = {
        model: {
            title: "Model",
            description: "ID of the model to use.",
            type: "select", default: "mistral-small", choices: [
                "mistral-large-latest",
                "mistral-medium-latest",
                "mistral-small-latest",
                "open-mixtral-8x22b",
                "open-mixtral-8x7b",
                "open-mistral-7b",
            ]
        },

        max_tokens: {
            title: "Max Tokens",
            description: "The maximum number of tokens to generate in the completion. The token count of your prompt plus max_tokens cannot exceed the model's context length.",
            type: "range", default: 128, min: 8, max: 1024, step: 8,
        },

        context_size: {
            title: "Context Size",
            description: "Model context size.",
            type: "range", default: 1024, min: 128, max: 32768, step: 8,
        },

        temperature: {
            title: "Temperature",
            description: "What sampling temperature to use, between 0.0 and 1.0. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.",
            type: "range", default: 0.7, min: 0.0, max: 1.0, step: 0.01,
        },

        top_p: {
            title: "top_p",
            description: "Nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.",
            type: "range", default: 1.0, min: 0.0, max: 1.0, step: 0.01,
        },

        stream: {
            title: "Stream",
            description: "Whether to stream back partial progress. If set, tokens will be sent as data-only server-sent events as they become available.",
            type: "checkbox", default: true,
        },

        safe_prompt: {
            title: "Safe Prompt",
            description: "Whether to inject a safety prompt before all conversations.",
            type: "checkbox", default: false,
        },
    }

    async getStatus(settings: { api_auth: string, api_url?: string; }): Promise<boolean> {
        const options = { method: "GET", headers:{ "Authorization": `Bearer ${settings.api_auth}` }}
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch( `${url}/v1/models`, options ).then(async (response) => response.ok)
    }

    getTokenCount(text: string, model: string): number {
        return Tokenizer.getTokenCount(text, model)
    }

    makePrompt(data: IGenerationData, offset?: number) {
        let list: Array<IPromptEntry> = buildPrompt(this, data, offset)
        list = squashPrompt(list)
        return list
    }

    async generate(data: IGenerationData): Promise<any>{
        const settings: ISettings & Record<string, any> = data.settings;
        const prompt: any = data.prompt;

        let outgoing_data = {
            model: settings.model,
            messages: prompt,
            max_tokens: parseInt(settings.max_tokens),
            temperature: parseFloat(settings.temperature),
            top_p: parseFloat(settings.top_p),
            safe_prompt: settings.safe_prompt,
            stream: settings.stream,
        };

        let options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + settings.api_auth,
            },
            body: JSON.stringify(outgoing_data)
        }

        const url: string = settings.api_url ? settings.api_url : this.API_ADDRESS
        const target: string = `${url}/v1/chat/completions`
        console.debug(`Sending prompt\n > ${target}\n\n%o`, outgoing_data)
        return await fetch(target, options)
    }

    receiveData( raw: string, swipe: boolean ): IReply | IError {
        var reply: IReply = this.createReply(swipe)
        try{
            const parsed: any = JSON.parse(raw);
            if (parsed.error){
                return parsed
            }
            if (parsed.detail ){
                return { error: { message: parsed.detail[0]?.msg, type: parsed.detail[0]?.type }}
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
                    return parsed
                }
                if (parsed.detail ){
                    return { error: { message: parsed.detail[0]?.msg, type: parsed.detail[0]?.type }}
                }
                console.log(line)
                const delta: string = parsed.choices[0]?.delta?.content ?? parsed.choices[0]?.message?.content;
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