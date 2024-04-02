import { getEncoding } from "js-tiktoken";

export function getTokens(text, model){
    if(!text) return 0
    const encoder = getEncoding(model || "gpt-3.5-turbo")
    return encoder.encode(text)?.length ?? 0
}

export default { getTokens }