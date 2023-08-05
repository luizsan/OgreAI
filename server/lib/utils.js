import { encode } from 'gpt-3-encoder';

export function parseNames(text, user, bot){
    if(!text) return text;
    text = text.replaceAll(/(\[NAME_IN_MESSAGE_REDACTED\])/gmi, user)
    text = text.replaceAll(/{{user}}/gmi, user)
    text = text.replaceAll(/<user>/gmi, user)
    text = text.replaceAll(/{{char}}/gmi, bot)
    text = text.replaceAll(/<bot>/gmi, bot)
    return text
}

export function getTokens(text){
    if(!text) return []
    return encode(text)
}

export function messagesToString(messages, character, user, settings, separator = "\n\n") {
    let human_prefix = settings.human_prefix ? settings.human_prefix : "Human"
    let assistant_prefix = settings.assistant_prefix ? settings.assistant_prefix : "Assistant"

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

export function sanitizeStopSequences(list, user, character){
    if(!Array.isArray(list)){
        list = []
    }

    for(let i = 0; i < list.length; i++){
        list[i] = parseNames( list[i], user, character.data.name )
    }

    return list
}

export default { parseNames, getTokens, messagesToString, sanitizeStopSequences };
