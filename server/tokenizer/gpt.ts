import { encode as encode_o200k } from "gpt-tokenizer/encoding/o200k_base";
import { encode as encode_cl100k } from "gpt-tokenizer/encoding/cl100k_base";

export function getTokens(text: string, model: string): number[] {
    if (!text) return [];
    switch (true) {
        case model.startsWith("o1-"):
        case model.startsWith("gpt-4."):
        case model.startsWith("gpt-4o"):
            return encode_o200k(text);

        case model === "gpt-4":
        case model.startsWith("gpt-4-"):
        case model.startsWith("gpt-3.5"):
            return encode_cl100k(text);

        default:
            return encode_o200k(text);
    }
}

export function getTokenCount(text: string, model: string): number {
    return getTokens(text, model)?.length ?? 0;
}

export default { getTokenCount, getTokens };
