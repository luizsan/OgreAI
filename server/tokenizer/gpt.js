import { encode } from 'gpt-3-encoder';

export function getTokens(text){
    if(!text) return []
    return encode(text)
}

export default { getTokens }