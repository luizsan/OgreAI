const http = require('http');
const https = require('https');
const Utils =require("../modules/utils.js")

class Pygmalion{

    static __message_chunk = "";
    static __message_cutoff = /\n.*\:/i

    static MakePrompt( character, messages, user, settings, offset = 0 ){
        var prompt = ""
        prompt += `${character.name}'s Persona: ${character.description.trim()}\n`
    
        if(character.personality)
            prompt += `Personality: ${character.personality.trim()}\n`
        
        if(character.scenario)
            prompt += `Scenario: ${character.scenario.trim()}\n`
        
        if(character.dialogue)
            prompt += `${character.dialogue.trim()}\n`
    
        prompt += "<START>\n"

        prompt = Utils.ParseNames( prompt, user, character.name )

        let ending = character.name + ":"
        let token_count_prompt = Utils.GetTokens(prompt).length;
        let token_count_ending = Utils.GetTokens(ending).length;
    
        if( messages ){
            let msg_section = "";
    
            for( let i = messages.length - 1 - Math.abs(offset); i >= 0; i -= 1 ){
                let prefix = messages[i].participant > -1 ? character.name : "You";
                let candidate = messages[i].candidates[ messages[i].index ].text
                
                let msg = `${prefix}: ${candidate}\n`
                let token_count_messages = Utils.GetTokens(msg_section).length
                let token_count_line = Utils.GetTokens(msg).length
                if( token_count_prompt + token_count_messages + token_count_line + token_count_ending > settings.pygmalion.context_size ){
                    break;
                }
                msg_section = msg + msg_section
            }
            prompt += msg_section
        }
    
        prompt += ending;
        return prompt;
    }


    static Generate(prompt, settings, swipe = false){
        let url = settings.api_target;
        url = url.replaceAll("localhost", "127.0.0.1");
    
        let protocol = http;
        if(url.startsWith("https")){
            protocol = https;
        }
    
        let final_token_count = Utils.GetTokens(prompt).length;
        if( final_token_count > settings.pygmalion.context_size ){
            console.warn(`Attempting to make a prompt with ${final_token_count} tokens, which is ${final_token_count - settings.pygmalion.context_size} more than the ${settings.context_size} allowed!`)
        }
    
        let outgoing_data = {
            prompt: prompt,
            max_context_length: settings.pygmalion.context_size,
            max_length: settings.pygmalion.max_length,
            rep_pen: settings.pygmalion.repetition_penalty,
            rep_pen_range: settings.pygmalion.penalty_range,
            rep_pen_slope: settings.pygmalion.repetition_slope,
            temperature: settings.pygmalion.temperature,
            tfs: 0.9,
            top_a: 0,
            top_k: settings.pygmalion.top_k,
            top_p: settings.pygmalion.top_p,
            typical: settings.pygmalion.typical_p,
            sampler_order: [ 6, 0, 1, 2, 3, 4, 5 ]
        };
    
        let json_data = JSON.stringify(outgoing_data)
        let buffer_length = Buffer.byteLength( json_data );
    
        let options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': buffer_length,
            },
        }
    
        try{
            console.debug("Sending prompt %o", outgoing_data)
            const req = protocol.request(url + "/v1/generate", options, (response) => {
                response.setEncoding("utf8")
                response.on("data", (incoming_data) => {
                    this.ReceiveData(incoming_data, outgoing_data, settings, swipe)
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

    static ReceiveData(incoming_data, outgoing_data, settings, swipe){
        console.debug(`Raw generated ${swipe ? "swipe" : "message"}:\n${incoming_data}`)
        let incoming_json = JSON.parse(incoming_data);

        if(incoming_json.results){
            let text_content = incoming_json.results[0].text;

            let cut = text_content.search(this.__message_cutoff)
            if( cut > -1 ){
                text_content = text_content.slice(0, cut)
                if(this.__message_chunk.length < 1){
                    text_content = text_content.trim()
                }
                this.__message_chunk += text_content;
                document.dispatchEvent(new CustomEvent("message", { 
                    detail: { 
                        message: {
                            "participant": 0, 
                            "candidate":{ 
                                "timestamp": Date.now(), 
                                "text": this.__message_chunk 
                            }
                        },
                        swipe: swipe
                    }}));
                    this.__message_chunk = "";
            }else{
                this.__message_chunk += text_content;
                outgoing_data.prompt += this.__message_chunk;
                this.Generate(outgoing_data.prompt, settings, swipe)
            }

        }else if(incoming_json.detail){
            if( error_message[incoming_json.detail] ){
                ipcRenderer.send("show_error", error_message[incoming_json.detail] )
            }else{
                ipcRenderer.send("show_error", { 
                    title: incoming_json.detail.type, 
                    message: incoming_json.detail.msg
                })
            }
            document.dispatchEvent(new Event("message"));
        }
    }
}

exports.Pygmalion = Pygmalion