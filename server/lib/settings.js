import Prompt from "./prompt.js"

export default class Settings{
    static path = "../user/settings/"
    static file = "main.json"

    static ValidateMain(obj, api_modes){
        if( !obj.api_mode ){
            obj.api_mode = api_modes[0]
        }

        if( !obj.formatting ){
            obj.formatting = {}
        }

        if( !obj.formatting.replace ){ 
            obj.formatting.replace = []
        }
    }

    static ValidateAPI(obj, api_mode){
        if( !obj.api_url ){
            obj.api_url = ""
        }
        
        if( !obj.api_auth ){
            obj.api_auth = ""
        }

        Object.keys( api_mode.API_SETTINGS ).forEach(key => {
            if( !(key in obj) ){
                obj[key] = api_mode.API_SETTINGS[key].default
            }
        })

        if( !obj.prompt ){
            obj.prompt = []
        }

        obj.prompt = Prompt.Validate(obj.prompt)
    }
}