import { MistralTokenizer } from 'mistral-tokenizer-ts'

const tokenizer = new MistralTokenizer()

export function getTokenCount(text, _model){
    if(!text) return 0
    return tokenizer.encode(text)?.length || 0
}

export default { getTokenCount }