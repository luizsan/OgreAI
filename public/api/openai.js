class OpenAI{

    // display name
    static API_NAME = "OpenAI (Chat)"

    // settings for this API
    // types: textarea, select (dropdown), range (slider), checkbox
    static API_SETTINGS = {
        model: {
            title: "Model",
            description: "The OpenAI API is powered by a diverse set of models with different capabilities and price points.",
            type: "select", default: "gpt-3.5-turbo", choices: [ "gpt-3.5-turbo", "gpt-3.5-turbo-0301", "gpt-4", "gpt-4-0314", "gpt-4-32k", "gpt-4-32k-0314" ]
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
            type: "range", default: 0, min: 0, max: 2, step: 0.01,
        },
        
        presence_penalty: {
            title: "Presence Penalty",
            description: "How much to penalize new tokens based on whether they appear in the text so far. Increases the model's likelihood to talk about new topics.",
            type: "range", default: 0, min: 0, max: 2, step: 0.01,
        },
        
        base_prompt: {
            title: "Base Prompt",
            description: "Used to give basic instructions to the model on how to behave in the chat.",
            type: "textarea", default: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write only one reply, with 1 to 4 paragraphs. Use markdown to italicize actions, and avoid quotation marks. Be proactive, creative, and drive the plot and conversation forward. Always stay in character and avoid repetition.",
            advanced: true,
        },

        stream: {
            title: "Stream",
            description: "Whether to stream back partial progress. If set, tokens will be sent as data-only server-sent events as they become available.",
            type: "checkbox", default: false,
            advanced: true,
        },

        top_p: {
            title: "top_p",
            description: "Used to discard unlikely text in the sampling process. Lower values will make the output more predictable, but also repetitive. Put this value on 1 to disable its effect.",
            type: "range", default: 0.9, min: 0, max: 1, step: 0.01,
            advanced: true,
        }
    }

    // private variable to store incomplete messages
    static #__message_chunk = "";

    // getStatus must return a boolean
    static async getStatus(key){
        const options = { method: "GET", headers:{ "Authorization":"Bearer " + key }}
        return await fetch( "https://api.openai.com/v1/models", options ).then((response) => response.ok)
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

        let token_count_system = getTokens(_system).length;
        let token_count_messages = 0

        if( messages ){
            for( let i = messages.length - 1 - Math.abs(offset); i >= 0; i -= 1 ){
                let role = messages[i].participant > -1 ? "assistant" : "user";
                let content = messages[i].candidates[ messages[i].index ].text
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
    static getTokenConsumption( character, user ){
        let _system = settings.base_prompt + "\n\n"
        _system = parseNames( _system, user, character.name )

        let _description = `{Description:} ${character.description.trim()}\n`
        _description = parseNames( _description, user, character.name )
        
        let _personality = ""
        if(character.personality)
            _personality += `{Personality:} ${character.personality.trim()}\n`
            _personality = parseNames( _personality, user, character.name )
        
        let _scenario = ""
        if(character.scenario)
            _scenario += `{Scenario:} ${character.scenario.trim()}\n`
            _scenario = parseNames( _scenario, user, character.name )

        let _dialogue = ""
        if(character.dialogue)
            _dialogue += `{Example dialogue:} ${character.dialogue.trim()}\n`
            _dialogue = parseNames( _dialogue, user, character.name )

        return {
            system: getTokens(_system).length,
            description: getTokens(_description).length,
            personality: getTokens(_personality).length,
            scenario: getTokens(_scenario).length,
            dialogue: getTokens(_dialogue).length,
        }
    }

    // returns an output from the prompt that will be fed into receiveData
    static generate(prompt, settings, swipe = false){
        let outgoing_data = {
            model: "gpt-3.5-turbo-0301",
            messages: prompt,
            // stop: [],
            max_tokens: settings.max_length,
            frequency_penalty: settings.frequency_penalty,
            presence_penalty: settings.presence_penalty,
            temperature: settings.temperature,
            top_p: settings.top_p,
            stream: false,
        };
    
        let json_data = JSON.stringify(outgoing_data)
        let buffer_length = Buffer.byteLength( json_data );
    
        let options = {
            method: "POST",
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': buffer_length,
                'Authorization': 'Bearer ' + settings.api_target,
            },
        }
    
        try{
            console.debug("Sending prompt %o", outgoing_data)
            const req = https.request( "https://api.openai.com/v1/chat/completions", options, (response) => {
                response.setEncoding("utf8")
                response.on("data", (incoming_data) => {
                    this.receiveData(incoming_data, swipe)
                })
                
            });
    
            req.on("timeout", () => {
                console.warn("Request timed out!")
                req.destroy();
            })

            req.on("error", (error) => {
                console.error(error)
            });
    
            req.write( json_data );
            req.end();
    
        }catch(error){
            console.error(error)
        }
    }

    // processes the model's output
    static receiveData( incoming_data, swipe ){
        console.debug(`Raw generated ${swipe ? "swipe" : "message"}:\n${incoming_data}`)
        let incoming_json = ""
        try{
            incoming_json = JSON.parse(this.#__message_chunk + incoming_data);
            let message = {
                participant: 0,
                candidate: {
                    timestamp: Date.now(),
                    text: incoming_json.choices[0].message.content
                }
            }
            let event = new CustomEvent( "message", { detail: { message: message, swipe: swipe }})
            document.dispatchEvent(event)

        }catch(error){
            if(error instanceof SyntaxError){
                // catch incomplete json responses
                this.#__message_chunk += incoming_data
                return
            }else{
                console.error(error)
            }
        }

        this.__message_chunk = ""
    }
}

export default OpenAI