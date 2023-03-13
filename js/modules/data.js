const fs = require("fs")
const path = require("path")

function SaveData(file_path, content){
    try{
        let target = path.join(file_path)
        fs.writeFileSync(target, JSON.stringify(content, null, 2))
        console.debug(`Saved file at ${target}`)
    }catch(error){
        console.warn("Could not save data\n" + error)
    }
}

function LoadData(file_path, defaults){
    let dir = path.dirname(file_path)
    if( !fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true })
    }

    let target = path.join(file_path)
    try {
        let content = fs.readFileSync(target, "utf-8")
        let parsed = JSON.parse( content )
        console.debug(`Loaded data at ${target}`)
        return parsed;
    }catch(error) {
        console.warn(`Could not load file at ${target}, using default values.`)
    }
    
    try{
        fs.writeFileSync(target, JSON.stringify( defaults, null, 2))
        return defaults;
    }catch(error){
        console.error(`Unable to write defaults at ${target}`)
    }
}

exports.SaveData = SaveData
exports.LoadData = LoadData