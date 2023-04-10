import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from "fs"
import { join, parse } from "path"

import { ParseChat as ParseChatCAI } from "../parsers/cai.js"
import { ParseChat as ParseChatTavern } from "../parsers/tavern.js"

class Chat{
    constructor( character ){
        let timestamp = Date.now()
        this.title = timestamp.toString()
        this.participants = []
        this.created = timestamp
        this.last_interaction = timestamp
        this.messages = []

        if( character ){
            this.participants.push( character.name )
            this.messages = [
                {
                    "participant": 0,
                    "index": 0,
                    "candidates": [ 
                        { 
                            "timestamp": Date.now(), 
                            "text": character.greeting ? character.greeting : "Hello, {{user}}!"
                        },
                    ],
                },
            ]
        }
    }

    static path = "./user/chats/"

    SetFrom( chat ){
        this.title = chat.title
        this.participants = []
        for( let p = 0; p < chat.participants.length; p++ ){
            this.participants.push( chat.participants[p] )
        }
        this.created = chat.created
        this.last_interaction = chat.last_interaction
        this.messages = []
        for( let m = 0; m < chat.messages.length; m++ ){
            let old_msg = chat.messages[m]
            let new_msg = {
                participant: old_msg.participant,
                index: old_msg.index,
                candidates: [],
            }

            for( let c = 0; c < old_msg.candidates.length; c++ ){
                let old_candidate = old_msg.candidates[c]
                let new_candidate = {
                    timestamp: old_candidate.timestamp,
                    text: old_candidate.text
                }

                new_msg.candidates.push( new_candidate )
            }

            this.messages.push( new_msg )
        }
    }

    static GetAllChats(character){
        let chats = []
        let target = join(Chat.path, parse( character.metadata.filepath ).name, "/" )
        console.debug("Reading chats from " + target)
        if(existsSync(target)){

            let files = readdirSync(target)
            for(let i = 0; i < files.length; i++){
                if(!files[i].toLowerCase().endsWith('.json')){
                    continue;
                }
                
                try{
                    let filepath = join( target, files[i] )
                    let content = readFileSync( filepath, "utf-8")
                    let parsed = JSON.parse( content )
                    if(parsed.messages < 1){
                        continue;
                    }
                    
                    let new_chat = new Chat()
                    new_chat.SetFrom( parsed )
                    chats.push( new_chat )

                }catch(error){
                    console.warn(error)
                }
            }
        }

        return chats;
    }

    static GetLatestChat(character){
        if( !character ){
            return null;
        }

        let result = new Chat( character )
        let latest_time = 0;
        let latest_chat = null;
        let chats = Chat.GetAllChats( character )
        
        try{
            for(let i = 0; i < chats.length; i++){
                let chat = chats[i]
                if( chat.last_interaction > latest_time && chat.messages.length > 0 ){
                    latest_time = chat.last_interaction;
                    latest_chat = chat;
                }
            }

            if( latest_chat ){
                result.SetFrom( latest_chat )
                console.debug(`Loaded latest chat for character ${character.name}`)
                return result
            }
        }catch(error){
            console.warn(error)
        }

        console.debug(`Started new chat for character ${character.name}`)
        return result;
    }

    Save( character ){
        if( !character ) return;
        if( !character.name || character.name.length < 1 ) return;
    
        let filename = this.created + ".json";
        let folder =  join(Chat.path, parse( character.metadata.filepath ).name )
        let target = join(folder, filename)
    
        try{
            if(!existsSync(folder)){
                mkdirSync(folder, { recursive: true });
            }
    
            let json = JSON.stringify(this, function(key, value){ 
                return key != "dom" ? value : undefined;
            });
    
            writeFileSync(target, json);
            console.debug(`Saved chat at ${target}`)
            return true
        }catch(error){
            console.warn(`Could not save chat at ${target}\n${error}`)
        }
        
        return false
    }

    static ImportTavern( character, files ){
        if( !character ) return;

        for(let i = 0; i < files.length; i++){
            try{
                let file = files[i]
                let content = readFileSync( file, "utf-8")
                let parsed = ParseChatTavern( content )
                if( parsed ){
                    let new_chat = new Chat( character );
                    new_chat.SetFrom( parsed )
                    new_chat.Save( character )
                }
            }catch(error){
                console.warn("Error trying to import TavernAI chat:\n" + error.message)
            }
        }
    }

    static ImportCAI( character, file ){
        if( !character ) return;
        
        try{
            let content = readFileSync( file, "utf-8")
            let json = JSON.parse( content )
            let chats = ParseChatCAI( json )

            for(let i = 0; i < chats.length; i++){
                let new_chat = new Chat( character )
                new_chat.SetFrom( chats[i] )
                new_chat.Save( character )
            } 
        }catch(error){
            console.warn("Error trying to import Character.AI chat:\n" + error.message)
        }

    }

    static Delete( character, created ){
        try{
            let target = join(Chat.path, character.name, created + ".json" )
            unlinkSync(target)
        }catch(error){
            console.warn("Error trying to delete chat:\n" + error.message)
        }
    }

}

const _Chat = Chat
export { _Chat as Chat }