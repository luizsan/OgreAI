// required for calculating tokens correctly
import OpenAI from "../api/openai.js"

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
            type: "range", default: 256, min: 8, max: 1024, step: 8,
        }, 

        context_size: {
            title: "Context Size",
            description: "Number of context tokens to submit to the AI for sampling.",
            type: "range", default: 200000, min: 120, max: 200000, step: 10,
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

        stream: {
            title: "Stream",
            description: "Whether to stream back partial progress. If set, tokens will be sent as data-only server-sent events as they become available.",
            type: "checkbox", default: true,
        },
    }


    // private variable to store incomplete messages
    static #__message_chunk = "";

    // Prompt Conversion script taken from RisuAI by @kwaroran (GPLv3).
    static convertClaudePrompt(messages, addHumanPrefix, addAssistantPostfix) {
        // Claude doesn't support message names, so we'll just add them to the message content.
        for (const message of messages) {
            if (message.name && message.role !== "system") {
                message.content = message.name + ": " + message.content;
                delete message.name;
            }
        }

        let requestPrompt = messages.map((v) => {
            let prefix = '';
            switch (v.role) {
                case "assistant":
                    prefix = "\n\nAssistant: ";
                    break
                case "user":
                    prefix = "\n\nHuman: ";
                    break
                case "system":
                    // According to the Claude docs, H: and A: should be used for example conversations.
                    if (v.name === "example_assistant") {
                        prefix = "\n\nA: ";
                    } else if (v.name === "example_user") {
                        prefix = "\n\nH: ";
                    } else {
                        prefix = "\n\nSystem: ";
                    }
                    break
            }
            return prefix + v.content;
        }).join('');

        if (addHumanPrefix) {
            requestPrompt = "\n\nHuman: " + requestPrompt;
        }

        if (addAssistantPostfix) {
            requestPrompt = requestPrompt + '\n\nAssistant: ';
        }

        return requestPrompt;
    }

    // getStatus must return a boolean
    static async getStatus(settings){
        return OpenAI.getStatus( settings )
    }

    static makePrompt( character, messages, user, settings, offset = 0 ){
        return OpenAI.makePrompt( character, messages, user, settings, offset )
    }

    static getTokenConsumption( character, user, settings ){
        return OpenAI.getTokenConsumption( character, user, settings )
    }

    static async generate(prompt, user, settings){
        let outgoing_data = {
            model: settings.model,
            prompt: this.convertClaudePrompt(prompt, true, true),
            stop_sequences: [],
            max_tokens_to_sample: parseInt(settings.max_tokens_to_sample),
            temperature: parseFloat(settings.temperature),
            top_p: parseFloat(settings.top_p),
            top_k: parseFloat(settings.top_k),
            stream: settings.stream,
        };
    
        let options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
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

    static receiveStream( incoming_data, swipe, replace = true ){
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
    
        const lines = incoming_data.split('\n').filter(line => line.trim() !== '');
        for( const line of lines ){
            const obj = line.replace(/^data: /, '');
            if (obj === '[DONE]') {
                message.done = true;
                message.replace = false;
                break;
            }

            if( obj.startsWith(":") ){
                continue
            }

            try {
                const parsed = JSON.parse(obj);
                const text = parsed.completion;
                message.streaming.model = parsed.model || undefined
                if( text ){
                    message.streaming.text = text;
                }
            }catch(error){
                console.log(obj)
                console.error(error);
            }
        }

        return message;
    }
}

export default Anthropic