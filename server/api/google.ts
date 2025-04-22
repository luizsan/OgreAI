import API from "../core/api.ts"
import * as Tokenizer from "../tokenizer/gpt.ts"
import { IError, IGenerationData, IReply, ISettings } from "../../shared/types.js"
import { buildPrompt, squashPrompt } from "../lib/prompt.ts"

const SAFETY_SETTINGS = [
    { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "OFF" },
    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "OFF" },
    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "OFF" },
    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "OFF" },
    { "category": "HARM_CATEGORY_CIVIC_INTEGRITY", "threshold": "OFF" },
]

export default class Google extends API{
    API_NAME = "Google"
    API_VERSION = "1.0"
    API_ADDRESS = "https://generativelanguage.googleapis.com"
    API_SETTINGS = {
        model: {
            title: "Model",
            description: "ID of the model to use.",
            type: "select", default: "gemini-1.5-flash", choices: [
                "gemini-2.5-flash-preview-04-17",
                "gemini-2.5-pro-exp-03-25",
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
                "gemini-1.5-flash",
                "gemini-1.5-flash-8b",
                "gemini-1.5-pro"
            ]
        },

        max_tokens: {
            title: "Max Tokens",
            description: "The maximum number of tokens to generate in the completion. The token count of your prompt plus max_tokens cannot exceed the model's context length.",
            type: "range", default: 128, min: 8, max: 8192, step: 8,
        },

        context_size: {
            title: "Context Size",
            description: "Model context size.",
            type: "range", default: 32768, min: 128, max: 1048576, step: 8,
        },

        temperature: {
            title: "Temperature",
            description: "Controls the randomness of the output.",
            type: "range", default: 0.7, min: 0.0, max: 2.0, step: 0.01,
        },

        top_p: {
            title: "top_p",
            description: "The maximum cumulative probability of tokens to consider when sampling. The model uses combined Top-k and Top-p (nucleus) sampling. Tokens are sorted based on their assigned probabilities so that only the most likely tokens are considered. Top-k sampling directly limits the maximum number of tokens to consider, while Nucleus sampling limits the number of tokens based on the cumulative probability.",
            type: "range", default: 1.0, min: 0.0, max: 1.0, step: 0.01,
        },

        top_k: {
            title: "top_k",
            description: "The maximum number of tokens to consider when sampling. Gemini models use Top-p (nucleus) sampling or a combination of Top-k and nucleus sampling. Top-k sampling considers the set of topK most probable tokens. Models running with nucleus sampling don't allow topK setting.",
            type: "range", default: 20, min: 1, max: 40, step: 1,
        },

        presence_penalty: {
            title: "Presence Penalty",
            description: "Presence penalty applied to the next token's logprobs if the token has already been seen in the response. This penalty is binary on/off and not dependant on the number of times the token is used (after the first). Use frequencyPenalty for a penalty that increases with each use. A positive penalty will discourage the use of tokens that have already been used in the response, increasing the vocabulary. A negative penalty will encourage the use of tokens that have already been used in the response, decreasing the vocabulary.",
            type: "range", default: 0, min: -2, max: 2, step: 0.01,
        },

        frequency_penalty: {
            title: "Frequency Penalty",
            description: "Frequency penalty applied to the next token's logprobs, multiplied by the number of times each token has been seen in the respponse so far. A positive penalty will discourage the use of tokens that have already been used, proportional to the number of times the token has been used: The more a token is used, the more dificult it is for the model to use that token again increasing the vocabulary of responses.",
            type: "range", default: 0, min: -2, max: 2, step: 0.01,
        },

        stream: {
            title: "Stream",
            description: "Whether to stream back partial progress. If set, tokens will be sent as data-only server-sent events as they become available.",
            type: "checkbox", default: true,
        },

        stop_sequences: {
            title: "Stop Sequences",
            description: "The set of character sequences (up to 5) that will stop output generation. If specified, the API will stop at the first appearance of a stop_sequence. The stop sequence will not be included as part of the response.",
            type: "list", limit: 5, default: [],
        },
    }

    async getStatus(settings: { api_auth: string, api_url?: string; }): Promise<boolean> {
        const options = { method: "GET", headers:{ "ContentType":"application/json" }}
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch( `${url}/v1beta/models?key=${settings.api_auth}`, options ).then((response) => response.ok)
    }

    getTokenCount(text: string, model: string): number {
        return Tokenizer.getTokenCount(text, model)
    }

    makePrompt(data: IGenerationData, offset?: number): any {
        let list: Array<any> = buildPrompt( this, data, offset )
        list = squashPrompt(list, "\n\n")
        list = list.map((message) => {
            return {
                "role": message.role.
                    replaceAll("system", "user").
                    replaceAll("assistant", "model"),
                "parts": [{ "text": message.content }]
            }
        })

        let last = list.at(-1)
        if( last.role !== "user" ){
            list.push({ "role": "user", "parts": [{ "text": "(continue)" }] })
        }
        return list
    }

    async generate(data: IGenerationData): Promise<any> {
        const settings: ISettings & Record<string, any> = data.settings;
        const prompt: any = data.prompt;

        let outgoing_data = {
            model: settings.model,
            contents: prompt,
            safetySettings: SAFETY_SETTINGS,
            generationConfig: {
                maxOutputTokens: parseInt(settings.max_tokens),
                temperature: parseFloat(settings.temperature),
                topP: parseFloat(settings.top_p),
                topK: parseFloat(settings.top_k),
                stopSequences: this.sanitizeStopSequences(settings.stop_sequences, data.user, data.character),
            },
        };

        let options = {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(outgoing_data)
        }

        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        const mode = settings.stream ? "streamGenerateContent?alt=sse&key=" : "generateContent?key="
        const target: string = `${url}/v1beta/models/${settings.model}:${mode}${settings.api_auth}`
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
            if (parsed.promptFeedback){
                return { error: { message: parsed.promptFeedback.blockReason, type: "Prompt Feedback" }}
            }
            if (parsed.candidates[0]?.finishReason){
                const reason = parsed.candidates[0].finishReason
                if ( reason !== "STOP" )
                    return { error: { message: reason, type: "Finish Reason" }}
            }

            const message = parsed.candidates[0]?.content?.parts[0]?.text;
            if (message){
                reply.done = true;
                reply.candidate.text = message;
                reply.candidate.model = parsed.modelVersion || undefined;
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
                if (parsed.promptFeedback){
                    return { error: { message: parsed.promptFeedback.blockReason, type: "Prompt Feedback" }}
                }
                if (parsed.candidates[0]?.finishReason){
                    const reason = parsed.candidates[0].finishReason
                    if ( reason !== "STOP" )
                        return { error: { message: reason, type: "Finish Reason" }}
                }

                const delta: string = parsed.candidates[0]?.content?.parts[0].text;
                if (delta){
                    reply.candidate.text += delta;
                    reply.candidate.model = parsed.modelVersion ?? undefined
                    this.__message_chunk = "";
                }
            }catch(error: any){
                this.handleError(error, line)
            }
            return reply
        }
    }
}