import { ISettings, IAPISettings } from "../../shared/types.js"
import * as Tavern from "../import/tavern.ts"

export default class Settings{
    static default_prompt_order = {
        base_prompt: {
            toggleable: true, editable: true, overridable: true, row_size: 12,
            label: "Main prompt",
            description: "Used to give basic instructions to the model on how to behave in the chat. Can be overriden by a character's custom System Prompt.",
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
            description: "Appended at the end of the chat history if the last message is not from the user, so the model can continue the conversation without interruption.",
            default: "(continue)",
        },

        sub_prompt: {
            toggleable: true, editable: true, locked: "continue_prompt", overridable: true, row_size: 6,
            label: "Jailbreak prompt",
            description: "Appended at the end of the user's last message to reinforce instructions. Can be overridden by a character's Post-History Instructions.",
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

    static default_prompt_categories = Object.keys(this.default_prompt_order)
    static default_preset_categories = [ "api_auth", "base_prompt", "sub_prompt", "prefill_prompt", "persona" ]

    static ValidateMain(obj: ISettings, api_modes: string[]){
        if( !obj.api_mode ){
            obj.api_mode = api_modes[0]
        }

        if( !obj.formatting ){
            obj.formatting = {}
        }

        if( !obj.formatting?.replace || !Array.isArray(obj.formatting?.replace)){
            obj.formatting = { replace: [] }
        }

        if( !obj.books || !Array.isArray(obj.books) ){
            obj.books = []
        }

        if( !obj.recents ){
            obj.recents = []
        }
    }

    static ValidateAPI(obj: any, api_settings: Record<string, IAPISettings>){
        obj.api_url = obj.api_url || ""
        obj.api_auth = obj.api_auth || ""
        obj.prompt = obj.propmt ?? []

        const keys = Object.keys(api_settings)
        keys.forEach(key => {
            if( obj[key] === undefined || typeof obj[key] !== typeof api_settings[key].default ){
                obj[key] = api_settings[key].default
            }
        })
        obj.prompt = this.ValidatePrompt(obj.prompt)
    }

    /* [{
        key: string = a key present in default keys,
        disabled: bool = optional and only if the item is toggleable by default
        content: string = optional and only if the item is editable by default
    }] */
    static ValidatePrompt(obj: Array<Record<string, any>>, type?: string){
        if( type && type === "tavern" ){
            obj = Tavern.convertPrompt(obj)
        }

        if( !Array.isArray(obj) ){
            obj = []
        }

        // filter to only allow valid keys present in default
        obj = obj.filter((e) =>
            typeof e === "object" && e.key && Object.keys(this.default_prompt_order).includes(e.key)
        )

        // add missing keys with default values
        Object.keys(this.default_prompt_order).forEach((key) => {
            if(key === "custom") return
            if (!obj.some((e) => e.key === key)) {
                obj.push({
                    key: key,
                    enabled: true,
                    content: this.default_prompt_order[key].editable ? this.default_prompt_order[key].default : undefined,
                    allow_override: this.default_prompt_order[key].overridable ? true : undefined
                });
            }
        });

        // filter repeated keys
        obj = obj.filter((value, index, self) =>
            value.key === "custom" || index === self.findIndex((t) => t.key === value.key)
        )

        // sanitize values
        obj.forEach((e) => {
            if( !this.default_prompt_order[e.key].toggleable ){
                e.enabled = undefined
            }else if( typeof e.enabled !== "boolean" ){
                e.enabled = true
            }

            if( !this.default_prompt_order[e.key].editable ){
                e.content = undefined
            }else if( typeof e.content !== "string" ){
                e.content = this.default_prompt_order[e.key].default
            }

            if( !this.default_prompt_order[e.key].overridable ){
                e.allow_override = undefined
            }else if( typeof e.allow_override !== "boolean" ){
                e.allow_override = true
            }
        })

        // sort locked items
        obj.forEach((e) => {
            if (this.default_prompt_order[e.key]?.locked){
                const locked_to = this.default_prompt_order[e.key].locked
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
}