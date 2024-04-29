import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from "fs"
import path from "path"
import chalk from "chalk"

import * as CAI from "../import/cai.js"
import * as Tavern from "../import/tavern.js"
import * as Format from "../../shared/format.mjs"

export default class Chat{
    static path = "../user/chats/"

    constructor( character ){
        let timestamp = Date.now()
        this.title = timestamp.toString()
        this.participants = []
        this.create_date = timestamp
        this.last_interaction = timestamp
        this.messages = []

        if( !character )
            return
    
        this.participants.push( character.data.name )

        let first = {
            participant: 0,
            index: 0,
            candidates: [],
        }

        let first_mes = character.data.first_mes ? character.data.first_mes : "Hello, {{user}}!"
        let alt_mes = character.data.alternate_greetings ? character.data.alternate_greetings : []
        let greetings = [first_mes].concat(alt_mes)

        if( character.data.alternate_greetings ){
            greetings.forEach(greeting => {
                let candidate = {
                    timestamp: Date.now(),
                    text: greeting
                }
                candidate.text = Format.parseMacros(candidate.text)
                first.candidates.push(candidate)
            })
        }

        this.messages = [ first ]
    }

    SetFrom( chat ){
        this.title = chat.title
        this.participants = []
        for( let p = 0; p < chat.participants.length; p++ ){
            this.participants.push( chat.participants[p] )
        }

        this.create_date = chat.created ?? chat.create_date
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
                    text: old_candidate.text,
                    timer: old_candidate.timer || 0,
                }

                if( old_candidate.model ){
                    new_candidate.model = old_candidate.model
                }

                new_msg.candidates.push( new_candidate )
            }

            this.messages.push( new_msg )
        }
    }

    static GetAllChats(character){
        let chats = []
        let target = path.join(Chat.path, path.parse( character.temp.filepath ).name, "/" )
        target = target.replaceAll("\\", "/")
        
        console.debug( chalk.blue( "Reading chats from " + chalk.blue(target)))
        if(existsSync(target)){

            let files = readdirSync(target)
            for(let i = 0; i < files.length; i++){
                try{
                    if(files[i].toLowerCase().endsWith('.json')){
                        // OGRE
                        let filepath = path.join( target, files[i] )
                        let content = readFileSync( filepath, "utf-8")
                        let parsed = JSON.parse( content )
                        if(parsed.messages < 1){
                            continue;
                        }
                        
                        let new_chat = new Chat()
                        new_chat.SetFrom( parsed )
                        new_chat.filepath = filepath.replaceAll("\\", "/" )
                        chats.push( new_chat )
                        
                    }else if(files[i].toLowerCase().endsWith('.jsonl')){
                        // TAVERN
                        let filepath = path.join( target, files[i] )
                        let content = readFileSync( filepath, "utf-8")
                        let parsed = Tavern.parseChat( content )
                        if( parsed ){
                            let new_chat = new Chat()
                            new_chat.SetFrom( parsed )
                            new_chat.filepath = filepath.replaceAll("\\", "/" )
                            chats.push( new_chat )
                        }
                    }
                }catch(error){
                    console.warn( chalk.yellow( error ))
                }
            }
        }

        return chats;
    }



    static Save( chat, character ){
        if( !character ) return;
        if( !character.data.name ) return;
    
        let filename = chat.create_date + ".json";
        let folder =  path.join(Chat.path, path.parse( character.temp.filepath ).name )
        let target = path.join(folder, filename)
        target = target.replaceAll("\\", "/")
    
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
                let parsed = Tavern.parseChat( content )
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
            let chats = CAI.parseChat( json )

            for(let i = 0; i < chats.length; i++){
                let new_chat = new Chat( character )
                new_chat.SetFrom( chats[i] )
                new_chat.Save( character )
            } 
        }catch(error){
            console.warn("Error trying to import Character.AI chat:\n" + error.message)
        }

    }

    static Delete( chat ){
        try{
            let target =  path.join( ".", chat.filepath )
            unlinkSync(target)
            return true
        }catch(error){
            console.warn("Error trying to delete chat:\n" + error.message)
            return false
        }
    }

}