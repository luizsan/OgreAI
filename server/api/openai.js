// required for calculating tokens correctly
import { getTokens, parseNames } from "../lib/utils.js"

class OpenAI{

    // display name
    static API_NAME = "OpenAI"

    // settings for this API
    // types: textarea, select (dropdown), range (slider), checkbox
    static API_SETTINGS = {
        model: {
            title: "Model",
            description: "The OpenAI API is powered by a diverse set of models with different capabilities and price points.",
            type: "select", default: "gpt-3.5-turbo", choices: [ "gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4", "gpt-4-32k" ]
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

    // private variable to store incomplete messages
    static #__message_chunk = "";

    // getStatus must return a boolean
    static async getStatus(settings){
        const options = { method: "GET", headers:{ "Authorization":"Bearer " + settings.api_auth }}
        const url = settings.api_url ? settings.api_url : "https://api.openai.com/"
        return await fetch( url + "/v1/models", options ).then((response) => response.ok)
    }

    // returns an array of objects in this case but can anything that the model accepts as a prompt
    static makePrompt( character, messages, user, settings, offset = 0 ){
        var prompt = []

        var _system = settings.base_prompt + "\n\n"
        _system += `{Description:} ${character.description.trim()}\n`
    
        if(character.personality)
            _system += `{Personality:} ${character.personality.trim()}\n`
        
        if(character.scenario)
            _system += `{Scenario:} ${character.scenario.trim()}\n`
        
        if(character.dialogue)
            _system += `{Example dialogue:} ${character.dialogue.trim()}\n`

        _system = parseNames( _system, user, character.name )
        prompt.push({ role: "system", content: _system })

        let sub_prompt = settings.sub_prompt ? "\n\n" + settings.sub_prompt : ""
        sub_prompt = parseNames( sub_prompt, user, character.name )
        
        let sub_tokens = settings.sub_prompt ? getTokens( sub_prompt ).length : 0;
        let token_count_system = getTokens(_system).length + sub_tokens;
        let token_count_messages = 0
        let injected_sub_prompt = false;

        if( messages ){
            for( let i = messages.length - 1 - Math.abs(offset); i >= 0; i--){
                let role = messages[i].participant > -1 ? "assistant" : "user";
                let index = messages[i].index
                let content = messages[i].candidates[ index ].text
                content = parseNames(content, user, character.name )
                
                if( role == "user" && !injected_sub_prompt ){
                    content += sub_prompt;
                    injected_sub_prompt = true;
                }

                let next_tokens = getTokens(content).length
                if( token_count_system + token_count_messages + next_tokens > settings.context_size ){
                    break;
                }

                token_count_messages += next_tokens
                prompt.splice(1, 0, { role: role, content: content })
            }
        }
        
        return prompt;
    }

    // returns an object with the token breakdown for a character
    static getTokenConsumption( character, user, settings ){
        let _system = settings.base_prompt;
        if( settings.sub_prompt ){
            _system += "\n\n" + settings.sub_prompt;
        }

        _system = parseNames( _system, user, character.name )

        let _description = ""
        if(character.description){
            _description += `{Description:} ${character.description.trim()}\n`
            _description = parseNames( _description, user, character.name )
        }
        
        let _personality = ""
        if(character.personality){
            _personality += `{Personality:} ${character.personality.trim()}\n`
            _personality = parseNames( _personality, user, character.name )
        }
        
        let _scenario = ""
        if(character.scenario){
            _scenario += `{Scenario:} ${character.scenario.trim()}\n`
            _scenario = parseNames( _scenario, user, character.name )
        }

        let _dialogue = ""
        if(character.dialogue){
            _dialogue += `{Example dialogue:} ${character.dialogue.trim()}\n`
            _dialogue = parseNames( _dialogue, user, character.name )
        }

        return {
            system: getTokens(_system).length,
            description: getTokens(_description).length,
            personality: getTokens(_personality).length,
            scenario: getTokens(_scenario).length,
            dialogue: getTokens(_dialogue).length,
        }
    }

    // returns an output from the prompt that will be fed into receiveData
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
                'Authorization': 'Bearer ' + settings.api_auth,
            },
            body: JSON.stringify(outgoing_data)
        }
    
        // console.debug("Sending prompt %o", outgoing_data)
        console.debug(`Sending prompt to ${outgoing_data.model}...`)
        

        const url = settings.api_url ? settings.api_url : "https://api.openai.com/"
        return fetch( url + "/v1/chat/completions", options )
    }

    // processes a single message from the model's output
    // - participant: 0
    // - candidate: { text, timestamp }
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
    // - streaming: { text, timestamp }
    static receiveStream( incoming_data, swipe ){
        let message = {
            done: false,
            participant: 0,
            swipe: swipe,
            streaming: {
                text: "",
                timestamp: Date.now()
            }
        }
    
        const lines = incoming_data.split('\n').filter(line => line.trim() !== '');
        for( const line of lines ){
            const obj = line.replace(/^data: /, '');
            if (obj === '[DONE]') {
                message.done = true;
                break;
            }

            try {
                const parsed = JSON.parse(obj);
                const text = parsed.choices[0].delta.content;
                if( text ){
                    message.streaming.text += text;
                }
            }catch{
                // console.log(obj)
                // console.error(error);
            }
        }

        return message;
    }
}

export default OpenAI