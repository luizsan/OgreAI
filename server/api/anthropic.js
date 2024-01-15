// required for calculating tokens correctly
import OpenAI from "../api/openai.js"
import * as Utils from "../lib/utils.js"
import * as Tokenizer from "../tokenizer/gpt.js"

class Anthropic{

    // display name
    static API_NAME = "Anthropic"

    // settings for this API
    // types: textarea, select (dropdown), range (slider), checkbox
    static API_SETTINGS = {
        model: {
            title: "Model",
            description: "The model that will complete your prompt. This parameter controls which version of Claude answers your request.",
            type: "select", default: "claude-v1.2", choices: [
                "claude-2",
                "claude-v1",
                "claude-v1-100k",
                "claude-instant-v1",
                "claude-instant-v1-100k",
                "claude-2.1",
                "claude-2.0",
                "claude-v1.3",
                "claude-v1.3-100k",
                "claude-v1.2",
                "claude-v1.0",
                "claude-instant-v1.1",
                "claude-instant-v1.1-100k",
                "claude-instant-v1.0" 
            ]
        },

        max_tokens_to_sample: {
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
        },

        stop_sequences: {
            title: "Stop Sequences",
            description: "Sequences that will cause the model to stop generating completion text.",
            type: "list", limit: -1, default: [],
        },

        human_prefix: {
            title: "Human Prefix",
            description: "Replaces the \"Human\" prefix identifier in prompts.",
            type: "text", default: "Human",
        },
        
        assistant_prefix: {
            title: "Assistant Prefix",
            description: "Replaces the \"Assistant\" prefix identifier in prompts.",
            type: "text", default: "Assistant",
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
                'model': 'claude-2',
                'stream': false,
                'max_tokens_to_sample': 1,
                'prompt': '\n\nHuman: Hello, world!\n\nAssistant:'
            })
        }
        if( settings.api_url ){
            return OpenAI.getStatus( settings )
        }else{
            const url = "https://api.anthropic.com"
            return await fetch( url + "/v1/complete", options ).then((response) => {
                return response.ok || response.status === 429
            })
        }
    }

    static makePrompt( character, messages, user, settings, offset = 0 ){
        const list = Utils.makePrompt( Tokenizer, character, messages, user, settings, offset )
        let prompt = Utils.messagesToString( list, character, user, settings )
        if( !prompt.includes("Assistant:")){
            prompt += "\n\nAssistant:"
        }
        return prompt
    }

    static getTokenConsumption( character, user, settings ){
        return Utils.getTokenConsumption( Tokenizer, character, user, settings )
    }

    static async generate(character, prompt, user, settings){
        let outgoing_data = {
            model: settings.model,
            prompt: prompt,
            stop_sequences: Utils.sanitizeStopSequences(settings.stop_sequences, user, character),
            max_tokens_to_sample: parseInt(settings.max_tokens_to_sample),
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
        // console.debug(`Sending prompt to ${outgoing_data.model}...`)
        
        const url = settings.api_url ? settings.api_url : "https://api.anthropic.com/"
        return fetch( url + "/v1/complete", options )
    }

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
                        text: incoming_json.completion,
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
    
        const raw_text = this.__message_chunk + incoming_data
        const lines = raw_text.replace(/data: /gm, '\n').split('\n').filter(line => line.trim() !== '');
        for( const line of lines ){
            if(!line){
                continue;
            }

            let obj = line.replace(/data: /gm, '').replace(/event: completion/gm, '')

            if (obj === '[DONE]') {
                message.done = true;
                break;
            }

            if( obj.startsWith(":") ){
                continue
            }

            if( !obj || obj === ""){
                continue
            }

            try {
                const parsed = JSON.parse(obj);
                const text = parsed.completion;
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

export default Anthropic