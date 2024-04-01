import { encode } from 'gpt-3-encoder';

export function getTokens(text){
    if(!text) return 0
    return encode(text)?.length ?? 0
}

export default { getTokens }