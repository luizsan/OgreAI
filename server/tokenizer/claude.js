import { countTokens } from '@anthropic-ai/tokenizer'

export function getTokenCount(text, _model){
    if(!text) return 0
    return countTokens(text)
}

export default { getTokenCount }