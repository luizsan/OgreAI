// required for calculating tokens correctly
import OpenAI from "../api/openai.js"
import * as Utils from "../lib/utils.js"
import * as Tokenizer from "../tokenizer/claude.js"
import * as Format from "../../shared/format.mjs"

class Anthropic{

    // display name
    static API_NAME = "Anthropic"
    static API_ADDRESS = "https://api.anthropic.com"

    // settings for this API
    // types: textarea, select (dropdown), range (slider), checkbox
    static API_SETTINGS = {
        model: {
            title: "Model",
            description: "The model that will complete your prompt. This parameter controls which version of Claude answers your request.",
            type: "select", default: "claude-v1.2", choices: [
                "claude-3-5-sonnet-20240620",
                "claude-3-opus-20240229",
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307",
                "claude-2.1",
                "claude-2.0",
                "claude-instant-1.2"
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


    // private variable to store incomplete messages
    static #__message_chunk = "";

    // getStatus must return a boolean
    static async getStatus(settings){
        const options = {
            method: "POST",
            headers: {
                'accept': 'application/json',
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': settings.api_auth,
            },
            'body': JSON.stringify({
                'model': 'claude-instant-1.2',
                'stream': false,
                'max_tokens': 1,
                'temperature': 0,
                'messages': [{'role': 'user', 'content': "Hello world!"}]
            })
        }
        if( settings.api_url ){
            return OpenAI.getStatus( settings )
        }else{
            return await fetch( this.API_ADDRESS + "/v1/messages", options ).then((response) => {
                return response.ok || response.status === 429
            })
        }
    }

    static makePrompt( content, offset = 0 ){
        const character = content.character;
        const settings = content.settings;
        const user = content.user.name;

        let list = Utils.makePrompt( Tokenizer, content, offset )
        list[0].role = "user"
        // list = list.filter(message => message.role && message.role !== "system")

        const last = list.at(-1)
        const penultimate = list.at(-2)
        const insert_continue = last.role === penultimate.role && last.role === "assistant"

        if( insert_continue ){
            let sub_prompt = Utils.getSubPrompt( character, settings )
            let sub_enabled = Utils.getFieldEnabled("sub_prompt", settings )
            let pad = {
                role: "user",
                content: settings.continue_message ? settings.continue_message : "(continue)"
            }

            if( sub_enabled && sub_prompt ){
                sub_prompt = Format.parseNames( sub_prompt, user, character.data.name )
                pad.content += "\n" + sub_prompt
            }

            list.splice(-1, 0, pad)
        }

        list = Utils.mergeMessages(list)
        return list
    }

    static getTokenizer(){
        return Tokenizer
    }

    static getMessageTokens( message, character, user, settings ){
        return Utils.getMessageTokens( Tokenizer, message, character, user, settings )
    }

    static getCharacterTokens( character, user, settings ){
        return Utils.getCharacterTokens( Tokenizer, character, user, settings )
    }

    static async generate( content ){
        const settings = content.settings;
        const prompt = content.prompt;
        const character = content.character;
        const user = content.user;

        let outgoing_data = {
            model: settings.model,
            messages: prompt,
            // system: Utils.getSystemPrompt(character, user, settings),
            stop_sequences: Utils.sanitizeStopSequences(settings.stop_sequences, user, character),
            max_tokens: parseInt(settings.max_tokens),
            temperature: parseFloat(settings.temperature),
            top_p: parseFloat(settings.top_p),
            top_k: parseFloat(settings.top_k),
            stream: settings.stream,
        };

        let options = {
            method: "POST",
            headers: {
                'accept': 'application/json',
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': settings.api_auth,
            },
            body: JSON.stringify(outgoing_data)
        }

        console.debug("Sending prompt %o", outgoing_data)
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return fetch( url + "/v1/messages", options )
    }

    static receiveData( incoming_data, swipe = false ){
        let incoming_json = ""
        try{
            incoming_json = JSON.parse(incoming_data);
            if( incoming_json.content ){
                console.debug(incoming_json.model)
                let message = {
                    participant: 0,
                    swipe: swipe,
                    candidate: {
                        model: incoming_json.model || undefined,
                        text: incoming_json.content[0].text,
                        timestamp: Date.now(),
                    }
                }
                this.__message_chunk = ""
                return message;
            }else{
                this.__message_chunk = ""
                return incoming_json;
            }
        }catch(error){
            // catch incomplete json responses
            if(error instanceof SyntaxError){
                console.error("JSON Syntax error")
                this.#__message_chunk += incoming_data
                return null;
            }else{
                this.__message_chunk = ""
                console.error(error)
                return error
            }
        }
    }

    static receiveStream( incoming_data, swipe, replace = false ){
        let message = {
            done: false,
            participant: 0,
            swipe: swipe,
            replace: replace,
            streaming: {
                text: "",
                model: undefined,
                timestamp: Date.now()
            }
        }



        const raw_text = (this.__message_chunk || "") + incoming_data
        const lines = raw_text.replace(/data: /gm, '\n').split('\n').filter(line => line.trim() !== '');
        for( const line of lines ){
            if(!line) continue;
            if(line.startsWith("event:")) continue;

            let obj = line.replace(/data: /gm, '')
            if(!obj || obj === "") continue;
            if(obj.startsWith(":")) continue;

            let parsed = null

            try {
                parsed = JSON.parse(obj);
                if (parsed.delta && parsed.delta.stop_reason) {
                    message.done = true;
                    break;
                }

                if( parsed.type && parsed.type === "message_start" ){
                    if( parsed.message && parsed.message.model ){
                        message.streaming.model = parsed.message.model
                        continue
                    }
                }

                if( parsed.type !== "content_block_delta" ) continue;

                const text = parsed.delta.text;

                if( text ){
                    // if( this.__message_chunk ){
                    //     console.log("CORRECTED: " + obj)
                    // }
                    message.streaming.text += text;
                    // console.log(obj)
                    this.__message_chunk = "";
                }
            }catch(error){
                if(error instanceof SyntaxError){
                    // console.log("PARSE ERROR: " + obj)
                    this.__message_chunk = obj
                }else{
                    console.log(obj)
                    console.error(error);
                }
                if(parsed?.error){
                    return parsed.error;
                }
            }
        }

        return message;
    }
}

export default Anthropic