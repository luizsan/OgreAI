// required for calculating tokens correctly
import * as Utils from "../lib/utils.js"
import * as Tokenizer from "../tokenizer/gpt.js"

class Mistral{

    // display name
    static API_NAME = "Mistral"

    // settings for this API
    // types: text, textarea, select (dropdown), range (slider), checkbox
    static API_SETTINGS = {
        model: {
            title: "Model",
            description: "ID of the model to use.",
            type: "select", default: "mistral-small", choices: [ "mistral-tiny", "mistral-small", "mistral-medium" ]
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

        base_prompt: {
            title: "Base Prompt",
            description: "Used to give basic instructions to the model on how to behave in the chat.",
            type: "textarea", default: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write only one reply, with 1 to 4 paragraphs. Use markdown to italicize actions, and avoid quotation marks. Be proactive, creative, and drive the plot and conversation forward. Always stay in character and avoid repetition.",
        },

        sub_prompt: {
            title: "Sub Prompt",
            description: "Appended at the end of the user's last message to reinforce instructions.",
            type: "textarea", default: "",
        },

        prefill_prompt: {
            title: "Prefill Prompt",
            description: "Appended at the very end of the prompt to enforce instructions and patterns.",
            type: "textarea", default: "",
        }
    }

    // private variable to store incomplete messages
    static #__message_chunk = "";

    // getStatus must return a boolean
    static async getStatus(settings){
        const options = { method: "GET", headers:{ "Authorization":"Bearer " + settings.api_auth }}
        const url = settings.api_url ? settings.api_url : "https://api.mistral.ai/"
        return await fetch( url + "/v1/models", options ).then((response) => response.ok)
    }

    // returns an array of objects in this case but can anything that the model accepts as a prompt
    static makePrompt( character, messages, user, settings, offset = 0 ){
        return Utils.makePrompt( Tokenizer, character, messages, user, settings, offset )
    }

    // returns an object with the token breakdown for a character
    static getTokenConsumption( character, user, settings ){
        return Utils.getTokenConsumption( Tokenizer, character, user, settings )
    }

    // returns an output from the prompt that will be fed into receiveData
    static async generate(character, prompt, user, settings){
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

        console.debug("Sending prompt %o", outgoing_data)
        // console.debug(`Sending prompt to ${outgoing_data.model}...`)

        const url = settings.api_url ? settings.api_url : "https://api.mistral.ai/"
        return fetch( url + "/v1/chat/completions", options )
    }

    // processes a single message from the model's output
    // - participant: 0
    // - swipe: true or false
    // - candidate: { text, timestamp, model }
    static receiveData( incoming_data, swipe = false ){
        let incoming_json = ""
        try{
            incoming_json = JSON.parse(incoming_data);
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
                this.__message_chunk = ""
                console.error(error)
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
    
        const raw_text = this.__message_chunk + incoming_data
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

            try {
                const parsed = JSON.parse(obj);
                const text = parsed.choices[0].delta.content;
                message.streaming.model = parsed.model || undefined
                if( text ){
                    if( this.__message_chunk ){
                        console.log("CORRECTED: " + obj)
                    }
                    message.streaming.text += text;
                    this.__message_chunk = "";
                }
            }catch(error){
                if(error instanceof SyntaxError){
                    console.log("PARSE ERROR: " + obj)
                    this.__message_chunk = obj
                }else{
                    console.log(obj)
                    console.error(error);
                }
                if(obj.error){
                    return obj;
                }
            }
        }

        return message;
    }
}

export default Mistral