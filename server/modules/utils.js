import { encode } from 'gpt-3-encoder';

function ParseNames(text, user, bot){
    if(!text) return text;
    text = text.replaceAll("[NAME_IN_MESSAGE_REDACTED]", user)
    text = text.replaceAll("{{user}}", user)
    text = text.replaceAll("<USER>", user)
    text = text.replaceAll("{{char}}", bot)
    text = text.replaceAll("<BOT>", bot)
    return text
}

function GetTokens(text){
    if(!text) return []
    return encode(text)
}

const _ParseNames = ParseNames;
export { _ParseNames as ParseNames };
const _GetTokens = GetTokens;
export { _GetTokens as GetTokens };