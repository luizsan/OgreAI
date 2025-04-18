process.env.DEBUG = 'express:*';

import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import chalk from "chalk"
import multer from "multer";
import mime from "mime";
import open from "open"

import Security from "./core/security.js"
import Character from "./lib/character.js"
import Chat from "./lib/chat.js"
import { LoadData, SaveData } from "./lib/data.js"
import Profile from "./lib/profile.js"
import Settings from "./lib/settings.js"
import Presets from "./lib/presets.js"
import Prompt from "./lib/prompt.js"
import Lorebook from "./lib/lorebook.js"


const __dirname = path.resolve("./")
const _userPath = path.join(__dirname, '../user').replace(/\\/g, '/');
const _imgPath = path.join(__dirname, '../img').replace(/\\/g, '/');
const _buildPath = path.join(__dirname, '../build').replace(/\\/g, '/');

const _modulePath = "./api/"
const app = express()
const port = 12480
const parser = express.json({ limit: "100mb" })
const upload = multer()

var API_MODES = {}
var API_LIST = []

app.use(Security.whitelistMiddleware)
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
    Profile.Validate(profile)
    response.send( profile )
})

app.get("/get_main_settings", parser, function(_, response){
    const filepath = path.join(Settings.path, Settings.file)
    let settings = LoadData(filepath)
    Settings.ValidateMain(settings, Object.keys(API_MODES))
    response.send( settings )
})

app.post("/get_api_settings", parser, function(request, response){
    if( !request.body || !request.body.api_mode || !API_MODES[request.body.api_mode]){
        response.status(500).send({})
        return
    }

    const mode = request.body.api_mode
    const filepath = path.join(Settings.path, mode, Settings.file )
    let settings = LoadData(filepath)
    Settings.ValidateAPI(settings, API_MODES[mode] )
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

app.post("/save_main_settings", parser, function(request, response){
    const filepath = path.join(Settings.path, Settings.file)
    SaveData( filepath, request.body.data )
    response.send(true)
})

app.post("/save_api_settings", parser, function(request, response){
    if( !request.body || !request.body.api_mode || !API_MODES[request.body.api_mode]){
        response.send(false)
        return
    }

    const mode = request.body.api_mode
    const filepath = path.join(Settings.path, mode, Settings.file )
    SaveData( filepath, request.body.data )
    response.send(true)
})

app.post("/get_presets", parser, function(request, response){
    if( !request.body || !request.body.type || !Presets.categories.includes( request.body.type )){
        let obj = {}
        for( let i = 0; i < Presets.categories.length; i++ ){
            let type = Presets.categories[i]
            let filepath = path.join(Presets.path, type + ".json")
            let presets = LoadData(filepath, [])
            obj[type] = presets
        }
        response.send( obj )
    }else{
        const type = request.body.type
        const filepath = path.join(Presets.path, type + ".json")
        let presets = LoadData(filepath)
        response.send( presets )
    }
})

app.post("/save_presets", parser, function(request, response){
    if( !request.body || !request.body.type || !Presets.categories.includes( request.body.type )){
        response.send( false )
        return
    }

    const type = request.body.type
    const filepath = path.join(Presets.path, type + ".json")
    SaveData( filepath, request.body.data )
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
    let tokens = api.getCharacterTokens( request.body.character, request.body.user, request.body.settings )
    response.send(tokens)
})

app.post("/get_message_tokens", parser, function(request, response){
    let api = API_MODES[ request.body.api_mode ]
    let tokens = request.body.messages.map(message => {
        return api.getMessageTokens(
            message,
            request.body.character,
            request.body.user,
            request.body.settings
        )
    })
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
    copy.title = request.body.name ? request.body.name : now;
    copy.create_date = now;
    copy.last_interaction = now;

    let result = Chat.Save( copy, request.body.character )
    response.send( result )
})

app.post("/delete_chat", parser, function(request, response){
    let result = Chat.Delete( request.body.chat )
    response.send( result )
})

app.get("/new_character", parser, function(request, response){
    response.send(new Character())
})

app.post("/save_character_image", upload.single("file"), function(request, response){
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

app.post("/save_character", parser, function(request, response){
    const char = request.body.character
    let filepath = request.body.filepath || char.temp.filepath
    if( !filepath.toLowerCase().startsWith( Character.path )){
        filepath = path.join( Character.path, filepath )
    }
    if( !filepath.toLowerCase().endsWith(".png")){
        filepath += ".png"
    }
    char.metadata.modified = Date.now()
    let result = Character.WriteToFile( char, filepath, null )
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

app.get("/get_lorebooks", parser, function(_, response){
    response.send( Lorebook.GetAllLorebooks() )
})

app.post("/save_lorebook", parser, function(request, response){
    if( !request.body || !request.body.book ){
        response.status(500).send( false )
    }else{
        let book = request.body.book
        const success = Lorebook.Save( book )
        if( success ){
            response.status(200).send( true )
            return
        }
    }
    response.status(500).send( false )
})

app.post("/delete_lorebook", parser, function(request, response){
    if(!request.body || !request.body.book ){
        response.status(500).send(false)
    }else{
        response.send( Lorebook.Delete(request.body.book ))
        return
    }
    response.status(500).send(false)
})

app.get("/get_api_modes", parser, async function(_, response){
    response.send( API_LIST )
})

app.post("/get_api_defaults", parser, function(request, response){
    let api = API_MODES[request.body.api_mode]
    if( api && api.API_SETTINGS ){
        response.send( api.API_SETTINGS )
    }else{
        response.status(500).send({})
    }
})

app.get("/get_prompt", parser, function(_, response){
    response.send( Prompt.default )
})

app.post("/validate_prompt", parser, function(request, response){
    let valid = Prompt.Validate( request.body.prompt )
    response.status(200).send(valid)
})

app.post("/generate", parser, async function(request, response){
    if( !request.body || !request.body.api_mode ){
        response.status(500).send({})
    }

    let api = API_MODES[request.body.api_mode]
    if( api && api.generate ){
        const req = request.body;
        const content = {
            character: req.character,
            chat: req.chat,
            user: req.user,
            settings: req.settings,
            swipe: req.swipe,
            streaming: req.settings.stream,
            prompt: null,
            books: {
                character: req.character.data.character_book ?? {},
                global: req.books
            },
        }

        content.prompt = api.makePrompt( content, content.swipe ? 1 : 0 )
        api.generate( content ).then(async result => {
            if( content.streaming ){
                try{
                    console.debug( chalk.blue("Streaming message..."))
                    const td = new TextDecoder();
                    for await (const message of result.body){
                        let data = api.receiveStream( td.decode(message), content.swipe ?? false )
                        if( data && (data?.candidate || data?.streaming || data?.error)){
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
                    console.error( chalk.red("Error in message stream:\n" + error))
                }
            }else{
                result.text().then(raw => {
                    let data = api.receiveData( raw, content.swipe )
                    console.debug(chalk.blue("Received message"))
                    response.send(data);
                })
            }
        }).catch(error => {
            console.error(chalk.red(error))
            response.status(error.status ?? 500).send({
                error: {
                    message: `[${error.name}]: ${error.message}`
                }
            })
        });
    }else{
        const error = "Cannot generate message: Invalid API"
        console.error(chalk.red(error))
        response.status(500).send({ error: { message: error }})
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
            if( filepath.startsWith("./")){
                filepath = filepath.replace("./", "")
            }
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
    if( !api ){
        console.debug( chalk.red( "Invalid API" ))
        return false;
    }

    const check = [
        "API_NAME",
        "API_ADDRESS",
        "API_SETTINGS",
        "getStatus",
        "getCharacterTokens",
        "makePrompt",
        "generate",
        "receiveData"
    ]

    for( let i = 0; i < check.length; i++ ){
        if( !api[ check[i] ] ){
            console.debug( chalk.red( `Could not validate API. Missing or invalid '${check[i]}'` ))
            return false;
        }
    }

    return true;
}