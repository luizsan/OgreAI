const https = require('https');
const Utils =require("../modules/utils.js")

class OpenAI{
    
    static GetStatus(key){
        var options = {
            headers: { 'Authorization': 'Bearer ' + key }
        }

        try{
            https.get("https://api.openai.com/v1/models/gpt-3.5-turbo-0301", options, (response) => {
                let params = { code: response.statusCode }
                let event = new CustomEvent("server_status", { detail: params })
                document.dispatchEvent(event)
                
            }).on("error", (error) => {
                ipcRenderer.send("Request Error!", { 
                    title: "Network Error!", 
                    message: error.message 
                })
                
                let params = { code: -1 }
                let event = new CustomEvent("server_status", { detail: params })
                document.dispatchEvent(event)
            })
            
        }catch( error ){
            ipcRenderer.send("show_error", { 
                title: "Network Error!", 
                message: error.message 
            })

            let params = { code: -1 }
            let event = new CustomEvent("server_status", { detail: params })
            document.dispatchEvent(event)
        }
    }

    static MakePrompt( character, messages, user, settings, offset = 0 ){
        var prompt = []

        var _system = settings.openai.base_prompt + "\n\n"
        // var _command = "[Start a new chat]"

        _system += `{Description:} ${character.description.trim()}\n`
    
        if(character.personality)
            _system += `{Personality:} ${character.personality.trim()}\n`
        
        if(character.scenario)
            _system += `{Scenario:} ${character.scenario.trim()}\n`
        
        // if(character.dialogue)
        //     prompt += `${character.dialogue.trim()}\n`

        _system = Utils.ParseNames( _system, user, character.name )

        prompt.push({ role: "system", content: _system })
        // prompt.push({ role: "system", content: _command })

        let token_count_system = Utils.GetTokens(_system).length;// + Utils.GetTokens(_command).length;
        let token_count_messages = 0

        if( messages ){
            for( let i = messages.length - 1 - Math.abs(offset); i >= 0; i -= 1 ){

                let role = messages[i].participant > -1 ? "assistant" : "user";
                let content = messages[i].candidates[ messages[i].index ].text
                let next_tokens = Utils.GetTokens(content).length

                if( token_count_system + token_count_messages + next_tokens > settings.openai.context_size ){
                    break;
                }

                token_count_messages += next_tokens
                prompt.splice(1, 0, { role: role, content: content })
            }
        }

        return prompt;
    }

    static GetTokenConsumption( character, user ){
        let _system = this.base_prompt + "\n\n"
        // let _command = "[Start a new chat]"

        _system = Utils.ParseNames( _system, user, character.name )

        let _description = `{Description:} ${character.description.trim()}\n`
        
        let _personality = ""
        if(character.personality)
        _personality += `{Personality:} ${character.personality.trim()}\n`
        
        let _scenario = ""
        if(character.scenario)
            _scenario += `{Scenario:} ${character.scenario.trim()}\n`

        let token_system = Utils.GetTokens(_system).length;// + Utils.GetTokens(_command).length
        let token_description = Utils.GetTokens(_description).length
        let token_personality = Utils.GetTokens(_personality).length
        let token_scenario = Utils.GetTokens(_scenario).length

        return {
            total: token_system + token_description + token_personality + token_scenario,
            system: token_system,
            description: token_description,
            personality: token_personality,
            scenario: token_scenario,
        }
    }

    static Generate(prompt, settings, swipe = false){
        let outgoing_data = {
            model: "gpt-3.5-turbo-0301",
            messages: prompt,
            // stop: [],
            max_tokens: settings.openai.max_length,
            frequency_penalty: settings.openai.frequency_penalty,
            presence_penalty: settings.openai.presence_penalty,
            temperature: settings.openai.temperature,
            top_p: settings.openai.top_p,
            stream: false,
        };
    
        let json_data = JSON.stringify(outgoing_data)
        let buffer_length = Buffer.byteLength( json_data );
    
        let options = {
            method: "POST",
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
                    this.ReceiveData(incoming_data, swipe)
                })
                
            });
    
            req.on("error", (_error) => {
                ipcRenderer.send("show_error", {
                    title: "Could not complete the request!",
                    message: "Something went wrong while sending your message.\nCheck your API connectivity and try again."
                });
                ToggleSendButton(true);
            });
    
            req.write( json_data );
            req.end();
    
        }catch( error ){
            ipcRenderer.send("show_error", { 
                title: "Network Error!", 
                message: error.message 
            });
            document.dispatchEvent(new Event("message"));
        }
    }

    static ReceiveData(incoming_data, swipe){
        console.debug(`Raw generated ${swipe ? "swipe" : "message"}:\n${incoming_data}`)
        let incoming_json = JSON.parse(incoming_data);

        try{
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
            console.error(incoming_json)
            ipcRenderer.send("show_error", { 
                title: incoming_json.error.type, 
                message: incoming_json.error.message 
            });
            document.dispatchEvent(new Event("message"));
        }
    }
}

exports.OpenAI = OpenAI