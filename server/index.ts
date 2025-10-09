import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import chalk from "chalk"
import multer from "multer";
import mime from "mime";
import os from "os";

// core modules
import API from "./core/api.ts"
import Security from "./core/security.ts"
import * as Config from "./core/config.ts"
import * as _Database from "./core/database.ts"

// API modules
import Anthropic from "./api/anthropic.ts"
import DeepSeek from "./api/deepseek.ts"
import Google from "./api/google.ts"
import Mistral from "./api/mistral.ts"
import OpenAI from "./api/openai.ts"
import xAI from "./api/xai.ts"
import ZAI from "./api/zai.ts"

// data modules
import * as Character from "./lib/character.ts"
import * as Chat from "./lib/chat.ts"
import * as Prompt from "./lib/prompt.ts"
import Profile from "./lib/profile.ts"
import * as Settings from "./lib/settings.ts"
import * as Lorebook from "./lib/lorebook.ts"

import type {
    ICandidate,
    IChat,
    IError,
    IGenerationData,
    IMessage,
    IPromptConfig,
    IReply,
    ISettings,
    IUser
} from "../shared/types.d.ts";

const app = express()
const parser = express.json({ limit: "100mb" })
const port = Config.server.port || 12480;
const upload = multer();

var API_MODES: Record<string, API> = {
    "anthropic": new Anthropic(),
    "deepseek": new DeepSeek(),
    "google": new Google(),
    "mistral": new Mistral(),
    "openai": new OpenAI(),
    "xai": new xAI(),
    "zai": new ZAI(),
}

var API_LIST: Array<{ key: string, title: string }> = []

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
app.use('/', express.static(Config.htmlPath, { maxAge: -1  }));
app.use('/img', express.static(Config.imgPath, { fallthrough: false, index: false, maxAge: -1  }));
app.use('/user/avatar', express.static(Config.path_dir.avatar, { fallthrough: false, index: false,  maxAge: -1  }));
app.use('/user/characters', express.static(Config.path_dir.characters, { fallthrough: false, index: false,  maxAge: -1  }));

app.get("/status", parser, function(_: express.Request, response: express.Response){
    response.sendStatus(200)
})

app.get("/get_profile", parser, async function(_: express.Request, response: express.Response){
    let user_default: IUser = Profile.create()
    let user_profile = await Config.LoadData( path.join(Config.path_dir.user, "profile.json"), user_default)
    Profile.Validate(user_profile, user_default)
    response.send( user_profile )
})

app.get("/get_main_settings", parser, async function(_: express.Request, response: express.Response){
    const filepath = path.join(Config.path_dir.settings, "main.json")
    let settings = await Config.LoadData(filepath)
    Settings.ValidateMain(settings, Object.keys(API_MODES))
    response.send( settings )
})

app.post("/get_api_settings", parser, async function(request: express.Request, response: express.Response){
    try{
        const mode: string = request.body.api_mode
        const filepath: string = path.join(Config.path_dir.settings, mode, "main.json")
        let settings: ISettings = await Config.LoadData(filepath, {})
        Settings.ValidateAPI(settings, API_MODES[mode].API_SETTINGS )
        response.send(settings)
    }catch(error){
        console.error(error)
        response.status(500).send({})
    }
})

app.post("/get_api_prompt", parser, async function(request: express.Request, response: express.Response){
    try{
        const mode: string = request.body.api_mode
        const filepath: string = path.join(Config.path_dir.settings, mode, "prompt.json")
        let prompt: Array<IPromptConfig> = await Config.LoadData(filepath, null)
        if( !prompt ){
            prompt = []
            Object.keys(Prompt.default_order).forEach((key: string) => {
                if( key === "custom" ) return
                prompt.push({ key: key, ...Prompt.default_order[key] })
            })
        }
        Prompt.Validate(prompt)
        response.send(prompt)
    }catch(error){
        console.error(error)
        response.status(500).send([])
    }
})

app.post("/get_api_status", parser, async function(request: express.Request, response: express.Response){
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
            console.debug(chalk.green(`${api.API_NAME} API status\n✅ OK\n`));
            response.status(200).send(result);
            return
        }
    } catch (error) {
        console.error(error);
        response.status(500).send(false);
    }
    response.status(503).send(false);
    console.debug(chalk.red(`${api.API_NAME} API status\n❌ Failed\n`));
})

app.post("/save_profile", parser, async function(request: express.Request, response: express.Response){
    let user_default: IUser = Profile.create()
    let user_profile = request.body
    Profile.Validate(user_profile, user_default)
    const ok = await Config.SaveData( path.join(Config.path_dir.user, "profile.json"), user_profile )
    response.send(ok)
})

app.post("/save_main_settings", parser, async function(request: express.Request, response: express.Response){
    const filepath = path.join(Config.path_dir.settings, "main.json")
    const ok = await Config.SaveData( filepath, request.body.data )
    response.send(ok)
})

app.post("/save_api_settings", parser, async function(request: express.Request, response: express.Response){
    if( !request.body || !request.body.api_mode || !API_MODES[request.body.api_mode]){
        response.send(false)
        return
    }
    const mode = request.body.api_mode
    const filepath = path.join(Config.path_dir.settings, mode, "main.json")
    const ok = await Config.SaveData( filepath, request.body.data )
    response.send(ok)
})

app.post("/save_api_prompt", parser, async function(request: express.Request, response: express.Response){
    if( !request.body || !request.body.api_mode || !API_MODES[request.body.api_mode]){
        response.send(false)
        return
    }
    const mode = request.body.api_mode
    const filepath = path.join(Config.path_dir.settings, mode, "prompt.json")
    const ok = await Config.SaveData( filepath, request.body.data )
    response.send(ok)
})

app.post("/get_presets", parser, async function(request: express.Request, response: express.Response){
    if (!request.body?.type || !Settings.default_preset_categories.includes(request.body.type)) {
        const obj: Record<string, any[]> = {};
        await Promise.all(
            Settings.default_preset_categories.map(async (type) => {
                const filepath = path.join(Config.path_dir.presets, `${type}.json`);
                const data = await Config.LoadData(filepath, []);
                obj[type] = data;
            })
        );
        response.send(obj);
    } else {
        const filepath = path.join(Config.path_dir.presets, `${request.body.type}.json`);
        const data = await Config.LoadData(filepath, []);
        response.send(data)
    }
})

app.post("/save_presets", parser, async function(request: express.Request, response: express.Response){
    if( !request.body || !request.body.type || !Settings.default_preset_categories.includes( request.body.type )){
        response.send( false )
        return
    }

    const type = request.body.type
    const filepath = path.join(Config.path_dir.presets, type + ".json")
    const ok = await Config.SaveData( filepath, request.body.data )
    response.send(ok)
})


app.get("/get_characters", parser, function(_: express.Request, response: express.Response){
    let dir: string = path.join( Config.userPath, "characters" ).replaceAll("\\", "/");
    console.debug( chalk.blue( `Fetching characters from ${dir}` ))
    let list = Character.LoadFromDirectory(dir)
    response.send(list)
});

app.post("/get_character", parser, function(request: express.Request, response: express.Response){
    let filepath = request.body.filepath
    console.debug( chalk.blue( `Reading character from ${ filepath }` ))
    let character = Character.ReadFromFile( path.join( Config.path_dir.characters, filepath ))
    if( character ){
        character.temp.filepath = filepath
    }
    response.send(character)
});

app.post("/get_character_tokens", parser, function(request: express.Request, response: express.Response){
    let api: API = API_MODES[ request.body.api_mode ]
    let tokens: Record<string, number> = api.getCharacterTokens(
        request.body.character,
        request.body.user,
        request.body.settings
    )
    response.send(tokens)
})

app.post("/get_message_tokens", parser, function(request: express.Request, response: express.Response){
    let api = API_MODES[ request.body.api_mode ]
    let tokens = request.body.messages.map(message => {
        return api.getTokenCount(
            message.candidates[message.index].text,
            request.body.settings.model
        )
    })
    response.send(tokens)
})

app.post("/new_chat", parser, function(request: express.Request, response: express.Response){
    const chat: IChat = Chat.New(request.body.character)
    response.send(chat)
})

app.post("/create_chat", parser, function(request: express.Request, response: express.Response){
    const name: string = path.parse(request.body.character.temp.filepath).name
    const chat: IChat = Chat.Create(name, request.body.chat, true)
    response.send(chat)
})

app.post("/list_chats", parser, function(request: express.Request, response: express.Response){
    let id: string = path.parse(request.body.character_id).name
    let chats: Array<IChat> = Chat.ListChatsForCharacter(id)
    response.send(chats)
});

app.post("/load_chat", parser, function(request: express.Request, response: express.Response){
    let chat: IChat = Chat.Load(request.body.id)
    response.send(chat)
})

app.post("/update_chat", parser, function(request: express.Request, response: express.Response){
    const success: boolean = Chat.Update(request.body.chat)
    response.send(success)
})

app.post("/duplicate_chat", parser, function(request: express.Request, response: express.Response){
    const chat_id: number = Chat.Duplicate(request.body.chat, request.body.title, request.body.branch ?? undefined)
    response.send(chat_id)
})

app.post("/add_message", parser, function(request: express.Request, response: express.Responseddd){
    const msg: IMessage = Chat.AddMessage(request.body.chat.id, request.body.message)
    response.send(msg)
})

app.post("/add_candidate", parser, function(request: express.Request, response: express.Response){
    const candidate: ICandidate = Chat.AddCandidate(request.body.message.id, request.body.candidate)
    response.send(candidate)
})

app.post("/load_message", parser, function(request: express.Request, response: express.Response){
    const message: IMessage = Chat.GetMessage(request.body.id)
    response.send(message)
})

app.post("/update_message", parser, function(request: express.Request, response: express.Response){
    const success: boolean = Chat.UpdateMessage(request.body.message)
    response.send(success)
})

app.post("/swipe_message", parser, function(request: express.Request, response: express.Response){
    const success: boolean = Chat.SwipeMessage(request.body.message, request.body.index)
    response.send(success)
})

app.post("/delete_messages", parser, function(request: express.Request, response: express.Response){
    const success: boolean = Chat.DeleteMessages(request.body.ids)
    response.send(success)
})

app.post("/update_candidate", parser, function(request: express.Request, response: express.Response){
    const success: boolean = Chat.UpdateCandidate(request.body.candidate)
    response.send(success)
})

app.post("/delete_candidate", parser, function(request: express.Request, response: express.Response){
    const success: boolean = Chat.DeleteCandidate(request.body.id)
    response.send(success)
})

app.post("/delete_chat", parser, function(request: express.Request, response: express.Response){
    const success: boolean = Chat.Delete( request.body.id )
    response.send( success )
})

app.get("/new_character", parser, function(_request: express.Request, response: express.Response){
    const character = Character.Create()
    response.send(character)
})

app.post("/save_character_image", upload.single("file"), async function(request: express.Request, response: express.Response){
    const char = JSON.parse(request.body.character)
    let image = request.file ? request.file.buffer : null
    let filepath = request.body.filepath
    filepath = path.join( Config.path_dir.characters, filepath )
    if( request.body.creating && !image ){
        image = fs.readFileSync( path.join( Config.imgPath, "bot_default.png" ))
    }
    if( !filepath.toLowerCase().endsWith(".png")){
        filepath += ".png"
    }
    char.metadata.modified = Date.now()
    let result = await Character.WriteToFile( char, filepath, image )
    response.send( result )
})

app.post("/save_character", parser, async function(request: express.Request, response: express.Response){
    const char = request.body.character
    let filepath = request.body.filepath || char.temp.filepath
    filepath = path.join( Config.path_dir.characters, filepath )
    if( !filepath.toLowerCase().endsWith(".png")){
        filepath += ".png"
    }
    char.metadata.modified = Date.now()
    let result = await Character.WriteToFile( char, filepath, null )
    response.send( result )
})

app.post("/delete_character", parser, function(request: express.Request, response: express.Response){
    let filepath = request.body.filepath
    const dir: string = path.join( Config.userPath, "characters" )
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

app.get("/get_lorebooks", parser, function(_: express.Request, response: express.Response){
    response.send( Lorebook.List() )
})

app.post("/save_lorebook", parser, function(request: express.Request, response: express.Response){
    try{
        let book = request.body.book
        const success = Lorebook.Save( book, {}, request.body.overwrite ?? false)
        response.status(200).send( success )
    }catch(error: any){
        console.error(error)
        response.status(500).send( false )
    }
})

app.post("/toggle_lorebook", parser, function(request: express.Request, response: express.Response){
    try{
        const book = request.body.book
        const state = request.body.state
        const success = Lorebook.Toggle( book, state )
        response.status(200).send( success )
    }catch(error: any){
        console.error(error)
        response.status(500).send( false )
    }
})

app.post("/delete_lorebook", parser, function(request: express.Request, response: express.Response){
    try{
        let book = request.body.book
        Lorebook.Delete( book )
        response.status(200).send(true)
    }catch(error: any){
        console.error(error)
        response.status(500).send(false)
    }
})

app.post("/count_chats", parser, function(request: express.Request, response: express.Response){
    try{
        response.status(200).send( Chat.Count() )
    }catch(error: any){
        console.error(error)
        response.status(500).send( false )
    }
})

app.post("/latest_chats", parser, function(request: express.Request, response: express.Response){
    try{
        response.status(200).send( Chat.Latest() )
    }catch(error: any){
        console.error(error)
        response.status(500).send( false )
    }
})

app.post("/chat_interaction", parser, function(request: express.Request, response: express.Response){
    try{
        const success = Chat.UpdateChatInteraction(request.body.chat, request.body.timestamp)
        response.status(200).send( success )
    }catch(error: any){
        console.error(error)
        response.status(500).send( false )
    }
})

app.post("/update_interactions", parser, function(request: express.Request, response: express.Response){
    try{
        const success = Chat.UpdateAllChatInteractions()
        response.status(200).send( success )
    }catch(error: any){
        console.error(error)
        response.status(500).send( false )
    }
})

app.post("/import_chats", parser, async function(_request: express.Request, response: express.Response){
    try{
        Chat.ImportChats()
        response.status(200).send(true)
    }catch(error: any){
        console.error(error)
        response.status(500).send(false)
    }
})

app.post("/import_lorebooks", parser, async function(_request: express.Request, response: express.Response){
    try{
        Lorebook.ImportLorebooks()
        response.status(200).send(true)
    }catch(error: any){
        console.error(error)
        response.status(500).send(false)
    }
})

app.get("/get_api_modes", parser, async function(_: express.Request, response: express.Response){
    response.send( API_LIST )
})

app.post("/get_api_defaults", parser, function(request: express.Request, response: express.Response){
    const api: API = API_MODES[request.body.api_mode]
    try{
        response.send(JSON.stringify( api.API_SETTINGS ))
    }catch(error: any){
        console.error(error)
        response.status(500).send({})
    }
})

app.get("/get_default_prompt", parser, function(_: express.Request, response: express.Response){
    response.send( Prompt.default_order )
})

app.post("/validate_prompt", parser, function(request: express.Request, response: express.Response){
    const valid = Prompt.Validate( request.body.prompt, request.body.type )
    response.status(200).send(valid)
})

app.post("/generate", parser, async function(request: express.Request, response: express.Response){
    if( !request.body || !request.body.api_mode ){
        response.status(500).send({})
    }

    let api = API_MODES[request.body.api_mode]
    if( api && api.generate ){
        const req = request.body;
        const data: IGenerationData = {
            character: req.character,
            chat: req.chat,
            user: req.user,
            settings: req.settings,
            prompt: req.prompt,
            swipe: req.swipe,
            streaming: req.settings.stream,
            books: req.books,
            output: null,
        }

        data.output = api.makePrompt( data, data.swipe ? 1 : 0 )
        api.__message_chunk = ""
        api.generate( data ).then(async result => {
            if( data.streaming ){
                try{
                    console.debug( chalk.blue("Streaming message..."))
                    const td = new TextDecoder();
                    for await (const message of result.body){
                        let received: IReply | IError = api.receiveStream( td.decode(message), data.swipe ?? false )
                        if( received ){
                            // console.debug( chalk.blue("%o"), data)
                            // the newline at the end is required as sometimes the stream
                            // can lag and the client will clump chunks together, so it's
                            // easier to separate them by lines instead.
                            response.write(JSON.stringify(received) + "\n")
                        }
                    }
                    response.end()
                    console.debug( chalk.blue("Finished message stream"))
                }catch(error){
                    console.error( chalk.red("Error in message stream:\n" + error))
                }
            }else{
                result.text().then(raw => {
                    let received: IReply | IError = api.receiveData( raw, data.swipe )
                    console.debug(chalk.blue("Received message"))
                    response.send(received);
                })
            }
        }).catch(error => {
            console.error(chalk.red(error))
            response.status(error.status ?? 500).send({ error: { type: error.name, message: error.message }})
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
    // console.log( "---" )
    Object.entries(API_MODES).forEach(([key, api]) => {
        if( api instanceof API ){
            // console.debug( chalk.green( `❖ ${chalk.bold(api.API_NAME)} API enabled`))
            API_LIST.push({ key: key, title: api.API_NAME })
        }
        // else{
        //     console.debug( chalk.red( `❖ ${chalk.bold(key)} API disabled`))
        // }
    })
    // if (API_LIST.length > 0) {
    //     console.debug( "---" )
    //     console.debug( chalk.green( `✅ ${chalk.bold(API_LIST.length)} API module(s) available`))
    // }
    return API_LIST;
}

function getNetworkInterfaces(): Array<string>{
    const addresses: Array<string> = [];
    const interfaces = os.networkInterfaces();
    for (const [name, nets] of Object.entries(interfaces)) {
        if (!nets) continue;
        for (const net of nets) {
            if (net.internal) continue;
            if (net.family === 'IPv4') {
                addresses.push(net.address);
            }
        }
    }
    return addresses;
}

// ==============================================================================================
// Execution
// ==============================================================================================


LoadAPIModes()

// Start the server
app.listen(port, () => {
    console.log( chalk.cyan(`\n⭐ Started ${chalk.bold("OgreAI")} server at:`))
    console.log(
        chalk.green.bold(" ➜ ") +
        chalk.white.bold("Local:\t") +
        chalk.blue(`http://localhost:${port}`)
    )
    const network: Array<string> = getNetworkInterfaces();
    network.forEach((address: string) => {
        console.log(
            chalk.green.bold(" ➜ ") +
            chalk.white.bold("Network:\t") +
            chalk.blue(`http://${address}:${port}`)
        )
    })
    console.log(chalk.gray(`\nPress ${chalk.bold.white("Ctrl + C")} to stop`))
    console.log("\n")
})
