class Settings{
    constructor(){
        this.SetFrom( null );
    }

    static path = "./user/settings.json"

    SetFrom( source, mode, subset ){
        if( source ){
            this.api_mode = source.api_mode ? source.api_mode : "openai"
            this.api_target = source.api_target ? source.api_target : ""
        }else{
            this.api_mode = "openai"
            this.api_target = ""
        }

        if( subset && mode ){
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

const _Settings = Settings;
export { _Settings as Settings };