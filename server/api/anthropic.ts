import API from "../core/api.ts"
import * as Tokenizer from "../tokenizer/anthropic.ts"
import * as Format from "../../shared/format.mjs"
import { buildPrompt, squashPrompt } from "../lib/prompt.ts"
import { ICharacter, IError, IGenerationData, IReply, ISettings, IUser } from "../../shared/types.js"

export default class Anthropic extends API {
    API_NAME = "Anthropic"
    API_VERSION = "2023-06-01"
    API_ADDRESS = "https://api.anthropic.com"
    API_SETTINGS = {
        model: {
            title: "Model",
            description: "The model that will complete your prompt. This parameter controls which version of Claude answers your request.",
            type: "select", default: "claude-v1.2", choices: [
                "claude-3-7-sonnet-latest",
                "claude-3-5-sonnet-latest",
                "claude-3-5-haiku-latest",
                "claude-3-opus-latest",
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307",
            ]
        },

        max_tokens: {
            title: "Max Length",
            description: "The maximum number of tokens to generate before stopping. Note that our models may stop before reaching this maximum. This parameter only specifies the absolute maximum number of tokens to generate.",
            type: "range", default: 250, min: 10, max: 1200, step: 10,
        },

        context_size: {
            title: "Context Size",
            description: "Number of context tokens to submit to the AI for sampling.",
            type: "range", default: 100000, min: 120, max: 100000, step: 10,
        },

        temperature: {
            title: "Temperature",
            description: "Amount of randomness injected into the response. Use temp closer to 0 for analytical / multiple choice, and closer to 1 for creative and generative tasks.",
            type: "range", default: 0.5, min: 0, max: 1, step: 0.01,
        },

        top_p: {
            title: "top_p",
            description: "Use nucleus sampling. In nucleus sampling, we compute the cumulative distribution over all the options for each subsequent token in decreasing probability order and cut it off once it reaches a particular probability specified by top_p. You should either alter temperature or top_p, but not both.",
            type: "range", default: 0.7, min: 0, max: 1, step: 0.01,
        },

        top_k: {
            title: "top_k",
            description: "Only sample from the top K options for each subsequent token. Used to remove \"long tail\" low probability responses.",
            type: "range", default: 5, min: 0, max: 100, step: 1,
        },

        stream: {
            title: "Stream",
            description: "Whether to incrementally stream the response using server-sent events.",
            type: "checkbox", default: true,
        },

        caching: {
            title: "Prompt Caching",
            description: "Prompt caching is a powerful feature that optimizes your API usage by allowing resuming from specific prefixes in your prompts. This approach significantly reduces processing time and costs for repetitive tasks or prompts with consistent elements. This feature can affect the quality of the response.",
            type: "checkbox", default: true,
        },

        continue_message: {
            title: "Continue Message",
            description: "What to automatically send as a padding message when the last message in chat isn't from the user. Defaults to '(continue)' if empty.",
            type: "text", default: "", placeholder: "(continue)",
        },

        stop_sequences: {
            title: "Stop Sequences",
            description: "Sequences that will cause the model to stop generating completion text.",
            type: "list", limit: -1, default: [],
        }
    }

    async getStatus(settings: { api_auth: string, api_url?: string; }): Promise<boolean> {
        const options = {
            method: "GET",
            headers: {
                'anthropic-version': this.API_VERSION,
                'content-type': 'application/json',
                'x-api-key': settings.api_auth,
            }
        }
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch( `${url}/v1/models`, options ).then((response) => response.ok)
    }

    getTokenCount(text: string, model: string): number {
        return Tokenizer.getTokenCount(text, model)
    }

    makePrompt( data: IGenerationData, offset: number = 0 ){
        // const character = data.character;
        // const settings = data.settings;
        // const user = data.user.name;

        let list = buildPrompt( this, data, offset )
        list = list.map((item) => {
            return {
                role: item.role === "developer" ? "user" : item.role,
                content: item.content
            }
        })

        // const last = list.at(-1)
        // const penultimate = list.at(-2)
        // const insert_continue = last.role === penultimate.role && last.role === "assistant"
        // todo: insert (continue)

        list = squashPrompt(list)
        return list
    }

    async generate( data: IGenerationData ): Promise<any> {
        const settings: ISettings & Record<string, any> = data.settings;
        const prompt: any = data.prompt;
        const character: ICharacter = data.character;
        const user: IUser = data.user;

        let outgoing_data: Record<string, any> = {
            model: settings.model,
            stop_sequences: this.sanitizeStopSequences(settings.stop_sequences, user, character),
            max_tokens: parseInt(settings.max_tokens),
            temperature: parseFloat(settings.temperature),
            top_p: parseFloat(settings.top_p),
            top_k: parseFloat(settings.top_k),
            stream: settings.stream,
        };

        if( settings.caching ){
            let last = prompt.at(-1)
            let rest = prompt.slice(0, -1)
            outgoing_data.system = [{
                type: "text",
                text: JSON.stringify(rest),
                cache_control: { type: "ephemeral" }
            }]
            outgoing_data.messages = [ last ]
        }else{
            outgoing_data.messages = prompt
        }

        let options = {
            method: "POST",
            headers: {
                'accept': 'application/json',
                'anthropic-version': this.API_VERSION,
                'content-type': 'application/json',
                'x-api-key': settings.api_auth,
            },
            body: JSON.stringify(outgoing_data)
        }

        const url: string = settings.api_url ? settings.api_url : this.API_ADDRESS
        const target: string = `${url}/v1/messages`
        console.debug(`Sending prompt\n > ${target}\n\n%o`, outgoing_data)
        return await fetch(target, options)
    }

    receiveData(raw: string, swipe: boolean): IReply | IError {
        var reply: IReply = this.createReply(swipe)
        try{
            const parsed: any = JSON.parse(raw);
            if (parsed.error){
                return parsed
            }
            const message: string = parsed.content[0]?.text;
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

    receiveStream(raw: string, swipe: boolean, replace?: boolean): IReply | IError {
        var reply: IReply = this.createReply(swipe, replace)
        const lines: string[] = this.cleanIncomingStream(raw)
        for (const line of lines) {
            if (line.startsWith("event:")) continue;
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
                if (parsed.delta && parsed.delta.stop_reason) {
                    reply.done = true;
                    break;
                }
                if( parsed.type && parsed.type === "message_start" ){
                    if( parsed.message && parsed.message.model ){
                        reply.candidate.model = parsed.message.model
                        continue
                    }
                }
                if( parsed.type !== "content_block_delta" ) continue;
                const delta: string = parsed.delta.text;
                if (delta){
                    reply.candidate.text += delta;
                    this.__message_chunk = "";
                }
            }catch(error: any){
                this.handleError(error, line)
            }
        }
        return reply
    }
}