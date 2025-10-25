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

import {
    parseMacros,
    parseNames
} from "../../shared/format.ts";

import chalk from "chalk";
import API from "../core/api.ts";
import * as Lorebook from "./lorebook.ts";
import * as Tavern from "../external/tavern.ts";


export const prompt_types: Array<string> = ["base_prompt", "sub_prompt", "prefill_prompt", "custom"]
export const prompt_roles: Array<string> = ["system", "user", "assistant"]
export const default_order = {
    base_prompt: {
        toggleable: true, editable: true, overridable: true, row_size: 12,
        label: "Main prompt",
        description: "Used to give basic instructions to the model on how to behave in the chat. May be overriden by a character's custom System Prompt.",
        default: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write only one reply, with 1 to 4 paragraphs. Use markdown to italicize actions, and avoid quotation marks. Be proactive, creative, and drive the plot and conversation forward. Always stay in character and avoid repetition."
    },

    world_info: {
        toggleable: true, editable: false,
        label: "World info",
        description: "Inserts information from globally enabled lorebooks.",
    },

    description: {
        toggleable: true, editable: true, row_size: 3,
        label: "Character description",
        description: "How to insert the character's description in the prompt. Use {{original}} to apply the character's description field.",
        default: "{{char}}'s description:\n{{original}}"
    },

    personality: {
        toggleable: true, editable: true, row_size: 3,
        label: "Character personality",
        description: "How to insert the character's personality in the prompt. Use {{original}} to apply the character's personality field.",
        default: "{{char}}'s personality:\n{{original}}"
    },

    scenario: {
        toggleable: true, editable: true, row_size: 3,
        label: "Character scenario",
        description: "How to insert the character's scenario in the prompt. Use {{original}} to apply the character's scenario field.",
        default: "{{char}}'s scenario:\n{{original}}"
    },

    mes_example: {
        toggleable: true, editable: true, row_size: 3,
        label: "Example messages",
        description: "How to insert the character's example messages in the prompt. Use {{original}} to apply the character's example messages field.",
        default: "Example messages:\n{{original}}"
    },

    character_book: {
        toggleable: true, editable: false,
        label: "Character book",
        description: "Inserts information from the current character's embedded lorebook.",
    },

    persona: {
        toggleable: true, editable: false,
        label: "User persona",
        description: "How would you describe yourself to the AI? This description is inserted in the prompt.",
        default: ""
    },

    messages: {
        toggleable: false, editable: false,
        label: "Chat history",
        description: "Inserts the chat history.",
    },

    continue_prompt: {
        toggleable: true, editable: true, locked: "messages", row_size: 6,
        label: "Continue prompt",
        description: "Appended at the end of the chat history if the last message is not from user, so the model can continue the conversation without adding a new user message.",
        default: "(continue)",
    },

    sub_prompt: {
        toggleable: true, editable: true, locked: "continue_prompt", overridable: true, row_size: 6,
        label: "Jailbreak prompt",
        description: "Appended at the end of the user's last message to reinforce instructions. May be overridden by a character's Post-History Instructions.",
        default: "",
    },

    prefill_prompt: {
        toggleable: true, editable: true, locked: "sub_prompt", row_size: 6,
        label: "Prefill prompt",
        description: "Appended at the very end of the message history to enforce instructions and patterns.",
        default: "",
    },

    custom: {
        toggleable: true, editable: true, row_size: 6,
        label: "Custom prompt",
        description: "User-defined prompt injection.",
        default: "",
    }
}

export function buildPrompt( api: API, data: IGenerationData, offset = 0 ){
    const user: IUser = data.user;
    const character: ICharacter = data.character;

    console.debug( "---" )
    console.debug( "Building prompt" )
    let prompt_entries: Array<IPromptEntry> = []
    data.prompt.forEach((item: IPromptConfig) => {
        if( !item.key ) return
        if( item.key !== "messages" && item.enabled !== undefined && item.enabled === false ) return
        let added_item: boolean = item.enabled
        let added_what: string = ""

        switch(item.key){
            case "base_prompt":
                const entry_main_prompt: IPromptEntry = getMainPrompt(item, data)
                added_item = entry_main_prompt.content.length > 0
                if ( added_item ){
                    prompt_entries.push(entry_main_prompt)
                }
                break;

            case "persona":
                const content_persona = user?.persona?.trim()
                added_item = content_persona && content_persona.length > 0
                if ( added_item ){
                    let persona_entry: IPromptEntry = { role: "system", content: user.persona }
                    persona_entry.content = parseMacros(persona_entry.content, data.chat)
                    persona_entry.content = parseNames(persona_entry.content, user.name, character.data.name )
                    prompt_entries.push({ role: "system", content: user.persona })
                }
                break;

            case "description":
            case "personality":
            case "scenario":
            case "mes_example":
                const entry_property: IPromptEntry = getCharacterProperty(item, data)
                added_item = !!entry_property.content
                if ( added_item ){
                    prompt_entries.push(entry_property)
                }
                break;

            case "messages":
                const messages_list: Array<IPromptEntry> = getMessages(api, data, offset)
                added_item = messages_list.length > 0
                if( added_item ){
                    prompt_entries = prompt_entries.concat(messages_list)
                }
                added_what = `(${messages_list.length})`
                break;

            case "world_info":
                const world_entries: Array<ILorebookEntry> = Lorebook.getGlobalLoreEntries(api, data)
                added_item = world_entries.length > 0
                if( added_item ){
                    let world_entry: IPromptEntry = { role: "system", content: Lorebook.squashEntries(world_entries) }
                    world_entry.content = parseMacros(world_entry.content, data.chat)
                    world_entry.content = parseNames(world_entry.content, data.user.name, data.character.data.name )
                    prompt_entries.push(world_entry)
                }
                added_what = `(${world_entries.length})`
                break;

            case "character_book":
                const character_entries: Array<ILorebookEntry> = Lorebook.getEntriesFromBook(api, character.data.character_book, data)
                added_item = character_entries.length > 0
                if( added_item ){
                    let book_entry: IPromptEntry = { role: "system", content: Lorebook.squashEntries(character_entries) }
                    book_entry.content = parseMacros(book_entry.content, data.chat)
                    book_entry.content = parseNames(book_entry.content, data.user.name, data.character.data.name )
                    prompt_entries.push(book_entry)
                }
                added_what = `(${character_entries.length})`
                break;

            case "custom":
                const custom_content: string = item.content || item.label || ""
                const custom_entry: IPromptEntry = { role: "system", content: custom_content }
                if(prompt_roles.includes(item.role))
                    custom_entry.role = item.role
                custom_entry.content = parseMacros(custom_entry.content, data.chat )
                custom_entry.content = parseNames(custom_entry.content, data.user.name, data.character.data.name )
                prompt_entries.push(custom_entry)
                added_item = true

            default:
                break;
        }

        if( added_item ){
            console.debug(`${chalk.cyan(" + ")} ${chalk.blue(item.key)} ${chalk.magenta(added_what)}`)
        }else{
            console.debug(chalk.gray(`${" - "} ${item.key} ${added_what}`))
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

/* [{
    key: string = a key present in default keys,
    disabled: bool = optional and only if the item is toggleable by default
    content: string = optional and only if the item is editable by default
}] */
export function Validate(obj: Array<Record<string, any>>, type?: string){
    if( type && type === "tavern" ){
        obj = Tavern.convertPrompt(obj)
    }

    if( !Array.isArray(obj) ){
        obj = []
    }

    // filter to only allow valid keys present in default
    obj = obj.filter((e) =>
        typeof e === "object" && e.key && Object.keys(default_order).includes(e.key)
    )

    // add missing keys with default values
    Object.keys(default_order).forEach((key) => {
        if(key === "custom") return
        if (!obj.some((e) => e.key === key)) {
            obj.push({
                key: key,
                enabled: true,
                content: default_order[key].editable ? default_order[key].default : undefined,
                allow_override: default_order[key].overridable ? true : undefined
            });
        }
    });

    // filter repeated keys
    obj = obj.filter((value, index, self) =>
        value.key === "custom" || index === self.findIndex((t) => t.key === value.key)
    )

    // sanitize values
    obj.forEach((e) => {
        if( !default_order[e.key].toggleable ){
            e.enabled = undefined
        }else if( typeof e.enabled !== "boolean" ){
            e.enabled = true
        }

        if( !default_order[e.key].editable ){
            e.content = undefined
        }else if( typeof e.content !== "string" ){
            e.content = default_order[e.key].default
        }

        if( !default_order[e.key].overridable ){
            e.allow_override = undefined
        }else if( typeof e.allow_override !== "boolean" ){
            e.allow_override = true
        }
    })

    // sort locked items
    obj.forEach((e) => {
        if (default_order[e.key]?.locked){
            const locked_to = default_order[e.key].locked
            const has_target = obj.some((item) => item.key === locked_to);
            if (has_target) {
                const item = obj.splice(obj.indexOf(e), 1)[0];
                const index = obj.findIndex((item) => item.key === locked_to);
                obj.splice(index + 1, 0, item);
            }
        }
    });

    return obj;
}