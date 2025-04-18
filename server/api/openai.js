// required for calculating tokens correctly
import * as Utils from "../lib/utils.js"
import * as Tokenizer from "../tokenizer/gpt.js"

class OpenAI{

    // display name
    static API_NAME = "OpenAI"
    static API_ADDRESS = "https://api.openai.com/"
    static API_VERSION = "2024-02-01"

    // settings for this API
    // types: text, textarea, select (dropdown), range (slider), checkbox
    static API_SETTINGS = {
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

    // private variable to store incomplete messages
    static #__message_chunk = "";

    // getStatus must return a boolean
    static async getStatus(settings){
        const options = { method: "GET", headers:{ "Authorization":"Bearer " + settings.api_auth }}
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch( url + "/v1/models", options ).then((response) => response.ok)
    }

    // returns an array of objects in this case but can anything that the model accepts as a prompt
    static makePrompt( content, offset = 0 ){
        return Utils.makePrompt( Tokenizer, content, offset )
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

    // returns an output from the prompt that will be fed into receiveData
    static async generate( content ){
        const settings = content.settings;
        const prompt = content.prompt;
        const character = content.character;
        const user = content.user;

        let outgoing_data = {
            model: settings.model,
            messages: prompt,
            stop: Utils.sanitizeStopSequences(settings.stop_sequences, user, character),
            max_completion_tokens: parseInt(settings.max_length),
            frequency_penalty: parseFloat(settings.frequency_penalty),
            presence_penalty: parseFloat(settings.presence_penalty),
            temperature: parseFloat(settings.temperature),
            top_p: parseFloat(settings.top_p),
            logit_bias: this.buildLogitBias(settings.model, settings.logit_bias),
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
        return fetch( url + "/v1/chat/completions?api-version=" + this.API_VERSION, options )
    }

    static buildLogitBias(model, bias){
        let logit_bias = {}
        // validate bias as an object with keys and values
        if( !Array.isArray(bias) )
            return null

        bias.forEach(pair => {
            // validate pair as an object with key and value properties
            if( typeof pair !== "object" || !pair.key || !pair.value )
                return

            let key = pair.key
            let val = parseInt(pair.value)
            if( isNaN(val) )
                return

            if( val < -100 ){ val = -100 }
            if( val > 100 ){ val = 100 }

            // check if key is an int or parseable as one
            let token_id = parseInt(key)
            if( !isNaN(token_id) ){
                logit_bias[token_id] = val
            }else{
                var parsed_keys = Tokenizer.getTokens(key, model)
                if( parsed_keys.length > 0 ){
                    parsed_keys.forEach(id => {
                        logit_bias[parseInt(id)] = val
                    })
                }
            }
        })
        return logit_bias
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
                let message = {
                    participant: 0,
                    swipe: swipe,
                    candidate: {
                        model: incoming_json.model || undefined,
                        text: incoming_json.choices[0].message.content,
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

                const text = parsed.choices[0].delta.content;
                message.streaming.model = parsed.model || undefined
                if( text ){
                    message.streaming.text += text;
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

export default OpenAI