import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from "fs"
import path from "path"
import chalk from "chalk"

import { parseChat as parseChatCAI } from "../import/cai.js"
import { parseChat as parseChatTavern } from "../import/tavern.js"

class Chat{
    static path = "../user/chats/"

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
        let target = path.join(Chat.path, path.parse( character.metadata.filepath ).name, "/" )
        console.debug( chalk.blue( "Reading chats from " + chalk.blue(target)))
        if(existsSync(target)){

            let files = readdirSync(target)
            for(let i = 0; i < files.length; i++){
                if(!files[i].toLowerCase().endsWith('.json')){
                    continue;
                }
                
                try{
                    let filepath = path.join( target, files[i] )
                    let content = readFileSync( filepath, "utf-8")
                    let parsed = JSON.parse( content )
                    if(parsed.messages < 1){
                        continue;
                    }
                    
                    let new_chat = new Chat()
                    new_chat.SetFrom( parsed )
                    chats.push( new_chat )

                }catch(error){
                    console.warn( chalk.yellow( error ))
                }
            }
        }

        return chats;
    }



    static Save( chat, character ){
        if( !character ) return;
        if( !character.name || character.name.length < 1 ) return;
    
        let filename = chat.created + ".json";
        let folder =  path.join(Chat.path, path.parse( character.metadata.filepath ).name )
        let target = path.join(folder, filename)
    
        try{
            if(!existsSync(folder)){
                mkdirSync(folder, { recursive: true });
            }
    
            let json = JSON.stringify(chat, function(key, value){ 
                return key != "dom" ? value : undefined;
            });
    
            writeFileSync(target, json);
            console.debug( chalk.blue( `Saved chat at ${target}` ))
            return true
        }catch(error){
            console.warn( chalk.yellow( `Could not save chat at ${target}\n${error}` ))
        }
        
        return false
    }

    static ImportTavern( character, files ){
        if( !character ) return;

        for(let i = 0; i < files.length; i++){
            try{
                let file = files[i]
                let content = readFileSync( file, "utf-8")
                let parsed = parseChatTavern( content )
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
            let chats = parseChatCAI( json )

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
            let target = path.join(Chat.path, character.name, created + ".json" )
            unlinkSync(target)
        }catch(error){
            console.warn("Error trying to delete chat:\n" + error.message)
        }
    }

}

const _Chat = Chat
export { _Chat as Chat }