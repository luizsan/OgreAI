export default class Settings{
    static path = "../user/settings.json"

    constructor(){
        this.SetFrom( null );
    }

    SetFrom( source, mode, subset ){
        if( source ){
            this.api_mode = source.api_mode ? source.api_mode : "openai"
            this.api_url = source.api_url ? source.api_url : ""
            this.api_auth = source.api_auth ? source.api_auth : ""
        }else{
            this.api_mode = "openai"
            this.api_url = ""
            this.api_auth = ""
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