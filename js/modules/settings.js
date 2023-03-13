class Settings{
    constructor(){
        this.SetFrom( null );
    }

    static path = "./user/settings.json"

    static placeholders = {
        pygmalion: "http://192.0.0.1:8000/api",
        openai: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    }

    static subsets = {
        pygmalion: {
            max_length: {
                title: "Max Length",
                description: "Number of tokens to generate in a reply. A higher amount of tokens takes longer to generate.",
                default: 128, min: 8, max: 128, step: 8,
            },
            
            context_size: {
                title: "Context Size",
                description: "Number of context tokens to submit to the AI for sampling. Make sure this is higher than Output Length. Higher values increase VRAM/RAM usage.",
                default: 1024, min: 128, max: 2048, step: 8,
            },

            temperature: {
                title: "Temperature",
                description: "Randomness of sampling. Higher values can increase creativity, but make the output less meaningful. As the temperature approaches zero, the model will become deterministic and repetitive.",
                default: 0.5, min: 0, max: 2, step: 0.01,
            },

            repetition_penalty: {
                title: "Repetition Penalty",
                description: "Used to penalize words that were already generated or belong to the context.",
                default: 1.05, min: 1, max: 1.5, step: 0.01,
            },

            penalty_range: {
                title: "Repetition Penalty Range",
                description: "If set higher than 0, only applies repetition penalty to the last few tokens of the prompt rather than applying it to the entire prompt. The value controls the amount of tokens at the end of your prompt to apply to.",
                default: 1024, min: 0, max: 2048, step: 8,
            },

            repetition_slope: {
                title: "Repetition Penalty Slope",
                description: "Repetition penalty slope. If both this setting and Repetition Penalty Range are set higher than 0, will use sigmoid interpolation to apply repetition penalty more strongly on tokens that are closer to the end of the story. Higher values will result in the repetition penalty difference between the start and end of your prompt being more apparent. Setting this to 1 uses linear interpolation, setting this to 0 disables interpolation.",
                default: 1, min: 0, max: 10, step: 0.1,
                advanced: true,
            },
            
            top_p: {
                title: "top_p",
                description: "Used to discard unlikely text in the sampling process. Lower values will make the output more predictable, but also repetitive. Put this value on 1 to disable its effect.",
                default: 0.9, min: 0, max: 1, step: 0.01,
                advanced: true,
            },
            
            top_k: {
                title: "top_k",
                description: "Alternative sampling method. Can be combined with top_p. Put this value on 0 to disable its effect.",
                default: 40, min: 0, max: 100, step: 1,
                advanced: true,
            },
            
            typical_p: {
                title: "typical_p",
                description: "Alternative sampling method. Described in the paper 'Typical Decoding for Natural Language Generation' (10.48550/ARXIV.2202.00666). The paper indicates 0.2 as a suggested value for this setting. Put this value on 1 to disable its effect.",
                default: 1, min: 0, max: 1, step: 0.01,
                advanced: true,
            },
        },
        
        openai: {
            max_length: {
                title: "Max Length",
                description: "Number of tokens to generate in a reply. A higher amount of tokens takes longer to generate.",
                default: 128, min: 8, max: 512, step: 8,
            },  
            
            context_size: {
                title: "Context Size",
                description: "Number of context tokens to submit to the AI for sampling. Make sure this is higher than Output Length. Higher values increase VRAM/RAM usage.",
                default: 1024, min: 128, max: 4096, step: 8,
            },
            
            temperature: {
                title: "Temperature",
                description: "Randomness of sampling. Higher values can increase creativity, but make the output less meaningful. As the temperature approaches zero, the model will become deterministic and repetitive.",
                default: 0.5, min: 0, max: 2, step: 0.01,
            },
            
            frequency_penalty: {
                title: "Frequency Penalty",
                description: "ow much to penalize new tokens based on their existing frequency in the text so far. Decreases the model's likelihood to repeat the same line verbatim.",
                default: 0, min: 0, max: 2, step: 0.01,
            },
            
            presence_penalty: {
                title: "Presence Penalty",
                description: "How much to penalize new tokens based on whether they appear in the text so far. Increases the model's likelihood to talk about new topics.",
                default: 0, min: 0, max: 2, step: 0.01,
            },
            
            top_p: {
                title: "top_p",
                description: "Used to discard unlikely text in the sampling process. Lower values will make the output more predictable, but also repetitive. Put this value on 1 to disable its effect.",
                default: 0.9, min: 0, max: 1, step: 0.01,
                advanced: true,
            }
        }
    }

    SetFrom( source ){
        if( source ){
            this.api_mode = source.api_mode ? source.api_mode : "pygmalion"
            this.api_target = source.api_target ? source.api_target : ""
        }else{
            this.api_mode = "pygmalion"
            this.api_target = ""
        }

        let modes = Object.keys(Settings.subsets)
        for( let j = 0; j < modes.length; j++ ){
            let mode = modes[j]
            let subset = Settings.subsets[mode]
            let keys = Object.keys(subset)

            if( !this[mode] ){
                this[mode] = {}
            }

            for( let i = 0; i < keys.length; i++ ){
                let key = keys[i]

                if( source && source[mode] && source[mode][key] ){
                    this[mode][key] = source[mode][key]
                }else{
                    this[mode][key] = subset[key].default
                }
            }
        }
    }
}

exports.Settings = Settings