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

export default { parseNames, getTokens };
