import { getEncoding, getEncodingNameForModel } from "js-tiktoken";

export function getTokens(text, model){
    if(!text) return 0
    try{
        const name = getEncodingNameForModel(model || "gpt-3.5-turbo")
        const encoder = getEncoding(name)
        return encoder.encode(text)?.length ?? 0
    }catch(error){
        console.log(error)
        return 0
    }
}

export default { getTokens }