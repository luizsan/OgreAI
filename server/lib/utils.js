export function parseNames(text, user, bot){
    if(!text) return text;
    text = text.replaceAll(/(\[NAME_IN_MESSAGE_REDACTED\])/gmi, user)
    text = text.replaceAll(/{{user}}/gmi, user)
    text = text.replaceAll(/<user>/gmi, user)
    text = text.replaceAll(/{{char}}/gmi, bot)
    text = text.replaceAll(/<bot>/gmi, bot)
    return text
}

export function getPromptField( key, settings ){
    const item = settings.prompt.find((item) => item.key === key )
    return item?.content ?? ""
}

export function getFieldEnabled( key, settings ){
    const item = settings.prompt.find((item) => item.key === key )
    return item?.enabled ?? false
}

export function getMainPrompt( character, settings ){
    let result = getPromptField( "base_prompt", settings )
    if( character.data.system_prompt ){
        const override = character.data.system_prompt.replaceAll(/{{original}}/gmi, result)
        result = override
    }
    result = result.trim()
    return result
}

export function getSubPrompt( character, settings ){
    let result = getPromptField( "sub_prompt", settings )
    if( character.data.post_history_instructions ){
        const override = character.data.post_history_instructions.replaceAll(/{{original}}/gmi, result)
        result = override
    }
    result = result.trim()
    return result
}

export function getPrefillPrompt( settings ){
    let result = getPromptField( "prefill_prompt", settings )
    result = result.trim()
    return result
}

export function getPersona( user ){
    return user?.persona ?? ""
}

export function getCharacterProperty( key, character, settings ){
    let result = ""
    if( character.data[key] ){
        let prompt = getPromptField( key, settings )
        if( prompt ){
            result = prompt
            if( result.includes( "{{original}}" )){
                result = result.replaceAll(/{{original}}/gmi, character.data[key] )
            }else{
                result += "\n\n" + character.data[key]
            }
        }else{
            result = character.data[key]
        }
    }
    result = result.trim()
    return result
}

export function getSystemPrompt( tokenizer, content ){
    let list = []
    let result = ""
    const skip = [ "messages", "sub_prompt", "prefill_prompt" ]

    content.settings.prompt.forEach((item) => {
        if( !item.key ) return
        if( skip.includes( item.key )) return

        // non-toggleable items don't carry the enable field
        if( item.enabled !== undefined && item.enabled === false ) return

        switch(item.key){
            case "base_prompt":
                list.push( getMainPrompt(content.character, content.settings) )
                break;
            case "persona":
                list.push( getPersona(content.user) )
                break;
            case "world_info":
                list.push( getGlobalLoreEntries( tokenizer, content ) )
                break;
            case "character_book":
                list.push( getEntriesFromBook(tokenizer, content.books.character, content ) )
                break;
            default:
                list.push( getCharacterProperty(item.key, content.character, content.settings) )
                break;
        }

        console.log("Added " + item.key)
    })
    
    list = list.filter((e) => e && e.length > 0)
    result = list.join("\n\n")
    result = parseNames( result, content.user.name, content.character.data.name )

    return result
}

export function makePrompt( tokenizer, content, offset = 0 ){
    const character = content.character;
    const messages = content.chat.messages;
    const user = content.user;
    const settings = content.settings;

    let prompt = []

    let system = getSystemPrompt(tokenizer, content)
    prompt.push({ role: "system", content: system })

    let sub_prompt = getSubPrompt(character, settings)
    sub_prompt = parseNames(sub_prompt, user.name, character.data.name)
    sub_prompt = sub_prompt.length > 0 ? "\n\n" + sub_prompt : ""

    let prefill_prompt = getPrefillPrompt(settings)
    prefill_prompt = parseNames(prefill_prompt, user.name, character.data.name)
    prefill_prompt = prefill_prompt.length > 0 ? prefill_prompt : ""

    let tokens_system = tokenizer.getTokens(system).length;
    let tokens_messages = 0
    
    let injected_sub_prompt = false;

    const enabled_sub_prompt = getFieldEnabled("sub_prompt", settings)
    if(enabled_sub_prompt){
        tokens_system += tokenizer.getTokens(sub_prompt).length
    }

    const enabled_prefill_prompt = getFieldEnabled("prefill_prompt", settings)
    if(enabled_prefill_prompt){
        tokens_system += tokenizer.getTokens(prefill_prompt).length
    }

    offset = Math.abs(offset)
    if( messages ){
        for( let i = messages.length - 1 - offset; i >= 0; i--){
            let role = messages[i].participant > -1 ? "assistant" : "user";
            let index = messages[i].index
            let content = messages[i].candidates[index].text
            content = parseNames(content, user.name, character.data.name)
            
            if(enabled_sub_prompt && !injected_sub_prompt && role === "user"){
                content += sub_prompt;
                injected_sub_prompt = true;
            }

            let next_tokens = tokenizer.getTokens(content).length
            if(tokens_system + tokens_messages + next_tokens > settings.context_size){
                break;
            }

            tokens_messages += next_tokens
            prompt.splice(1, 0, {role: role, content: content})
        }
    }

    if( enabled_prefill_prompt ){
        prompt.push({"role": "assistant", "content": prefill_prompt})
    }

    return prompt;
}

export function messagesToString(messages, character, user, settings, separator = "\n\n") {
    let human_prefix = settings.human_prefix ? settings.human_prefix : "{{user}}"
    let assistant_prefix = settings.assistant_prefix ? settings.assistant_prefix : "{{char}}"

    human_prefix = parseNames( human_prefix, user.name, character.data.name )
    assistant_prefix = parseNames( assistant_prefix, user.name, character.data.name )

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

export function mergeMessages(messages) {
    const merged = [];
    messages.forEach((msg, index) => {
        if (index === 0 || msg.role !== messages[index-1].role){
            merged.push(msg);
        } else {
            merged[merged.length-1].content += "\n" + msg.content;
        }
    });
    return merged;
}

export function findKeysInMessage(keys, message, case_sensitive = false) {
    let index = message.index
    let content = message.candidates[ index ].text

    if( !content ){
        return false
    }
    if (case_sensitive) {
        return keys.some((key) => content.includes(key));
    } else {
        return keys.some((key) => content.toLowerCase().includes(key.toLowerCase()));
    }
}

export function matchMessage(entry, message){
    if( !entry.enabled || !entry.content )
        return false;
    if( entry.constant )
        return true;

    const has_primary_key = findKeysInMessage(entry.keys, message, entry.case_sensitive);
    const has_secondary_key = findKeysInMessage(entry.secondary_keys, message, entry.case_sensitive);

    if( has_primary_key ){
        if( entry.selective && entry.secondary_keys?.length > 0 ){
            return has_secondary_key;
        }
        return true;
    }
    return false;
}

export function getGlobalLoreEntries(tokenizer, content){
    const books = content.books;
    if( !books ){
        return ""
    }
    let entries = []
    books.global?.forEach(book => {
        entries.push( getEntriesFromBook( tokenizer, book, content ))
    })
    return entries.join("\n")
}

export function getEntriesFromBook(tokenizer, book, content) {
    const character = content.character;
    const user = content.user;
    const messages = content.chat.messages;

    const scanned = messages.slice(-book.scan_depth);
    const entries = [];

    if( !book.entries ){
        console.warn("Book has no entries!")
        return ""
    }

    console.log("Reading book " + book.name)

    book.entries.forEach((entry) => {
        scanned.some((message) => {
            const match = matchMessage(entry, message)
            if(match) {
                entries.push(entry);
            }
            return match;
        });
    });

    // use parseNames on each entry.content
    entries.forEach(entry => entry.content = parseNames(entry.content, user.name, character.data.name));

    // trim entries to fit book.token_budget
    // entries with lower priority are discarded first
    let tokens_used = 0;
    entries.sort((a,b) => b.priority - a.priority);
    for(let i = 0; i < entries.length; i++){
        const entry = entries[i];
        const tokens = tokenizer.getTokens(entry.content).length;
        if(tokens_used + tokens <= book.token_budget){
            tokens_used += tokens;
        }else{
            entries.splice(i, entries.length - i);
            break;
        }
    }

    // sort entries by insertion order
    entries.sort((a,b) => a.insertion_order - b.insertion_order);
    const result = entries.map((entry) => entry.content).join("\n\n");
    return result
}

export function getTokenConsumption( tokenizer, character, user, settings ){
    let _system = getMainPrompt( character, settings );
    const persona = getPersona( character, settings )
    const prompt_sub = getSubPrompt( character, settings );
    const prompt_prefill = getPrefillPrompt( settings );

    if( persona ){
        _system += "\n\n" + persona
    }

    if( prompt_sub ){
        _system += "\n\n" + prompt_sub;
    }

    if( prompt_prefill ){
        _system += "\n\n" + prompt_prefill;
    }

    _system = parseNames( _system, user.name, character.data.name )

    const _description = parseNames( getCharacterProperty( "description", character, settings ), user.name, character.data.name )
    const _personality = parseNames( getCharacterProperty( "personality", character, settings ), user.name, character.data.name )
    const _scenario = parseNames( getCharacterProperty( "scenario", character, settings ), user.name, character.data.name )
    const _dialogue = parseNames( getCharacterProperty( "mes_example", character, settings ), user.name, character.data.name )
    const _greeting = parseNames( getCharacterProperty( "first_mes", character, settings ), user.name, character.data.name )

    return {
        system: tokenizer.getTokens(_system).length,
        greeting: tokenizer.getTokens(_greeting).length,
        description: tokenizer.getTokens(_description).length,
        personality: tokenizer.getTokens(_personality).length,
        scenario: tokenizer.getTokens(_scenario).length,
        dialogue: tokenizer.getTokens(_dialogue).length,
    }
}

export function sanitizeStopSequences(list, user, character){
    if(!list || !Array.isArray(list)) 
        return []
    return list.map((item) => parseNames(item, user.name, character.data.name))
}

export default { 
    parseNames, 
    makePrompt, 
    getTokenConsumption, 
    messagesToString, 
    sanitizeStopSequences 
};
