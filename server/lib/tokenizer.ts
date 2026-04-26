import { Tokenizer, models, type ModelName } from "ai-tokenizer"
import * as cl100k_base from "ai-tokenizer/encoding/cl100k_base"
import * as o200k_base from "ai-tokenizer/encoding/o200k_base"
import * as claude from "ai-tokenizer/encoding/claude"


export function getTokenizer(api: string, model: string): Tokenizer {
    if (model in models) {
        const { encoding } = models[model as ModelName];
        const encodings = { o200k_base, cl100k_base, claude };
        return new Tokenizer(encodings[encoding as keyof typeof encodings]);
    }
    // Unknown model: best-guess by provider prefix
    if (api.startsWith("anthropic") || model.startsWith("claude"))
        return new Tokenizer(claude);
    if (api.startsWith("openai") || model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4"))
        return new Tokenizer(o200k_base);
    // Generic fallback
    // console.warn(`Unknown model "${model}", falling back to o200k_base encoding`);
    return new Tokenizer(o200k_base);
}


export function getTokens(text: string, family: string, model: string): number[] {
    const tokenizer = getTokenizer(family, model)
    return tokenizer.encode(text)
}


export function getTokenCount(text: string, family: string, model: string): number {
    const tokenizer = getTokenizer(family, model)
    return tokenizer.count(text)
}