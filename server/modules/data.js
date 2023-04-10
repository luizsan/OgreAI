import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs"
import { join, dirname } from "path"

function SaveData(file_path, content){
    try{
        let target = join(file_path)
        writeFileSync(target, JSON.stringify(content, null, 2))
        console.debug(`Saved file at ${target}`)
    }catch(error){
        console.warn("Could not save data\n" + error)
    }
}

function LoadData(file_path, defaults){
    let dir = dirname(file_path)
    if( !existsSync(dir)){
        mkdirSync(dir, { recursive: true })
    }

    let target = join(file_path)
    try {
        let content = readFileSync(target, "utf-8")
        let parsed = JSON.parse( content )
        console.debug(`Loaded data at ${target}`)
        return parsed;
    }catch(error) {
        console.warn(`Could not load file at ${target}, using default values.`)
    }
    
    try{
        writeFileSync(target, JSON.stringify( defaults, null, 2))
        return defaults;
    }catch(error){
        console.error(`Unable to write defaults at ${target}`)
    }
}

const _SaveData = SaveData
export { _SaveData as SaveData }
const _LoadData = LoadData
export { _LoadData as LoadData }