import * as Utils from "../lib/utils.js"
import * as Tokenizer from "../tokenizer/gpt.js"
import OpenAI from "../api/openai.js"

class DeepSeek{
    static API_NAME = "DeepSeek"
    static API_ADDRESS = "https://api.deepseek.com/beta"

    static API_SETTINGS = {
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

        stop: {
            title: "Stop Sequences",
            description: "Up to 16 sequences where the API will stop generating further tokens.",
            type: "list", limit: 16, default: [],
        }
    }

    // private variable to store incomplete messages
    static #__message_chunk = "";

    // getStatus must return a boolean
    static async getStatus(settings){
        const options = { method: "GET", headers:{ "Authorization":"Bearer " + settings.api_auth }}
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch( url + "/models", options ).then((response) => response.ok)
    }

    // returns an array of objects in this case but can anything that the model accepts as a prompt
    static makePrompt( content, offset = 0 ){
        let list = Utils.makePrompt( Tokenizer, content, offset )
        if( list.length > 1 && list[1].role === "assistant" ){
            list[1].role = "system"
            list = Utils.mergeMessages(list)
        }
        let last = list.at(-1)
        if( last.role === "assistant" ){
            last.prefix = true
        }
        return list
    }

    static getTokenizer(){
        return Tokenizer
    }

    static getMessageTokens( message, character, user, settings ){
        return Utils.getMessageTokens( Tokenizer, message, character, user, settings )
    }

    // returns an object with the token breakdown for a character
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
            stop: Utils.sanitizeStopSequences(settings.stop_sequences, user, character),
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

        console.debug("Sending prompt %o", outgoing_data)
        // console.debug(`Sending prompt to ${outgoing_data.model}...`)

        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return fetch( url + "/chat/completions?api-version=" + this.API_VERSION, options )
    }

// processes a single message from the model's output
    // - participant: 0
    // - swipe: true or false
    // - candidate: { text, timestamp, model }
    static receiveData( incoming_data, swipe = false ){
        let incoming_json = ""
        try{
            incoming_json = JSON.parse(incoming_data);
            if(incoming_json?.error){
                return incoming_json;
            }

            if( incoming_json.choices ){
                console.debug(incoming_json.model)
                const choice = incoming_json.choices[0].message
                const text = choice.content
                let message = {
                    participant: 0,
                    swipe: swipe,
                    candidate: {
                        model: incoming_json.model || undefined,
                        text: text,
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
                console.log(incoming_data)
                console.error(error)
                this.__message_chunk = ""
                return error
            }
        }
    }

    // if the API supports streams, must return a JSON
    // - done: if the stream has finished
    // - participant: 0
    // - swipe: true or false
    // - replace: replace the message contents or keep adding
    // - streaming: { text, timestamp, model }
    static receiveStream( incoming_data, swipe = false, replace = false ){
        let message = {
            done: false,
            participant: 0,
            swipe: swipe,
            replace: replace,
            streaming: {
                text: "",
                reasoning: "",
                model: undefined,
                timestamp: Date.now()
            }
        }

        const raw_text = (this.__message_chunk || "") + ( incoming_data.includes(":") ? incoming_data : "")
        const lines = raw_text.replace(/data: /gm, '\n').split('\n').filter(line => line.trim() !== '');
        for( const line of lines ){
            if(!line){
                continue;
            }
            const obj = line.replace(/data: /gm, '')

            if (obj === '[DONE]') {
                message.done = true;
                break;
            }

            if( obj.startsWith(":") ){
                continue
            }

            let parsed = null
            try {
                parsed = JSON.parse(obj);
                if(parsed?.error){
                    return parsed;
                }


                const delta = parsed.choices[0].delta;
                const reasoning = delta.reasoning_content
                const content = delta.content;
                message.streaming.model = parsed.model || undefined

                if( reasoning ){
                    message.streaming.reasoning += reasoning
                }
                if( content ){
                    message.streaming.text += content;
                    this.__message_chunk = "";
                }
            }catch(error){
                if(error instanceof SyntaxError){
                    this.__message_chunk = obj
                }else{
                    console.log(obj)
                    console.error(error);
                }
            }
        }

        return message;
    }

}

export default DeepSeek