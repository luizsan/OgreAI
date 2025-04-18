// required for calculating tokens correctly
import * as Utils from "../lib/utils.js"
import * as Tokenizer from "../tokenizer/gpt.js"

const SAFETY_SETTINGS = [
    { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "OFF" },
    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "OFF" },
    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "OFF" },
    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "OFF" },
    { "category": "HARM_CATEGORY_CIVIC_INTEGRITY", "threshold": "OFF" },
]

class Google{

    // display name
    static API_NAME = "Google"
    static API_ADDRESS = "https://generativelanguage.googleapis.com"

    // settings for this API
    // types: text, textarea, select (dropdown), range (slider), checkbox
    static API_SETTINGS = {
        model: {
            title: "Model",
            description: "ID of the model to use.",
            type: "select", default: "gemini-1.5-flash", choices: [
                "gemini-2.5-pro-exp-03-25",
                "gemini-2.0-flash-exp",
                "gemini-1.5-flash",
                "gemini-1.5-flash-8b",
                "gemini-1.5-pro",
                "gemini-1.0-pro",
            ]
        },

        max_tokens: {
            title: "Max Tokens",
            description: "The maximum number of tokens to generate in the completion. The token count of your prompt plus max_tokens cannot exceed the model's context length.",
            type: "range", default: 128, min: 8, max: 8192, step: 8,
        },

        context_size: {
            title: "Context Size",
            description: "Model context size.",
            type: "range", default: 32768, min: 128, max: 1048576, step: 8,
        },

        temperature: {
            title: "Temperature",
            description: "Controls the randomness of the output.",
            type: "range", default: 0.7, min: 0.0, max: 2.0, step: 0.01,
        },

        top_p: {
            title: "top_p",
            description: "The maximum cumulative probability of tokens to consider when sampling. The model uses combined Top-k and Top-p (nucleus) sampling. Tokens are sorted based on their assigned probabilities so that only the most likely tokens are considered. Top-k sampling directly limits the maximum number of tokens to consider, while Nucleus sampling limits the number of tokens based on the cumulative probability.",
            type: "range", default: 1.0, min: 0.0, max: 1.0, step: 0.01,
        },

        top_k: {
            title: "top_k",
            description: "The maximum number of tokens to consider when sampling. Gemini models use Top-p (nucleus) sampling or a combination of Top-k and nucleus sampling. Top-k sampling considers the set of topK most probable tokens. Models running with nucleus sampling don't allow topK setting.",
            type: "range", default: 20, min: 1, max: 40, step: 1,
        },

        presence_penalty: {
            title: "Presence Penalty",
            description: "Presence penalty applied to the next token's logprobs if the token has already been seen in the response. This penalty is binary on/off and not dependant on the number of times the token is used (after the first). Use frequencyPenalty for a penalty that increases with each use. A positive penalty will discourage the use of tokens that have already been used in the response, increasing the vocabulary. A negative penalty will encourage the use of tokens that have already been used in the response, decreasing the vocabulary.",
            type: "range", default: 0, min: -2, max: 2, step: 0.01,
        },

        frequency_penalty: {
            title: "Frequency Penalty",
            description: "Frequency penalty applied to the next token's logprobs, multiplied by the number of times each token has been seen in the respponse so far. A positive penalty will discourage the use of tokens that have already been used, proportional to the number of times the token has been used: The more a token is used, the more dificult it is for the model to use that token again increasing the vocabulary of responses.",
            type: "range", default: 0, min: -2, max: 2, step: 0.01,
        },

        stream: {
            title: "Stream",
            description: "Whether to stream back partial progress. If set, tokens will be sent as data-only server-sent events as they become available.",
            type: "checkbox", default: true, disabled: true
        },

        stop_sequences: {
            title: "Stop Sequences",
            description: "The set of character sequences (up to 5) that will stop output generation. If specified, the API will stop at the first appearance of a stop_sequence. The stop sequence will not be included as part of the response.",
            type: "list", limit: 5, default: [],
        },


    }

    // private variable to store incomplete messages
    static #__message_chunk = "";

    // getStatus must return a boolean
    static async getStatus(settings){
        const options = { method: "POST", headers:{ "ContentType":"application/json", "Authorization":"Bearer " + settings.api_auth }}
        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        return await fetch( `${url}"/v1beta/models?key=${settings.api_auth}`, options ).then((response) => response.ok)
    }

    // returns an array of objects in this case but can anything that the model accepts as a prompt
    static makePrompt( content, offset = 0 ){
        let messages_list = Utils.makePrompt( Tokenizer, content, offset )
        messages_list = messages_list.map((message) => {
            return {
                "role": message.role.replaceAll("system", "model").replaceAll("assistant", "model"),
                "parts": [
                    { "text": message.content }
                ]
            }
        })
        let last = messages_list.at(-1)
        if( last.role !== "user" ){
            messages_list.push({ "role": "user", "parts": [{ "text": "(continue)" }] })
        }
        return messages_list
    }

    static getTokenizer(){
        return Tokenizer
    }

    static getMessageTokens( message, character, user, settings ){
        return Utils.getMessageTokens( Tokenizer, message, character, user, settings )
    }

    // returns an object with the token breakdown for a character
    static getCharacterTokens( character, user, settings ){
        return Utils.getCharacterTokens( Tokenizer, character, user, settings )
    }

    // returns an output from the prompt that will be fed into receiveData
    static async generate( content ){
        const settings = content.settings;
        const prompt = content.prompt;

        let outgoing_data = {
            model: settings.model,
            // stream: settings.stream,
            contents: prompt,
            // contents: prompt.slice(1),
            // systemInstruction: prompt[0],
            safetySettings: SAFETY_SETTINGS,
            generationConfig: {
                maxOutputTokens: parseInt(settings.max_tokens),
                temperature: parseFloat(settings.temperature),
                topP: parseFloat(settings.top_p),
                topK: parseFloat(settings.top_k),
                // presencePenalty: parseFloat(settings.presence_penalty),
                // frequencyPenalty: parseFloat(settings.frequency_penalty),
                stopSequences: Utils.sanitizeStopSequences(settings.stop_sequences, content.user, content.character),
            },
        };

        let options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': 'Bearer ' + settings.api_auth,
            },
            body: JSON.stringify(outgoing_data)
        }

        console.debug("Sending prompt %o", outgoing_data)
        // console.debug(`Sending prompt to ${outgoing_data.model}...`)

        const url = settings.api_url ? settings.api_url : this.API_ADDRESS
        const mode = settings.stream ? "streamGenerateContent" : "generateContent"
        console.log(`${url}/v1beta/models/${settings.model}:${mode}?key=${settings.api_auth}`)
        return fetch( `${url}/v1beta/models/${settings.model}:${mode}?key=${settings.api_auth}`, options )
    }

    // processes a single message from the model's output
    // - participant: 0
    // - swipe: true or false
    // - candidate: { text, timestamp, model }
    static receiveData( incoming_data, swipe = false ){
        console.log(incoming_data)
        let parsed = JSON.parse(incoming_data);
        try{
            if(parsed?.error){
                return parsed;
            }

            if(parsed.promptFeedback){
                return { error: { type: parsed.promptFeedback.blockReason, message: "PROHIBITED_CONTENT" }};
            }

            console.log("trying to parse candidates")
            if( parsed.candidates ){
                console.log("parsed candidates")
                if( parsed.candidates[0]?.finishReason ){
                    const reason = parsed.candidates[0].finishReason
                    if ( reason !== "STOP" )
                        return { error: { type: reason, message: reason }}
                }

                if(parsed.choices && parsed.choices[0].delta?.content){
                    const err = parsed.choices[0].delta.content;
                    message.streaming.model = parsed.model ?? undefined
                    return { error: { type: "Proxy Error", message: err }}
                }

                console.debug(parsed.modelVersion)
                let txt = parsed.candidates[0].content.parts[0].text
                console.log(txt)
                let message = {
                    participant: 0,
                    swipe: swipe,
                    candidate: {
                        model: parsed.modelVersion || undefined,
                        text: txt,
                        timestamp: Date.now(),
                    }
                }
                this.__message_chunk = ""
                return message;
            }else{
                this.__message_chunk = ""
                return parsed;
            }
        }catch(error){
            // catch incomplete json responses
            if(error instanceof SyntaxError){
                console.error("JSON Syntax error")
                this.#__message_chunk += incoming_data
                return null;
            }else{
                console.log(incoming_data)
                console.error(error)
                this.__message_chunk = ""
                return error
            }
        }
    }

    // if the API supports streams, must return a JSON
    // - done: if the stream has finished
    // - participant: 0
    // - swipe: true or false
    // - replace: replace the message contents or keep adding
    // - streaming: { text, timestamp, model }
    static receiveStream( incoming_data, swipe = false, replace = false ){
        let message = {
            done: false,
            participant: 0,
            swipe: swipe,
            replace: replace,
            streaming: {
                text: "",
                model: undefined,
                timestamp: Date.now()
            }
        }

        const raw_text = (this.__message_chunk || "") + incoming_data
        console.log(raw_text)
        const lines = raw_text.replace(/data: /gm, '\n').split('\n').filter(line => line.trim() !== '');
        for( const line of lines ){
            if(!line){
                continue;
            }

            const obj = line.replace(/data: /gm, '')

            if (obj === '[DONE]') {
                message.done = true;
                break;
            }

            if( obj.startsWith(":") ){
                continue
            }

            let parsed = null
            try {
                parsed = JSON.parse(obj);
                if(parsed?.error ){
                    return parsed;
                }

                if(parsed.promptFeedback){
                    return { error: { type: parsed.promptFeedback.blockReason, message: "PROHIBITED_CONTENT" }};
                }

                if(parsed.choices && parsed.choices[0].delta?.content){
                    const err = parsed.choices[0].delta.content;
                    message.streaming.model = parsed.model ?? undefined
                    return { error: { type: "Proxy Error", message: err }}
                }

                if(parsed.candidates[0]?.finishReason ){
                    const reason = parsed.candidates[0].finishReason
                    if( reason !== "STOP" )
                        return { error: { type: reason, message: reason }}
                }

                const text = parsed.candidates[0].content.parts[0].text;
                message.streaming.model = parsed.modelVersion || undefined
                if( text ){
                    message.streaming.text += text;
                    this.__message_chunk = "";
                }
            }catch(error){
                if(error instanceof SyntaxError){
                    this.__message_chunk = obj
                }else{
                    console.log(obj)
                    console.error(error);
                }
            }
        }

        return message;
    }
}

export default Google