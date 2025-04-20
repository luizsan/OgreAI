import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import chalk from "chalk"
import multer from "multer";
import mime from "mime";

// import API classes
import API from "./core/api.ts"
// ---
import Anthropic from "./api/anthropic.ts"
import DeepSeek from "./api/deepseek.ts"
import Google from "./api/google.ts"
import Mistral from "./api/mistral.ts"
import OpenAI from "./api/openai.ts"

import Security from "./core/security.ts"
import Character from "./lib/character.ts"
import Chat from "./lib/chat.ts"

import Profile from "./lib/profile.js"
import Settings from "./lib/settings.ts"
import Presets from "./lib/presets.ts"
import Lorebook from "./lib/lorebook.js"
import { Initialize, IServerConfig, LoadData, SaveData } from "./core/config.ts"
import { IError, IReply, ISettings } from "../shared/types.js";

const server_config: IServerConfig = await Initialize()

const __dirname: string = path.resolve("./")
const _userPath: string = path.join(__dirname, server_config.paths.user, "/").replace(/\\/g, '/');
const _imgPath: string = path.join(__dirname, '../img').replace(/\\/g, '/');
const _buildPath: string = path.join(__dirname, '../build').replace(/\\/g, '/');

const path_dir: Record<string, string> = {
    user: path.join(_userPath, "/").replace(/\\/g, '/'),
    avatar: path.join(_userPath, "/avatar/").replace(/\\/g, '/'),
    characters: path.join(_userPath, "/characters/").replace(/\\/g, '/'),
    chats: path.join(_userPath, "/chats/").replace(/\\/g, '/'),
    lorebooks: path.join(_userPath, "/lorebooks/").replace(/\\/g, '/'),
    presets: path.join(_userPath, "/presets/").replace(/\\/g, '/'),
    settings: path.join(_userPath, "/settings/").replace(/\\/g, '/'),
}

const app = express()
const parser = express.json({ limit: "100mb" })
const port: number = server_config.port || 12480;
const upload = multer();

var API_MODES: Record<string, API> = {
    "anthropic": new Anthropic(),
    "deepseek": new DeepSeek(),
    "google": new Google(),
    "mistral": new Mistral(),
    "openai": new OpenAI(),
}

var API_LIST: Array<{ key: string, title: string }> = []

LoadAPIModes()

app.use(Security.whitelist)
app.use(cors())

app.use(express.static('public', {
    setHeaders: (res: express.Response, path: string) => {
      if (mime.getType(path) === 'text/html') {
        res.setHeader('Content-Type', 'text/html');
      }
    }
}));

// Static files from the user directory served without any checks
app.use('/', express.static(_buildPath, { maxAge: -1  }));
app.use('/img', express.static(_imgPath, { fallthrough: false, index: false, maxAge: -1  }));
app.use('/user/avatar', express.static(path_dir.avatar, { fallthrough: false, index: false,  maxAge: -1  }));
app.use('/user/characters', express.static(path_dir.characters, { fallthrough: false, index: false,  maxAge: -1  }));

app.get("/status", parser, function(_, response){
    response.sendStatus(200)
})

app.get("/get_profile", parser, async function(_, response){
    let profile = await LoadData(Profile.path, new Profile())
    Profile.Validate(profile)
    response.send( profile )
})

app.get("/get_main_settings", parser, async function(_, response){
    const filepath = path.join(path_dir.settings, "main.json")
    let settings = await LoadData(filepath)
    Settings.ValidateMain(settings, Object.keys(API_MODES))
    response.send( settings )
})

app.post("/get_api_settings", parser, async function(request, response){
    try{
        const mode: string = request.body.api_mode
        const filepath: string = path.join(path_dir.settings, mode, "main.json")
        let settings: ISettings = await LoadData(filepath, {})
        // TODO: revalidate with TS
        // Settings.ValidateAPI(settings, API_MODES[mode].API_SETTINGS )
        response.send(settings)
    }catch(error){
        console.error(error)
        response.status(500).send({})
    }
})

app.post("/get_api_status", parser, async function(request, response){
    const mode: string = request.body?.api_mode ?? "";
    const settings: ISettings = request.body?.settings ?? {};
    const api: API = API_MODES[mode];
    if (!api || !(api instanceof API)) {
        console.error(chalk.red("Trying to fetch non-existent API"));
        return response.status(500).send(false);
    }
    try {
        console.debug(chalk.blue(`Checking ${api.API_NAME} API status...`));
        const result = await api.getStatus(settings);
        if (result){
            console.debug(chalk.green("✅ OK\n"));
            response.status(200).send(result);
            return
        }
    } catch (error) {
        console.error(error);
        response.status(500).send(false);
    }
    response.status(503).send(false);
    console.debug(chalk.red("❌ Failed\n"));
})

app.post("/save_profile", parser, async function(request, response){
    await SaveData( Profile.path, request.body )
    response.send(true)
})

app.post("/save_main_settings", parser, async function(request, response){
    const filepath = path.join(path_dir.settings, "main.json")
    await SaveData( filepath, request.body.data )
    response.send(true)
})

app.post("/save_api_settings", parser, async function(request, response){
    if( !request.body || !request.body.api_mode || !API_MODES[request.body.api_mode]){
        response.send(false)
        return
    }

    const mode = request.body.api_mode
    const filepath = path.join(path_dir.settings, mode, "main.json")
    await SaveData( filepath, request.body.data )
    response.send(true)
})

app.post("/get_presets", parser, async function(request, response){
    if (!request.body?.type || !Presets.categories.includes(request.body.type)) {
        const obj: Record<string, any[]> = {};
        Presets.categories.forEach(async type => {
            const filepath = path.join(path_dir.presets, `${type}.json`);
            obj[type] = await LoadData(filepath, []);
        });
        response.send(obj);
    } else {
        const filepath = path.join(path_dir.presets, `${request.body.type}.json`);
        response.send( await LoadData(filepath));
    }
})

app.post("/save_presets", parser, async function(request, response){
    if( !request.body || !request.body.type || !Presets.categories.includes( request.body.type )){
        response.send( false )
        return
    }

    const type = request.body.type
    const filepath = path.join(path_dir.presets, type + ".json")
    await SaveData( filepath, request.body.data )
    response.send(true)
})


app.get("/get_characters", parser, function(_, response){
    let dir: string = path.join( _userPath, "characters" ).replaceAll("\\", "/");
    console.debug( chalk.blue( `Fetching characters from ${dir}` ))
    let list = Character.LoadFromDirectory(dir)
    response.send(list)
});

app.post("/get_character", parser, function(request, response){
    let filepath = request.body.filepath
    console.debug( chalk.blue( `Reading character from ${ filepath }` ))
    let character = Character.ReadFromFile( path.join( path_dir.characters, filepath ))
    if( character ){
        character.temp.filepath = filepath
    }
    response.send(character)
});

app.post("/get_character_tokens", parser, function(request, response){
    let api: API = API_MODES[ request.body.api_mode ]
    let tokens: Record<string, number> = api.getCharacterTokens(
        request.body.character,
        request.body.user,
        request.body.settings
    )
    response.send(tokens)
})

app.post("/get_message_tokens", parser, function(request, response){
    let api = API_MODES[ request.body.api_mode ]
    let tokens = request.body.messages.map(message => {
        return api.getTokenCount(
            message.candidates[message.index].text,
            request.body.settings.model
        )
    })
    response.send(tokens)
})

app.post("/get_chats", parser, function(request, response){
    let chats = Chat.GetAllChats(request.body.character, path_dir.chats )
    if( !chats ){ chats = [] }
    response.send(chats)
});

app.post("/new_chat", parser, function(request, response){
    try{
        response.send(Chat.create(request.body.character))
    }catch(error){
        console.error( chalk.red( error ))
    }
})

app.post("/save_chat", parser, function(request, response){
    let result = Chat.Save( request.body.chat, request.body.character, path_dir.chats )
    response.send( result )
})

app.post("/copy_chat", parser, function(request, response){
    const now = Date.now();

    let copy = request.body.chat;
    copy.title = request.body.name ? request.body.name : now;
    copy.create_date = now;
    copy.last_interaction = now;

    let result = Chat.Save( copy, request.body.character, path_dir.chats )
    response.send( result )
})

app.post("/delete_chat", parser, function(request, response){
    let result = Chat.Delete( request.body.chat )
    response.send( result )
})

app.get("/new_character", parser, function(request, response){
    response.send(Character.create())
})

app.post("/save_character_image", upload.single("file"), function(request, response){
    const char = JSON.parse(request.body.character)
    let image = request.file ? request.file.buffer : null
    let filepath = request.body.filepath
    filepath = path.join( path_dir.characters, filepath )
    if( request.body.creating && !image ){
        image = fs.readFileSync( path.join( __dirname, "../img/bot_default.png" ))
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
    filepath = path.join( path_dir.characters, filepath )
    if( !filepath.toLowerCase().endsWith(".png")){
        filepath += ".png"
    }
    char.metadata.modified = Date.now()
    let result = Character.WriteToFile( char, filepath, null )
    response.send( result )
})

app.post("/delete_character", parser, function(request, response){
    let filepath = request.body.filepath
    const dir: string = path.join( _userPath, "characters" )
    if( !filepath.toLowerCase().startsWith( dir )){
        filepath = path.join( dir, filepath )
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
    response.send( Lorebook.GetAllLorebooks(path_dir.lorebooks) )
})

app.post("/save_lorebook", parser, function(request, response){
    if( !request.body || !request.body.book ){
        response.status(500).send( false )
    }else{
        let book = request.body.book
        const success = Lorebook.Save( book, path_dir.lorebooks )
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
    let api: API = API_MODES[request.body.api_mode]
    try{
        response.send(JSON.stringify( api.API_SETTINGS ))
    }catch(error: any){
        console.error(error)
        response.status(500).send({})
    }
})

app.get("/get_prompt", parser, function(_, response){
    response.send( Settings.default_prompt_order )
})

app.post("/validate_prompt", parser, function(request, response){
    let valid = Settings.ValidatePrompt( request.body.prompt )
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
                        let data: IReply | IError = api.receiveStream( td.decode(message), content.swipe ?? false )
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

// ==============================================================================================
// Runtime
// ==============================================================================================

async function LoadAPIModes(){
    console.log("---")
    Object.entries(API_MODES).forEach(([key, api]) => {
        if( api instanceof API ){
            console.debug( chalk.green( `✅ API module "${api.API_NAME}" enabled`))
            API_LIST.push({ key: key, title: api.API_NAME })
        }
    })
    if (API_LIST.length > 0) {
        console.debug( "---")
        console.debug( chalk.green( `Loaded ${API_LIST.length} API module(s)`))
    }
    return API_LIST;
}

// ==============================================================================================
// Execution
// ==============================================================================================

// Start the server
app.listen(port, () => {
    console.log( chalk.cyan.bold( "\nStarted OgreAI server at:" ))
    console.log( chalk.white.bold( " > ") + chalk.blue("http://localhost:" + port + "\n" ))
})
