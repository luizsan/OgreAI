export default class Settings{
    static path = "../user/settings.json"

    constructor(){
        Settings.Validate( {}, {} );
    }

    static Validate(obj, api_modes){
        if( !obj.presets ){
            obj.presets = {}
        }
    
        if( !obj.presets.auth ){ 
            obj.presets.auth = [] 
        }

        if( !obj.presets.base_prompt ){ 
            obj.presets.base_prompt = []
        }

        if( !obj.presets.sub_prompt ){ 
            obj.presets.sub_prompt = []
        }

        if( !obj.presets.prefill_prompt ){ 
            obj.presets.prefill_prompt = []
        }

        if( !obj.formatting ){
            obj.formatting = {}
        }
    
        if( !obj.formatting.replace ){ 
            obj.formatting.replace = []
        }

        // sanitize settings based on available API modes
        Object.keys( api_modes ).forEach(mode => {
            if( !obj[mode] ){
                obj[mode] = {}
            }

            if( !obj[mode].api_url ){ 
                obj[mode].api_url = ""; 
            }

            if( !obj[mode].api_auth ){ 
                obj[mode].api_auth = ""; 
            }

            Object.keys( api_modes[mode].API_SETTINGS ).forEach(key => {
                if( !(key in obj[mode] )){
                    obj[mode][key] = api_modes[mode].API_SETTINGS[key].default
                }
            })
        })

    }
}