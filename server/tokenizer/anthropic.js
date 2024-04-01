import { countTokens } from '@anthropic-ai/tokenizer'

export function getTokens(text){
    if(!text) return 0
    return countTokens(text)
}

export default { getTokens }