process.env.DEBUG = 'express:*';

import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import chalk from "chalk"
import multer from "multer";
import mime from "mime";

import open from "open"

import { Character } from "./lib/character.js"
import { Chat } from "./lib/chat.js"
import { LoadData, SaveData } from "./lib/data.js"
import { Profile } from "./lib/profile.js"
import { Settings } from "./lib/settings.js"


const __dirname = path.resolve("./")
const _userPath = path.join(__dirname, '../user').replace(/\\/g, '/');
const _imgPath = path.join(__dirname, '../img').replace(/\\/g, '/');
const _buildPath = path.join(__dirname, '../build').replace(/\\/g, '/');

const _modulePath = "./api/"
const app = express()
const port = 8000
const parser = express.json({ limit: "100mb" })
const upload = multer()

var API_MODES = {}
var API_LIST = []

app.use(cors())

app.use(express.static('public', {
    setHeaders: (res, path) => {
      if (mime.getType(path) === 'text/html') {
        res.setHeader('Content-Type', 'text/html');
      }
    }
}));

app.use('/user', express.static(_userPath, { fallthrough: false, index: false,  maxAge: -1  }));
app.use('/img', express.static(_imgPath, { fallthrough: false, index: false, maxAge: -1  }));
app.use('/', express.static(_buildPath, { maxAge: -1  }));

// startup 
await LoadAPIModes()

if( fs.existsSync(_buildPath) ){
    const args = process.argv.slice(2)
    if (args.includes('--autorun')) {
        open( "http://localhost:" + port )
    }
}

app.listen(port, () => {
    console.log( chalk.cyan.bold( "\nStarted OgreAI server at:" ))
    console.log( chalk.white.bold( " > ") + chalk.blue("http://localhost:" + port + "\n" ))
})

app.get("/status", parser, function(_, response){
    response.sendStatus(200)
})

app.get("/get_profile", parser, function(_, response){
    let profile = LoadData(Profile.path, new Profile())
    if( !profile.name ){ profile.name = "You" }
    if( !profile.avatar ){ profile.avatar = "" }
    if( !profile.customization ){ profile.customization = {} }
    response.send( profile )
})

app.get("/get_settings", parser, function(_, response){
    let settings = LoadData(Settings.path, new Settings())

    if( !settings.presets ){
        settings.presets = {}
    }

    if( !settings.presets.auth ){ settings.presets.auth = [] }
    if( !settings.presets.base_prompt ){ settings.presets.base_prompt = [] }
    if( !settings.presets.sub_prompt ){ settings.presets.sub_prompt = [] }
    if( !settings.presets.prefill_prompt ){ settings.presets.prefill_prompt = [] }

    // sanitize settings based on available API modes
    Object.keys( API_MODES ).forEach(mode => {
        if( !settings[mode] ){
            settings[mode] = {}
        }

        if( !settings[mode].api_url ){ settings[mode].api_url = ""; }
        if( !settings[mode].api_auth ){ settings[mode].api_auth = ""; }

        Object.keys( API_MODES[mode].API_SETTINGS ).forEach(key => {
            if( settings[mode][key] === undefined ){
                settings[mode][key] = API_MODES[mode].API_SETTINGS[key].default
            }
        })
    })

    response.send( settings )
})

app.post("/get_api_status", parser, async function(request, response){
    let mode = request.body && request.body.api_mode ? request.body.api_mode : "";
    if( !API_MODES[mode] ){
        const msg = "Trying to fetch non-existent API"
        console.error( chalk.red(msg))
        response.status(500).send(false)
        return
    }

    await API_MODES[mode].getStatus( request.body.settings ).then((result) => {
        response.send(result)
    }).catch((error) => {
        console.error(error)
        response.status(500).send(false)
    })
})

app.post("/save_profile", parser, function(request, response){
    SaveData( Profile.path, request.body )
    response.send(true)
})

app.post("/save_settings", parser, function(request, response){
    SaveData( Settings.path, request.body )
    response.send(true)
})

app.get("/get_characters", parser, function(_, response){
    console.debug( chalk.blue( `Fetching characters from ${Character.path}` ))
    let list = Character.LoadFromDirectory(Character.path)
    response.send(list)
});

app.post("/get_character", parser, function(request, response){
    let filepath = request.body.filepath
    console.debug( chalk.blue( `Reading character from ${ filepath }` ))
    let character = Character.ReadFromFile( filepath )
    response.send(character)
});

app.post("/get_character_tokens", parser, function(request, response){
    let api = API_MODES[ request.body.api_mode ]
    let tokens = api.getTokenConsumption( request.body.character, request.body.user, request.body.settings )
    response.send(tokens)
})

app.post("/get_chats", parser, function(request, response){
    let chats = Chat.GetAllChats(request.body.character)
    if( !chats ){ chats = [] }
    response.send(chats)
});

app.post("/new_chat", parser, function(request, response){
    try{
        response.send(new Chat(request.body.character))
    }catch(error){
        console.error( chalk.red( error ))
    }
})

app.post("/save_chat", parser, function(request, response){
    let result = Chat.Save( request.body.chat, request.body.character )
    response.send( result )
})

app.post("/copy_chat", parser, function(request, response){
    const now = Date.now();

    let copy = request.body.chat;
    copy.title = now;
    copy.create_date = now;
    copy.last_interaction = now;

    let result = Chat.Save( copy, request.body.character )
    response.send( result )
})

app.post("/delete_chat", parser, function(request, response){
    let result = Chat.Delete( request.body.character, request.body.create_date )
    response.send( result )
})

app.get("/new_character", parser, function(request, response){
    response.send(new Character())    
})

app.post("/save_character", upload.single("file"), function(request, response){
    const char = JSON.parse(request.body.character)
    let filepath = request.body.filepath
    let image = request.file ? request.file.buffer : null
    if( request.body.creating && !image ){
        image = fs.readFileSync( path.join( __dirname, "../img/bot_default.png" ))
    }
    
    if( !filepath.toLowerCase().startsWith( Character.path )){
        filepath = path.join( Character.path, filepath )
    }

    if( !filepath.toLowerCase().endsWith(".png")){
        filepath += ".png"
    }

    char.metadata.modified = Date.now()
    let result = Character.WriteToFile( char, filepath, image )
    response.send( result )
})

app.post("/delete_character", parser, function(request, response){
    let filepath = request.body.filepath
    if( !filepath.toLowerCase().startsWith( Character.path )){
        filepath = path.join( Character.path, filepath )
    }
    try{
        fs.unlinkSync(filepath)
        console.error( chalk.red( `Deleted character at ${filepath}` ))
        response.send( true )
    }catch(error){
        console.error( chalk.red( error ))
        response.send( false )
    }
})

app.get("/get_api_modes", parser, async function(_, response){
    response.send( API_LIST )
})

app.post("/get_api_settings", parser, function(request, response){
    let api = API_MODES[request.body.api_mode]
    if( api && api.API_SETTINGS ){
        response.send( api.API_SETTINGS )
    }else{
        response.status(500).send({})
    }
})

app.post("/generate", parser, async function(request, response){
    let api = API_MODES[request.body.api_mode]
    if( api && api.generate ){
        
        let char = request.body.character;
        let messages = request.body.messages;
        let user = request.body.user;
        let settings = request.body.settings;
        let swipe =  request.body.swipe;
        let streaming = request.body.settings.stream;

        let prompt = api.makePrompt( char, messages, user, settings, swipe ? 1 : 0 )
        api.generate( char, prompt, user, settings, swipe ).then(async result => {
            if( streaming ){
                try{
                    console.debug( chalk.blue("Streaming message..."))
                    const td = new TextDecoder();
                    for await (const message of result.body){
                        let data = api.receiveStream( td.decode(message), swipe )
                        if( data ){
                            // console.debug( chalk.blue("%o"), data)
                            // the newline at the end is required as sometimes the stream 
                            // can lag and the client will clump chunks together, so it's 
                            // easier to separate them by lines instead.
                            response.write(JSON.stringify(data) + "\n")
                        }
                    }
                    response.end()
                    console.debug( chalk.blue("Finished message stream"))
                }catch(error){
                    console.error( chalk.red("Error in message stream:"))
                    console.error( chalk.red(error))
                }
            }else{
                result.text().then(raw => {
                    let data = api.receiveData( raw, swipe )     
                    console.debug( chalk.blue( "Received message" ))
                    response.send(data);
                })
            }
        }).catch(error => {
            console.error( chalk.red( error ))
            response.status(error.status).send({ error: error })
        });
    }else{
        const error = "Cannot generate message: Invalid API"
        console.error( chalk.red( error ))
        response.status(500).send({ error: error })
    }
})

async function LoadAPIModes(){
    API_MODES = {}
    API_LIST = []
    let files = fs.readdirSync(_modulePath)
    console.debug("")
    for( let i = 0; i < files.length; i++ ){
        try{
            let filepath = path.join("file://", __dirname, _modulePath, files[i] ).replaceAll("\\", "/");
            let target = path.basename( files[i], ".js" )
            let api = await import(filepath).then((module) => module.default);
            
            if( !ValidateAPIMode(api) ){
                console.warn( chalk.yellow( `Could not load API module "${target}": Invalid export, missing function or missing field` ))
                continue
            }

            API_MODES[target] = api
            API_LIST.push({ key: target, title: API_MODES[target].API_NAME })
            console.debug( chalk.green( `Loaded "${target}" API module`))
        }catch(error){
            console.error( chalk.red( error ))
        }
    }
    console.debug( chalk.green( `Loaded ${API_LIST.length} API module(s)`))
    return API_LIST;
}

// checks for all required components for an api module to work
function ValidateAPIMode(api){
    if( !api ) return false;
    if( !api.API_NAME ) return false;
    if( !api.API_SETTINGS ) return false;
    if( !api.getStatus ) return false;
    if( !api.getTokenConsumption ) return false;
    if( !api.makePrompt ) return false;
    if( !api.generate ) return false;
    if( !api.receiveData ) return false;
    return true;
}

function IsSubfolder(parent, sub){
    const relative = path.relative(parent, sub);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
}