import API from "../core/api.ts";
import * as Utils from "../lib/utils.js"
import * as Tokenizer from "../tokenizer/gpt.ts"
import { IError, IGenerationData, IReply, ISettings } from "../../shared/types.js";
import { squashPrompt, buildPrompt } from "../lib/prompt.ts";
import { build } from "bun";


export default class DeepSeek extends API {
    API_NAME = "DeepSeek";
    API_VERSION = "1.0";
    API_ADDRESS = "https://api.deepseek.com";
    API_SETTINGS = {
        model: {
            title: "Model",
            description: "The OpenAI API is powered by a diverse set of models with different capabilities and price points.",
            type: "select", default: "deepseek-chat", choices: [
                "deepseek-chat",
                "deepseek-reasoner",
            ]
        },

        max_tokens: {
            title: "Max Tokens",
            description: "The maximum number of tokens that can be generated in the chat completion. The total length of input tokens and generated tokens is limited by the model's context length.",
            type: "range", default: 4096, min: 1, max: 8192, step: 8,
        },

        context_size: {
            title: "Context Size",
            description: "Number of context tokens to submit to the AI for sampling. Make sure this is higher than Output Length. Higher values increase VRAM/RAM usage.",
            type: "range", default: 1024, min: 128, max: 64000, step: 8,
        },

        temperature: {
            title: "Temperature",
            description: "What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or top_p but not both.",
            type: "range", default: 1.0, min: 0, max: 2, step: 0.01,
        },

        frequency_penalty: {
            title: "Frequency Penalty",
            description: "Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.",
            type: "range", default: 0, min: -2, max: 2, step: 0.01,
        },

        presence_penalty: {
            title: "Presence Penalty",
            description: "Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.",
            type: "range", default: 0, min: -2, max: 2, step: 0.01,
        },

        top_p: {
            title: "top_p",
            description: "An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. We generally recommend altering this or temperature but not both.",
            type: "range", default: 1.0, min: 0, max: 1, step: 0.01,
        },

        stream: {
            title: "Stream",
            description: "If set, partial message deltas will be sent. Tokens will be sent as data-only server-sent events (SSE) as they become available, with the stream terminated by a data: [DONE] message.",
            type: "checkbox", default: true,
        },

        beta: {
            title: "Beta",
            description: "If set, the API will use beta features. Beta features are not stable and may change in the future.",
            type: "checkbox", default: false,
        },

        stop: {
            title: "Stop Sequences",
            description: "Up to 16 sequences where the API will stop generating further tokens.",
            type: "list", limit: 16, default: [],
        }
    }

    async getStatus(settings: { api_auth: string, api_url?: string; }): Promise<boolean> {
        const options = { method: "GET", headers:{ "Authorization": `Bearer ${settings.api_auth}` }}
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch( `${url}/models`, options ).then(async (response) => response.ok)
    }

    getTokenCount(text: string, model: string): number {
        return Tokenizer.getTokenCount(text, model)
    }

    makePrompt(data: IGenerationData, offset?: number ): any {
        let list = buildPrompt( this, data, offset )

        // reasoner-specific rules
        if( data.settings.model.endsWith("-reasoner")){
            // deepseek-reasoner does not support successive user or assistant messages
            list = squashPrompt(list)

            // The first message (except the system message) of deepseek-reasoner must be a user message
            let index = list.findIndex((item) => item.role !== "system")
            if( list[index].role === "assistant" ){
                list.splice(index, 0, { role: "user", content: "(start)" })
            }

            // The last message of deepseek-reasoner must be a user message, or an assistant message with prefix mode on
            let last = list.at(-1)
            if( last.role === "assistant" ){
                if( data.settings?.["beta"] ){
                    last.prefix = true
                }else{
                    list.push({ role: "user", content: "(continue)" })
                }
            }
        }

        return list
    }

    async generate(data: IGenerationData): Promise<any>{
        const settings: ISettings & Record<string, any> = data.settings;
        const prompt: any = data.prompt;

        let outgoing_data = {
            model: settings.model,
            messages: prompt,
            stop: this.sanitizeStopSequences(settings.stop_sequences, data.user, data.character),
            max_tokens: parseInt(settings.max_tokens),
            frequency_penalty: parseFloat(settings.frequency_penalty),
            presence_penalty: parseFloat(settings.presence_penalty),
            temperature: parseFloat(settings.temperature),
            top_p: parseFloat(settings.top_p),
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
        const target: string = `${url}/${settings.beta ? "beta" : "chat"}/completions`
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