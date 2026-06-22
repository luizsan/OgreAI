// imports the base class, required for all API modes
import API from "../core/api.ts";

// imports type constraints
import type {
    IReply,
    ISettings,
    IGenerationData,
    IPromptEntry,
    IError,
} from "../../shared/types.d.ts";

// imports the prompt builder
import {
    buildPrompt,
    squashPrompt
} from "../lib/prompt.ts";

// imports the tokenizer for token counts
import * as Tokenizer from "../lib/tokenizer.ts"


export default class Ollama extends API {
    API_NAME = "Ollama";
    API_ID = "ollama";
    API_VERSION = "";
    API_ADDRESS = "http://localhost:11434";
    API_SETTINGS = {
        model: {
            title: "Model",
            description: "Any model tag you've pulled locally. Run `ollama list` in a terminal to see what's available on this machine.",
            type: "select", default: "gemma4:12b", choices: [
                "gemma4:12b",
                "gemma4:e2b",
                "qwen3.5:2b",
                "qwen3.5:4b",
                "qwen3.5:9b",
            ]
        },

        max_length: {
            title: "Max Length",
            description: "Number of tokens to generate in a reply. Maps to Ollama's num_predict.",
            type: "range", default: 128, min: 8, max: 4096, step: 8,
        },

        context_size: {
            title: "Context Size",
            description: "Context window submitted to the model. Maps to Ollama's num_ctx.",
            type: "range", default: 4096, min: 128, max: 256000, step: 128,
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

        think: {
            title: "Thinking",
            description: "Reasoning effort for models that support configurable thinking (gemma4, qwen3.5). Silently ignored by models that don't support it.",
            type: "select", default: "off", choices: ["off", "low", "medium", "high"],
        },

        stream: {
            title: "Stream",
            description: "Whether to stream back partial progress. Ollama streams newline-delimited JSON objects, not server-sent events.",
            type: "checkbox", default: true,
        },

        stop_sequences: {
            title: "Stop Sequences",
            description: "Up to 4 sequences where the API will stop generating further tokens. The returned text will not contain the stop sequence.",
            type: "list", limit: 4, default: [],
        },
    }

    async getStatus(settings: { api_auth?: string, api_url?: string; }): Promise<boolean> {
        const headers: Record<string, string> = {}
        if (settings.api_auth) headers["Authorization"] = `Bearer ${settings.api_auth}`
        const options = { method: "GET", headers }
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        // /api/tags lists locally pulled models — a more meaningful health
        // check than just hitting the root, since it confirms the API is
        // actually serving, not just that the port is open.
        return await fetch(`${url}/api/tags`, options).then(async (response) => response.ok)
    }

    getTokenCount(text: string, model: string): number {
        try {
            return Tokenizer.getTokenCount(text, this.API_ID, model)
        } catch {
            return Math.ceil(text.length / 4)
        }
    }

    makePrompt(data: IGenerationData, offset?: number): any {
        let list: Array<IPromptEntry> = buildPrompt(this, data, offset)
        list = squashPrompt(list)
        return list
    }

    async generate(data: IGenerationData): Promise<any> {
        const settings: ISettings & Record<string, any> = data.settings;
        const output: any = data.output;

        const think: string | boolean = (settings.think && settings.think !== "off")
            ? settings.think
            : false

        let outgoing_data: Record<string, any> = {
            model: settings.model,
            messages: output,
            stream: settings.stream,
            think: think,
            options: {
                temperature: parseFloat(settings.temperature),
                top_p: parseFloat(settings.top_p),
                num_predict: parseInt(settings.max_length),
                num_ctx: parseInt(settings.context_size),
                frequency_penalty: parseFloat(settings.frequency_penalty),
                presence_penalty: parseFloat(settings.presence_penalty),
                stop: this.sanitizeStopSequences(settings.stop_sequences, data.user, data.character),
            }
        }

        let headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (settings.api_auth){
            headers["Authorization"] = `Bearer ${settings.api_auth}`
        }

        let options = {
            method: "POST",
            headers,
            body: JSON.stringify(outgoing_data)
        }

        const url: string = settings.api_url ? settings.api_url : this.API_ADDRESS
        const target: string = `${url}/api/chat`
        console.debug(`Sending prompt\n > ${target}\n\n%o`, outgoing_data)
        return await fetch(target, options)
    }

    receiveData(raw: string, swipe: boolean): IReply | { error: any } {
        var reply: IReply = this.createReply(swipe)
        try {
            const parsed: any = JSON.parse(raw);
            if (parsed.error) {
                return parsed
            }
            const message: string = parsed.message?.content;
            if (message) {
                reply.done = parsed.done ?? true;
                reply.candidate.text = message;
                reply.candidate.model = parsed.model ?? undefined;
                this.__message_chunk = "";
            }
        } catch (error: any) {
            this.handleError(error, raw)
        }
        return reply
    }

    receiveStream(raw: string, swipe: boolean = false, replace: boolean = false): IReply | IError {
        var reply: IReply = this.createReply(swipe, replace)
        const lines: string[] = this.cleanIncomingStream(raw)
        for (const line of lines) {
            try {
                const parsed: any = JSON.parse(line);
                if (parsed.error) {
                    return parsed
                }
                const delta: string = parsed.message?.content;
                if (delta) {
                    reply.candidate.text += delta;
                    reply.candidate.model = parsed.model ?? undefined
                }
                if (parsed.done) {
                    reply.done = true;
                    this.__message_chunk = "";
                }
            } catch (error: any) {
                this.handleError(error, line)
            }
        }
        return reply
    }
}