import { countTokens } from '@anthropic-ai/tokenizer'

export function getTokenCount(text: string, _model: string): number {
    if (!text) return 0
    return countTokens(text)
}

export default { getTokenCount }
