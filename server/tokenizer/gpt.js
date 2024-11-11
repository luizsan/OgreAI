import { encode as encode_o200k } from "gpt-tokenizer/encoding/o200k_base";
import { encode as encode_cl100k } from "gpt-tokenizer/encoding/cl100k_base";

export function getTokens(text, model){
    if(!text) return []
    if (model.startsWith("o1-")){
        return encode_o200k(text)
    }else if(model.startsWith("gpt-4o")){
        return encode_o200k(text)
    }else if(model.startsWith("gpt-4-")){
        return encode_cl100k(text)
    }else if(model.startsWith("gpt-3.5-turbo")){
        return encode_cl100k(text)
    }else{
        return encode_cl100k(text)
    }
}

export function getTokenCount(text, model){
    return getTokens(text, model)?.length ?? 0
}

export default { getTokenCount, getTokens }