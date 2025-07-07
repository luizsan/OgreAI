import type {
    ICharacter,
    IChat,
    IMessage,
    IGenerationData,
    ISettings,
    IUser,
    IPromptConfig,
    IPromptEntry,
    ICandidate,
    ILorebookEntry
} from "../../shared/types.d.ts";

import API from "../core/api.ts";
import Lorebook from "./lorebook.ts";
import { parseMacros, parseNames } from "../../shared/format.ts";
import chalk from "chalk";

const available_roles: Array<string> = ["system", "user", "assistant"]

export function buildPrompt( api: API, data: IGenerationData, offset = 0 ){
    const user: IUser = data.user;
    const character: ICharacter = data.character;

    console.debug( "---" )
    console.debug( "Building prompt" )
    let prompt_entries: Array<IPromptEntry> = []
    data.prompt.forEach((item: IPromptConfig) => {
        if( !item.key ) return
        if( item.key !== "messages" && item.enabled !== undefined && item.enabled === false ) return
        let added: boolean = item.enabled

        switch(item.key){
            case "base_prompt":
                const entry_main_prompt: IPromptEntry = getMainPrompt(item, data)
                if ( entry_main_prompt.content.length > 0 ){
                    prompt_entries.push(entry_main_prompt)
                    added = true
                }
                break;

            case "persona":
                if ( user?.persona?.trim().length > 0 ){
                    let persona_entry: IPromptEntry = { role: "system", content: user.persona }
                    persona_entry.content = parseMacros(persona_entry.content, data.chat)
                    persona_entry.content = parseNames(persona_entry.content, user.name, character.data.name )
                    prompt_entries.push({ role: "system", content: user.persona })
                    added = true
                }
                break;

            case "description":
            case "personality":
            case "scenario":
            case "mes_example":
                const entry_property: IPromptEntry = getCharacterProperty(item, data)
                if ( entry_property.content ){
                    prompt_entries.push(entry_property)
                    added = true
                }
                break;

            case "messages":
                const messages_list: Array<IPromptEntry> = getMessages(api, data, offset)
                if( messages_list.length > 0 ){
                    prompt_entries = prompt_entries.concat(messages_list)
                    added = true
                }
                break;

            case "world_info":
                const world_entries: Array<ILorebookEntry> = Lorebook.getGlobalLoreEntries(api, data)
                if( world_entries.length > 0 ){
                    let world_entry: IPromptEntry = { role: "system", content: Lorebook.squashEntries(world_entries) }
                    world_entry.content = parseMacros(world_entry.content, data.chat)
                    world_entry.content = parseNames(world_entry.content, data.user.name, data.character.data.name )
                    prompt_entries.push(world_entry)
                    added = true
                }
                break;

            case "character_book":
                const character_entries: Array<ILorebookEntry> = Lorebook.getEntriesFromBook(api, character.data.character_book, data)
                if( character_entries.length > 0 ){
                    let book_entry: IPromptEntry = { role: "system", content: Lorebook.squashEntries(character_entries) }
                    book_entry.content = parseMacros(book_entry.content, data.chat)
                    book_entry.content = parseNames(book_entry.content, data.user.name, data.character.data.name )
                    prompt_entries.push(book_entry)
                    added = true
                }
                break;

            case "custom":
                const custom_content: string = item.content || item.label || ""
                const custom_entry: IPromptEntry = { role: "system", content: custom_content }
                if(available_roles.includes(item.role))
                    custom_entry.role = item.role
                custom_entry.content = parseMacros(custom_entry.content, data.chat )
                custom_entry.content = parseNames(custom_entry.content, data.user.name, data.character.data.name )
                prompt_entries.push(custom_entry)
                added = true

            default:
                break;
        }

        if( added ){
            console.debug(chalk.cyan(chalk.bold( " + ")) + chalk.blue(item.key))
        }else{
            console.debug(chalk.gray(chalk.bold( " - " ) + item.key))
        }

    })
    console.debug("---")

    return prompt_entries
}

// Retrieves a character property
export function getCharacterProperty(config: IPromptConfig, data: IGenerationData): IPromptEntry{
    let entry: IPromptEntry = { role: "system", content: "" }
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
    var entry: IPromptEntry = { role: "system", content: "" }
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

// Retrieves the continue prompt from prompt config
function getContinuePrompt(config: IPromptConfig, data: IGenerationData) : IPromptEntry{
    var entry: IPromptEntry = { role: "user", content: "" }
    entry.content = config.content
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
    var messages: Array<IMessage> = data.chat.messages.slice(0, data.chat.messages.length - offset);
    const settings: ISettings & Record<string,any> = data.settings;

    let entries: Array<IPromptEntry> = messages.map((message: IMessage) => {
        let role: string = message.participant > -1 ? "assistant" : "user";
        let index: number = message.index
        let candidate: ICandidate = message.candidates[index]
        let contents: string = candidate.text
        contents = parseMacros(contents, data.chat)
        contents = parseNames(candidate.text, data.user.name, data.character.data.name)
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

    const config_continue: IPromptConfig = data.prompt.find((item: IPromptConfig) => item.key === "continue_prompt")
    const config_jailbreak: IPromptConfig = data.prompt.find((item: IPromptConfig) => item.key === "sub_prompt")
    const config_prefill: IPromptConfig = data.prompt.find((item: IPromptConfig) => item.key === "prefill_prompt")

    if( config_continue && config_continue.enabled ){
        var entry_continue: IPromptEntry = getContinuePrompt(config_continue, data)
        if( entry_continue.content.length > 0 ){
            if( entries.at(-1).role !== "user" ){
                entries.push(entry_continue)
            }
        }
    }

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

export function stringifyPrompt(messages: Array<IPromptEntry>,
    human_prefix: string, assistant_prefix: string, separator = "\n\n"): string{
    // ---
    let str = messages.map((msg) => {
        switch (msg.role) {
            case "assistant":
                return `${assistant_prefix}: ${msg.content}`;
            case "user":
                return `${human_prefix}: ${msg.content}`;
            case "system":
                // leave control to main prompt
                return msg.content
            default:
                return
        }
    }).join(separator);
    return str;
}


export default { buildPrompt }