import { ICandidate, ICharacter, IChat, IChatMeta, IMessage } from "../../shared/types.js"

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, unlinkSync, exists } from "fs"
import path from "path"
import chalk from "chalk"

import * as CAI from "../import/cai.ts"
import * as Tavern from "../import/tavern.ts"
import * as Format from "../../shared/format.ts"

const META_FILE: string = "_index.meta"

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
                candidate.text = Format.parseMacros(candidate.text, chat)
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

    // Returns an array of IChatMeta for all chats in the character folder
    static GetAllChats(character: ICharacter, dir: string){
        let chats: Array<IChatMeta> = []
        let filename = path.parse( character.temp.filepath).name
        let target = path.join(dir, filename)
        target = target.replaceAll("\\", "/")
        console.debug( chalk.blue( "Reading chats from " + chalk.blue(target)))
        // folder exists
        if(!existsSync(target))
            return chats

        // look for _index.meta file
        let index = path.join(target, META_FILE)
        try{
            if(!existsSync(index))
                throw new Error("Index file not found")
                // index found
            let content = readFileSync(index, "utf-8")
            let parsed = JSON.parse(content)
            if(Array.isArray(parsed)){
                parsed.forEach(meta => {
                    meta.filepath = meta.filepath.replaceAll("\\", "/")
                    chats.push(meta)
                })
            }
        }catch(e: any){
            console.log("Error reading index file: " + e.message)
            // no index found
            let files = readdirSync(target)
            for(let i = 0; i < files.length; i++){
                try{
                    let filepath = path.join( target, files[i] )
                    filepath = filepath.replaceAll("\\", "/")
                    let new_chat : IChat = this.ReadFromFile( filepath )
                    if( new_chat ){
                        let meta : IChatMeta = this.createMetadata( new_chat )
                        meta.filepath = path.relative(dir, filepath)
                        meta.filepath = meta.filepath.replaceAll("\\", "/")
                        chats.push( meta )
                    }
                }catch(error){
                    console.warn( chalk.yellow( error ))
                }
            }
            // write metadata
            let meta_content: string = JSON.stringify(chats)
            let meta_path: string = path.join(target, META_FILE)
            writeFileSync(meta_path, meta_content)
        }
        return chats;
    }

    static createMetadata( chat: IChat ): IChatMeta{
        let meta: IChatMeta = {
            filepath: chat.filepath,
            title: chat.title,
            create_date: chat.create_date,
            last_interaction: chat.last_interaction,
            participants: chat.participants,
            message_count: chat.messages.length,
            last_message: undefined,
        }

        if (chat.messages.length > 0) {
            const last: IMessage = chat.messages.at(-1)
            const current: ICandidate = last.candidates[last.index]
            meta.last_message = {
                participant: last.participant,
                index: last.index,
                candidates: [current]
            };
        }

        return meta
    }

    static ReadFromFile( filepath: string, dir: string = "" ): IChat | null{
        try{
            let extension = path.extname(filepath)
            let content = readFileSync( path.join(dir, filepath), "utf-8")
            let parsed: IChat = null
            switch(extension){
                case ".json": // OGRE
                    parsed = JSON.parse(content)
                    break;
                case ".jsonl": // TAVERN
                    parsed = Tavern.parseChat(content )
                    break;
                default:
                    break;
                }
            if ( !parsed )
                throw new Error( "Could not parse chat file" )
            let new_chat: IChat = parsed
            this.Validate( new_chat, parsed )
            new_chat.filepath = filepath.replaceAll("\\", "/" )
            return new_chat
        }catch(error){
            console.warn( chalk.yellow( error ))
        }
        return null
    }

    static Save( chat: IChat, character: ICharacter, dir: string ): boolean{
        if( !character ) return;
        if( !character.data.name ) return;
        let filename = chat.create_date.toString();
        let folder =  path.join(dir, path.parse( character.temp.filepath ).name )
        let target = path.join(folder, filename)
        target = target.replaceAll("\\", "/")
        try{
            if(!existsSync(folder)){
                mkdirSync(folder, { recursive: true });
            }
            let json = JSON.stringify(chat, function(key, value){
                switch(key){
                    case "dom": return undefined
                    case "filepath": return undefined
                    default: return value
                }
            });
            // meta
            let meta_path = path.join(path.dirname(target), META_FILE)
            if(existsSync(meta_path)){
                let new_meta = this.createMetadata(chat)
                let meta_content = readFileSync(meta_path, "utf-8")
                let meta_list = JSON.parse(meta_content)
                let meta_index = meta_list.findIndex((entry: IChatMeta) => entry.filepath == chat.filepath)
                if( meta_index > -1 ){
                    meta_list[meta_index] = new_meta
                }else{
                    meta_list.push(new_meta)
                }
                writeFileSync(meta_path, JSON.stringify(meta_list))
            }
            writeFileSync(target + ".json", json);
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

    static Delete( chat: IChat, dir: string ){
        try{
            let target = path.join( dir, chat.filepath )
            // meta
            let meta_path = path.join(path.dirname(target), META_FILE)
            if(existsSync(meta_path)){
                let meta_content = readFileSync(meta_path, "utf-8")
                let meta_list = JSON.parse(meta_content)
                meta_list = meta_list.filter( (entry: IChatMeta) => entry.filepath != chat.filepath )
                writeFileSync(meta_path, JSON.stringify(meta_list))
            }
            unlinkSync(target)
            return true
        }catch(error){
            console.warn("Error trying to delete chat:\n" + error.message)
            return false
        }
    }
}