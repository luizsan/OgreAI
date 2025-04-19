import type {
    ICharacter,
    IChat,
    IMessage,
    IGenerationData,
    ISettings,
    IUser,
    IPromptConfig,
    IPromptEntry,
    ICandidate
} from "../../shared/types.d.ts";

import API from "../core/api.ts";
import { parseMacros, parseNames } from "../../shared/format.mjs";
import chalk from "chalk";


export function buildPrompt( api: API, data: IGenerationData, offset = 0 ){
    const user: IUser = data.user;
    const settings: ISettings & Record<string,any> = data.settings;

    console.debug( "Building prompt" )
    let prompt_entries: Array<IPromptEntry> = []
    settings.prompt.forEach((item: IPromptConfig) => {
        if( !item.key ) return
        if( item.enabled !== undefined && item.enabled === false ) return

        switch(item.key){
            case "base_prompt":
                var entry: IPromptEntry = getMainPrompt(item, data)
                if ( entry.content.length > 0 ){
                    prompt_entries.push(entry)
                }
                break;
            case "persona":
                if ( user?.persona?.trim().length > 0 ){
                    prompt_entries.push({ role: "developer", content: user.persona })
                }
                break;
            case "messages":
                var list: Array<IPromptEntry> = getMessages(api, data, offset)
                if( list.length > 0 ){
                    prompt_entries = prompt_entries.concat(list)
                }
                break;
            case "description":
            case "personality":
            case "scenario":
            case "mes_example":
                var entry: IPromptEntry = getCharacterProperty(item, data)
                if ( entry.content ){
                    prompt_entries.push(entry)
                }
                break;
            case "custom":
                var entry: IPromptEntry = { role: "developer", content: item.content }
                entry.content = parseMacros(entry.content, data.chat )
                entry.content = parseNames(entry.content, data.user.name, data.character.data.name )
                prompt_entries.push(entry)
            default:
                break;
        }

        console.log(chalk.blue(` > ${item.key}`))
    })
    console.log("")
    return prompt_entries
}

// Retrieves a character property
export function getCharacterProperty(config: IPromptConfig, data: IGenerationData): IPromptEntry{
    let entry: IPromptEntry = { role: "developer", content: "" }
    entry.content = config.content
    if ( config.content.includes("{{original}}") && data.character.data[config.key] ){
        entry.content = entry.content.replaceAll( /{{original}}/gmi, data.character.data[config.key] )
    }else{
        entry.content += "\n\n" + data.character.data[config.key]
    }
    entry.content = parseMacros(entry.content, data.chat )
    entry.content = parseNames(entry.content, data.user.name, data.character.data.name )
    entry.content = entry.content.trim()
    return entry
}


// Retrieves the main prompt from the character or the prompt config if the character doesn't have one
function getMainPrompt(config: IPromptConfig, data: IGenerationData) : IPromptEntry{
    var entry: IPromptEntry = { role: "developer", content: "" }
    if( data.character.data.system_prompt && config.allow_override ){
        entry.content = data.character.data.system_prompt
        entry.content = entry.content.replaceAll(/{{original}}/gmi, config.content)
    }else{
        entry.content = config.content
    }
    entry.content = parseMacros(entry.content, data.chat )
    entry.content = parseNames(entry.content, data.user.name, data.character.data.name )
    entry.content = entry.content.trim()
    return entry
}

// Retrieves the jailbreak prompt from the character or the prompt config if the character doesn't have one
function getSubPrompt(config: IPromptConfig, data: IGenerationData) : IPromptEntry{
    var entry: IPromptEntry = { role: "user", content: "" }
    if( data.character.data.post_history_instructions && config.allow_override ){
        entry.content = data.character.data.post_history_instructions
        entry.content = entry.content.replaceAll(/{{original}}/gmi, config.content)
    }else{
        entry.content = config.content
    }
    entry.content = parseMacros(entry.content, data.chat )
    entry.content = parseNames(entry.content, data.user.name, data.character.data.name )
    entry.content = entry.content.trim()
    return entry
}

// Retrieves the prefill prompt from the prompt config
function getPrefillPrompt(config: IPromptConfig, data: IGenerationData) : IPromptEntry{
    var entry: IPromptEntry = { role: "assistant", content: "" }
    entry.content = config.content
    entry.content = parseMacros(entry.content, data.chat )
    entry.content = parseNames(entry.content, data.user.name, data.character.data.name )
    entry.content = entry.content.trim()
    return entry
}

// Retrieves the messages from the chat history and formats them for the prompt, injecting the jailbreak prompt and prefill
function getMessages(api: API, data: IGenerationData, offset = 0) : Array<IPromptEntry>{
    var messages: Array<IMessage> = data.chat.messages.slice(0, -offset);
    const settings: ISettings & Record<string,any> = data.settings;

    let entries: Array<IPromptEntry> = messages.map((message: IMessage) => {
        let role: string = message.participant > -1 ? "assistant" : "user";
        let index: number = message.index
        let candidate: ICandidate = message.candidates[index]
        let contents: string = parseNames(candidate.text, data.user.name, data.character.data.name)
        return { role: role, content: contents }
    }) as Array<IPromptEntry>;

    // remove messages exceeding the context size
    let token_count: number = 0
    let cutoff_index: number = 0
    for( let i = entries.length-1; i >= 0; i--){
        let entry: IPromptEntry = entries[i]
        token_count += api.getTokenCount(entry.content, settings.model)
        if( token_count > settings.context_size ){
            cutoff_index = i
            break
        }
    }
    if( cutoff_index > 0 ){
        entries = entries.slice(cutoff_index)
    }

    const config_jailbreak: IPromptConfig = data.settings.prompt.find((item: IPromptConfig) => item.key === "sub_prompt")
    const config_prefill: IPromptConfig = data.settings.prompt.find((item: IPromptConfig) => item.key === "prefill_prompt")
    // inject jailbreak
    if( config_jailbreak && config_jailbreak.enabled ){
        var entry_jailbreak: IPromptEntry = getSubPrompt(config_jailbreak, data)
        if( entry_jailbreak.content.length > 0 ){
            var index: number = entries.findLastIndex((entry: IPromptEntry) => entry.role === "user");
            if ( index > -1 ){
                entries.splice(index + 1, 0, entry_jailbreak)
            }
        }
    }
    // inject prefill
    if( config_prefill && config_prefill.enabled ){
        console.log("PREFILL: " + config_prefill.enabled)
        var entry_prefill: IPromptEntry = getPrefillPrompt(config_prefill, data)
        if( entry_prefill.content.length > 0 ){
            entries.push(entry_prefill)
        }
    }

    return entries;
}

// Squashes together consecutive messages of the same role
export function squashPrompt(messages: Array<IPromptEntry>, separator = "\n\n"): Array<IPromptEntry>{
    const merged: Array<IPromptEntry> = [];
    messages.forEach((msg: IPromptEntry, index: number) => {
        if (index === 0 || msg.role !== messages[index-1].role){
            merged.push(msg);
        } else {
            merged[merged.length-1].content += separator + msg.content;
        }
    });
    return merged;
}