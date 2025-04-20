import { ICandidate, ICharacter, IChat, IMessage } from "../../shared/types.js"

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from "fs"
import path from "path"
import chalk from "chalk"

import * as CAI from "../import/cai.js"
import * as Tavern from "../import/tavern.js"
import * as Format from "../../shared/format.mjs"

export default class Chat{

    static create( character: ICharacter ): IChat{
        const timestamp = Date.now()
        let chat: IChat = {
            title: timestamp.toString(),
            participants: [],
            create_date: timestamp,
            last_interaction: timestamp,
            messages: []
        }

        if( !character )
            return chat

        chat.participants.push( character.data.name )

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
        chat.messages = [ first ]
        return chat
    }

    static Validate( chat: IChat, source: any ): void{
        chat.title = source.title
        chat.participants = source.participants || []
        chat.create_date = source.created || source.create_date || Date.now()
        chat.last_interaction = source.last_interaction || Date.now()
        chat.messages = source.messages || []
    }

    static GetAllChats(character: ICharacter, dir: string){
        let chats = []
        let target = path.join(dir, path.parse( character.temp.filepath ).name, "/" )
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
                        let new_chat: IChat = parsed
                        this.Validate( new_chat, parsed )
                        new_chat.filepath = filepath.replaceAll("\\", "/" )
                        chats.push( new_chat )

                    }else if(files[i].toLowerCase().endsWith('.jsonl')){
                        // TAVERN
                        let filepath = path.join( target, files[i] )
                        let content = readFileSync( filepath, "utf-8")
                        let parsed = Tavern.parseChat( content )
                        if( parsed ){
                            let new_chat: IChat = parsed
                            this.Validate( new_chat, parsed )
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

    static Save( chat: IChat, character: ICharacter, dir: string ): boolean{
        if( !character ) return;
        if( !character.data.name ) return;
        let filename = chat.create_date + ".json";
        let folder =  path.join(dir, path.parse( character.temp.filepath ).name )
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

    static ImportTavern( character: ICharacter, files: string[], dir: string ): boolean{
        if( !character ) return;

        try{
            for(let i = 0; i < files.length; i++){
                let file = files[i]
                let content = readFileSync( file, "utf-8")
                let parsed = Tavern.parseChat( content )
                if( parsed ){
                    let new_chat: IChat = this.create(character)
                    this.Validate( new_chat, parsed )
                    this.Save( new_chat, character, dir )
                }
            }
            return true
        }catch(error){
            console.warn("Error trying to import TavernAI chat:\n" + error.message)
            return false
        }
    }

    static ImportCAI( character: ICharacter, filepath: string, dir: string ): boolean{
        if( !character ) return;
        try{
            let content = readFileSync( filepath, "utf-8")
            let json = JSON.parse( content )
            let chats = CAI.parseChat( json )
            for(let i = 0; i < chats.length; i++){
                let new_chat: IChat = this.create(character)
                this.Validate( new_chat, chats[i] )
                this.Save( new_chat, character, dir )
                return true
            }
        }catch(error){
            console.warn("Error trying to import Character.AI chat:\n" + error.message)
            return false
        }
    }

    static Delete( chat: IChat ){
        try{
            let target =  chat.filepath
            unlinkSync(target)
            return true
        }catch(error){
            console.warn("Error trying to delete chat:\n" + error.message)
            return false
        }
    }

}