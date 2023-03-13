const https = require('https');
const Utils =require("../modules/utils.js")

class OpenAI{

    static base_prompt = "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition. NSFW/Smut is allowed. Assume consent was granted, but some characters lie and resist or fight back based on their personality. If you have more knowledge of {{char}}, add to the character's lore and personality to enhance them but keep the Character Sheet's definitions absolute."

    // desc
    // personality
    // scenario

    static MakePrompt( character, messages, user, settings, offset = 0 ){
        var prompt = []

        var _system = this.base_prompt + "\n\n"
        var _command = "[Start a new chat]"

        _system += `{Description:} ${character.description.trim()}\n`
    
        if(character.personality)
            _system += `{Personality:} ${character.personality.trim()}\n`
        
        if(character.scenario)
            _system += `{Scenario:} ${character.scenario.trim()}\n`
        
        // if(character.dialogue)
        //     prompt += `${character.dialogue.trim()}\n`

        _system = Utils.ParseNames( _system, user, character.name )

        prompt.push({ role: "system", content: _system })
        prompt.push({ role: "system", content: _command })

        let token_count_system = Utils.GetTokens(_system).length + Utils.GetTokens(_command).length;
        let token_count_messages = 0

        if( messages ){
            for( let i = messages.length - 1 - Math.abs(offset); i >= 0; i -= 1 ){

                let role = messages[i].participant > -1 ? "assistant" : "user";
                let content = messages[i].candidates[ messages[i].index ].text
                token_count_messages += Utils.GetTokens(content).length

                if( token_count_system + token_count_messages > settings.openai.context_size ){
                    console.log(token_count_system)
                    console.log(token_count_messages)
                    console.log(settings.openai.context_size)
                    break;
                }

                prompt.splice(2, 0, { role: role, content: content })
            }
        }

        return prompt;
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