import { MistralTokenizer } from 'mistral-tokenizer-ts';

const tokenizer = new MistralTokenizer();

export function getTokenCount(text: string, _model: string): number {
    if (!text) return 0;
    const tokens = tokenizer.encode(text);
    return tokens?.length || 0;
}

export default { getTokenCount };
