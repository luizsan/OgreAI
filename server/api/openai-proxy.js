import { default as fallback } from "./openai.js"

class OpenAIProxy{

    static API_NAME = "OpenAI Proxy"
    static API_SETTINGS = {
        password: {
            title: "Password",
            description: "",
            type: "text", default: ""
        },

        model: {
            title: "Model",
            description: "The OpenAI API is powered by a diverse set of models with different capabilities and price points.",
            type: "select", default: "gpt-3.5-turbo", choices: [ "gpt-3.5-turbo", "gpt-4", "gpt-4-32k" ]
        },

        max_length: {
            title: "Max Length",
            description: "Number of tokens to generate in a reply. A higher amount of tokens takes longer to generate.",
            type: "range", default: 128, min: 8, max: 512, step: 8,
        },  
        
        context_size: {
            title: "Context Size",
            description: "Number of context tokens to submit to the AI for sampling. Make sure this is higher than Output Length. Higher values increase VRAM/RAM usage.",
            type: "range", default: 1024, min: 128, max: 4096, step: 8,
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
        }
    }

    static #__message_chunk = "";

    static async getStatus(settings){
        const options = { method: "GET", headers:{ "Authorization":"Bearer " + settings.password }}
        return await fetch( settings.api_target + "/v1/models", options ).then((response) => response.ok)
    }

    static makePrompt( character, messages, user, settings, offset = 0 ){
        return fallback.makePrompt( character, messages, user, settings, offset )
    }

    static getTokenConsumption( character, user, settings ){
        return fallback.getTokenConsumption( character, user, settings )
    }

    static async generate(prompt, user, settings){
        let outgoing_data = {
            model: settings.model,
            messages: prompt,
            stop: [ "{{user}}:", user + ":" ],
            max_tokens: parseInt(settings.max_length),
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
                'Authorization': 'Bearer ' + settings.password,
            },
            body: JSON.stringify(outgoing_data)
        }
    
        console.debug(`Sending prompt to ${outgoing_data.model}...`)
        console.debug(prompt)
        return fetch( settings.api_target + "/v1/chat/completions", options )
    }

    static receiveData( incoming_data, swipe = false ){
        return fallback.receiveData( incoming_data, swipe )
    }
    
    static receiveStream( incoming_data, swipe ){
        return fallback.receiveStream( incoming_data, swipe )
    }
}

export default OpenAIProxy