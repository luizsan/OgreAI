export default class Prompt{

    static default = {
        base_prompt: { 
            toggleable: false, editable: true, 
            label: "Main prompt",
            description: "Used to give basic instructions to the model on how to behave in the chat.",
            default: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write only one reply, with 1 to 4 paragraphs. Use markdown to italicize actions, and avoid quotation marks. Be proactive, creative, and drive the plot and conversation forward. Always stay in character and avoid repetition."
        },

        description: { 
            toggleable: true, editable: true, 
            label: "Character description",
            description: "How to insert the character's description in the prompt. Use {{original}} to apply the character's description field.",
            default: "{{char}}'s description:\n{{original}}"
        },
        
        personality: { 
            toggleable: true, editable: true, 
            label: "Character personality",
            description: "How to insert the character's personality in the prompt. Use {{original}} to apply the character's personality field.",
            default: "{{char}}'s personality:\n{{original}}"
        },
        
        scenario: { 
            toggleable: true, editable: true, 
            label: "Character scenario",
            description: "How to insert the character's scenario in the prompt. Use {{original}} to apply the character's scenario field.",
            default: "{{char}}'s scenario:\n{{original}}"
        },
        
        mes_example: { 
            toggleable: true, editable: true, 
            label: "Example messages",
            description: "How to insert the character's example messages in the prompt. Use {{original}} to apply the character's example messages field.",
            default: "Example messages:\n{{original}}"
        },
        
        persona: { 
            toggleable: true, editable: true, 
            label: "User persona",
            description: "How would you describe yourself to the AI? This description is inserted in the prompt.",
            default: ""
        },
        
        messages: { 
            toggleable: false, editable: false, locked: true,
            label: "Chat history",
            description: "",
        },

        sub_prompt: { 
            toggleable: true, editable: true, locked: true,
            label: "Jailbreak prompt",
            description: "Appended at the end of the user's last message to reinforce instructions.",
            default: "",
        },

        prefill_prompt: { 
            toggleable: true, editable: true, locked: true,
            label: "Prefill prompt",
            description: "Appended at the very end of the prompt to enforce instructions and patterns.",
            default: "",
        },
    }

    static categories = Object.keys(this.default)

    /* [{
        key: string = a key present in default keys,
        disabled: bool = optional and only if the item is toggleable by default
        content: string = optional and only if the item is editable by default
    }] */
    static Validate(obj){
        if( !Array.isArray(obj) ){
            obj = []
        }

        // filter to only allow valid keys present in default
        obj = obj.filter((e) => 
            typeof e === "object" && e.key && Object.keys(this.default).includes(e.key)
        )

        // filter repeated keys
        obj = obj.filter((value, index, self) => 
            index === self.findIndex((t) => t.key === value.key)
        )

        obj.forEach((e) => {
            if( !this.default[e.key].toggleable ){
                e.enabled = undefined
            }else if( typeof e.enabled !== "boolean" ){
                e.enabled = true
            }

            if( !this.default[e.key].editable ){
                e.content = undefined
            }else if( typeof e.content !== "string" ){
                e.content = this.default[key].default
            }
        })

        Object.keys(this.default).forEach(key => {
            if (!obj.some((o) => o.key && o.key === key)) {
                obj.push({ 
                    key: key,
                    enabled: true,
                    content: this.default[key].editable ? this.default[key].default : undefined
                });
            }
        })

        return obj;
    }

}