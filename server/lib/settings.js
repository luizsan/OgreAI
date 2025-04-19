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

    static ValidateAPI(obj, api_settings){
        if( !obj.api_url ){
            obj.api_url = ""
        }

        if( !obj.api_auth ){
            obj.api_auth = ""
        }

        Object.entries( api_settings ).forEach(key => {
            if( !(key in obj) ){
                obj[key] = api_settings[key].default
            }
        })

        if( !obj.prompt ){
            obj.prompt = []
        }

        obj.prompt = Prompt.Validate(obj.prompt)
    }
}