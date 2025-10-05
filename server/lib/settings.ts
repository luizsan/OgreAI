import {
    ISettings,
    IAPISettings
} from "../../shared/types.js"

import fs from "fs"
import path from "path"

import * as Config from "../core/config.ts"
import * as Prompt from "./prompt.ts"


export const recents_list_size = 20
export const default_prompt_categories = Object.keys(Prompt.default_order)
export const default_preset_categories = [ "api_auth", "base_prompt", "sub_prompt", "prefill_prompt", "persona" ]

export function ValidateMain(obj: ISettings, api_modes: string[]){
    if( !obj.api_mode ){
        obj.api_mode = api_modes[0]
    }

    if( !obj.formatting ){
        obj.formatting = {}
    }

    if( !obj.formatting?.replace || !Array.isArray(obj.formatting?.replace)){
        obj.formatting = { replace: [] }
    }

    if( !obj.recents ){
        obj.recents = []
    }
}

export function ValidateAPI(obj: any, api_settings: Record<string, IAPISettings>){
    obj.api_url = obj.api_url || ""
    obj.api_auth = obj.api_auth || ""
    obj.prompt = obj.propmt ?? []

    const keys = Object.keys(api_settings)
    keys.forEach(key => {
        if( obj[key] === undefined || typeof obj[key] !== typeof api_settings[key].default ){
            obj[key] = api_settings[key].default
        }
    })
    obj.prompt = Prompt.Validate(obj.prompt)
}

export default null