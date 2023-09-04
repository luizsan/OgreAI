export function parseNames(text, user, bot){
    if(!text) return text;
    text = text.replaceAll(/(\[NAME_IN_MESSAGE_REDACTED\])/gmi, user)
    text = text.replaceAll(/{{user}}/gmi, user)
    text = text.replaceAll(/<user>/gmi, user)
    text = text.replaceAll(/{{char}}/gmi, bot)
    text = text.replaceAll(/<bot>/gmi, bot)
    return text
}

export function makePrompt( tokenizer, character, messages, user, settings, offset = 0 ){
    let prompt = []

    let main_prompt = settings.base_prompt ?? ""
    if( character.data.system_prompt ){
        main_prompt = character.data.system_prompt.replaceAll(/{{original}}/gmi, settings.base_prompt)
    }

    let sub_prompt = settings.sub_prompt ?? ""
    if( character.data.post_history_instructions ){
        sub_prompt = character.data.post_history_instructions.replaceAll(/{{original}}/gmi, settings.sub_prompt)
    }

    let prefill_prompt = settings.prefill_prompt ?? ""

    var _system = main_prompt + "\n\n"
    _system += `{Description:} ${character.data.description.trim()}\n`

    if(character.data.personality){
        _system += `{Personality:} ${character.data.personality.trim()}\n`
    }
    
    if(character.data.scenario){
        _system += `{Scenario:} ${character.data.scenario.trim()}\n`
    }
    
    if(character.data.mes_example){
        _system += `{Example dialogue:} ${character.data.mes_example.trim()}\n`
    }

    _system = parseNames( _system, user, character.data.name )
    prompt.push({ role: "system", content: _system })

    sub_prompt = sub_prompt ? "\n\n" + sub_prompt : ""
    sub_prompt = parseNames( sub_prompt, user, character.data.name )
    
    prefill_prompt = prefill_prompt ? "\n\n" + prefill_prompt : ""
    prefill_prompt = parseNames( prefill_prompt, user, character.data.name )

    let sub_tokens = tokenizer.getTokens( sub_prompt ).length;
    let prefill_tokens = tokenizer.getTokens( prefill_prompt ).length;
    let injected_sub_prompt = false;
    let injected_prefill_prompt = false;

    let token_count_system = tokenizer.getTokens(_system).length + sub_tokens + prefill_tokens;
    let token_count_messages = 0
    
    if( messages ){
        for( let i = messages.length - 1 - Math.abs(offset); i >= 0; i--){
            let role = messages[i].participant > -1 ? "assistant" : "user";
            let index = messages[i].index
            let content = messages[i].candidates[ index ].text
            content = parseNames(content, user, character.data.name )
            
            if( role === "user" && !injected_sub_prompt ){
                content += sub_prompt;
                injected_sub_prompt = true;
            }

            if( !injected_prefill_prompt ){
                content += prefill_prompt;
                injected_prefill_prompt = true;
            }

            let next_tokens = tokenizer.getTokens(content).length
            if( token_count_system + token_count_messages + next_tokens > settings.context_size ){
                break;
            }

            token_count_messages += next_tokens
            prompt.splice(1, 0, { role: role, content: content })
        }
    }
    
    return prompt;
}

export function messagesToString(messages, character, user, settings, separator = "\n\n") {
    let human_prefix = settings.human_prefix ? settings.human_prefix : "{{user}}"
    let assistant_prefix = settings.assistant_prefix ? settings.assistant_prefix : "{{char}}"

    human_prefix = parseNames( human_prefix, user, character.data.name )
    assistant_prefix = parseNames( assistant_prefix, user, character.data.name )

    let str = messages.map((msg) => {
        switch (msg.role) {
            case "assistant":
                return `${assistant_prefix}: ${msg.content}`;

            case "user":
                return `${human_prefix}: ${msg.content}`;

            case "system":
                // leave control to main prompt
                return msg.content 

            default:
                return
        }
    }).join(separator);

    return str;
}

export function getTokenConsumption( tokenizer, character, user, settings ){
    let main_prompt = settings.base_prompt ?? ""
    if( character.data.system_prompt ){
        main_prompt = character.data.system_prompt.replaceAll(/{{original}}/gmi, settings.base_prompt)
    }

    let sub_prompt = settings.sub_prompt ?? ""
    if( character.data.post_history_instructions ){
        sub_prompt = character.data.post_history_instructions.replaceAll(/{{original}}/gmi, settings.sub_prompt)
    }

    let _system = main_prompt;

    if( sub_prompt ){
        _system += "\n\n" + sub_prompt;
    }

    _system = parseNames( _system, user, character.data.name )

    let _description = ""
    if(character.data.description){
        _description += `{Description:} ${character.data.description.trim()}\n`
        _description = parseNames( _description, user, character.data.name )
    }
    
    let _personality = ""
    if(character.data.personality){
        _personality += `{Personality:} ${character.data.personality.trim()}\n`
        _personality = parseNames( _personality, user, character.data.name )
    }
    
    let _scenario = ""
    if(character.data.scenario){
        _scenario += `{Scenario:} ${character.data.scenario.trim()}\n`
        _scenario = parseNames( _scenario, user, character.data.name )
    }

    let _dialogue = ""
    if(character.data.mes_example){
        _dialogue += `{Example dialogue:} ${character.data.mes_example.trim()}\n`
        _dialogue = parseNames( _dialogue, user, character.data.name )
    }

    return {
        system: tokenizer.getTokens(_system).length,
        description: tokenizer.getTokens(_description).length,
        personality: tokenizer.getTokens(_personality).length,
        scenario: tokenizer.getTokens(_scenario).length,
        dialogue: tokenizer.getTokens(_dialogue).length,
    }
}

export function sanitizeStopSequences(list, user, character){
    if(!Array.isArray(list)){
        list = []
    }

    for(let i = 0; i < list.length; i++){
        list[i] = parseNames( list[i], user, character.data.name )
    }

    return list
}

export default { 
    parseNames, 
    makePrompt, 
    getTokenConsumption, 
    messagesToString, 
    sanitizeStopSequences 
};
