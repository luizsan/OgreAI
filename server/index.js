import express from "express";
import https from "https"
import http from "http"
import path from "path";
import fs from "fs";
import cors from "cors";

import { Character } from "./modules/character.js"
import { Chat } from "./modules/chat.js"
import { LoadData, SaveData } from "./modules/data.js"
import { Profile } from "./modules/profile.js"
import { Settings } from "./modules/settings.js"

// used by API
import { parseNames, getTokens } from "./modules/utils.js"

const __dirname = path.resolve("./")
const app = express()
const port = 8000
const parser = express.json()

var API_MODES = {}

// startup 
GetAPIModes()

app.use(cors({ origin: "*" }))
app.listen(port, () => {
    console.log(`\nStarted OgreAI server at:\n > http://localhost:${port}\n`)
})

app.get("/", (_, response) => {
    response.sendStatus(200)
})

app.post("/get_profile", parser, function(_, response){
    response.send( LoadData(Profile.path, new Profile()) )
})

app.post("/get_settings", parser, function(_, response){
    response.send( LoadData(Settings.path, new Settings()) )
})

app.post("/get_api_status", parser, async function(request, response){
    let mode = request.body.api_mode
    let target = request.body.api_target
    if(!API_MODES[mode]){
        const msg = "Trying to fetch non-existent API"
        console.error(msg)
        response.status(500).send(false)
        return
    }

    await API_MODES[mode].getStatus(target).then((result) => {
        response.send(result)
    }).catch((error) => {
        console.error(error)
        response.status(500).statusMessage(error).send(false)
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

app.post("/get_characters", parser, function(_, response){
    console.log(`Fetching characters from ${Character.path}`)
    let list = Character.LoadFromDirectory(Character.path)
    response.send(list)
});

app.post("/get_character_tokens", parser, function(request, response){
    let tokens = API_MODES[ request.body.api_mode ].getTokenConsumption( request.body.character, request.body.user )
    response.send(tokens)
})

app.post("/get_latest_chat", parser, function(request, response){
    console.log(`Fetching latest chat for character ${request.body.name}`)
    let chat = Chat.GetLatestChat(request.body)
    response.send(chat)
});

app.post("/get_chats", parser, function(request, response){
    console.log(`Fetching all chats for character ${request.body}`)
    let chats = Chat.GetAllChats(request.body)
    response.send(chats)
});

app.post("/save_chat", parser, function(request, response){
    response.status(403).send("Forbidden")
})

app.post("/delete_chat", parser, function(request, response){
    response.status(403).send("Forbidden")
})

app.post("/get_api_modes", parser, async function(request, response){
    let modes = await GetAPIModes().then(result => result)
    console.log(modes)
    response.send(modes)
    console.log("")
})

app.post("/get_api_settings", parser, function(request, response){
    if( API_MODES[request.body.api_mode] && API_MODES[request.body.api_mode].API_SETTINGS ){
        response.send( API_MODES[request.body.api_mode].API_SETTINGS )
    }else{
        response.status(500).send({})
    }
})

async function GetAPIModes(){
    API_MODES = {}
    let files = fs.readdirSync("./public/api")
    let valid = []
    for( let i = 0; i < files.length; i++ ){
        try{
            let filepath = path.join("file://", __dirname, "/public/api/", files[i] ).replaceAll("\\", "/");
            let target = path.basename( files[i], ".js" )
            API_MODES[target] = await import(filepath).then((module) => module.default);
            valid.push()
            console.log(`Loaded ${target} API module`)
        }catch(error){
            console.error(error)
        }
    }
    console.debug(API_MODES)
    return valid;
}