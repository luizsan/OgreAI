import fs from "fs";
import path from "path"
import chalk from "chalk";
import { IGenerationData, ILorebook, ILorebookEntry, IMessage } from "../../shared/types.js";
import { parseNames } from "../../shared/format.mjs";
import API from "../core/api.ts";

export default class Lorebook{

    static GetAllLorebooks(dir){
        let books = []
        let target = path.join( ".", dir ).replaceAll("\\", "/")
        console.debug( chalk.blue( "Reading lorebooks from " + chalk.blue(target)))
        if(!fs.existsSync(target)){
            fs.mkdirSync(target, { recursive: true });
        }
        let files = fs.readdirSync(target)
        for(let i = 0; i < files.length; i++){
            try{
                let filepath = path.join( target, files[i] ).replaceAll("\\", "/")
                let content = fs.readFileSync( filepath, "utf-8")
                let parsed = JSON.parse( content )
                parsed.temp = {
                    filepath : path.basename( filepath )
                }
                books.push(parsed)
            }catch(error){
                console.warn( chalk.yellow( error ))
            }
        }
        return books
    }

    static Save( book: ILorebook, dir: string ){
        try{
            let target = book.temp?.filepath
            if( !target ){
                target = (book.name ? `${book.name}-${new Date().getTime()}` : new Date().getTime())
                target += ".json"
            }
            target = path.join(dir, target)
            target = target.toLowerCase().replaceAll(/\s+/gmi, "_")
            target = target.replaceAll("\\", "/")

            if(!fs.existsSync(target)){
                fs.mkdirSync( path.dirname(target), { recursive: true });
            }
            let json = JSON.stringify(book, function(key, value){
                return key != "temp" ? value : undefined;
            });

            fs.writeFileSync(target, json)
            console.debug( chalk.blue( `Saved lorebook at ${target}` ))
            return true

        }catch(error){
            console.warn( chalk.yellow( `Could not save lorebook\n${error}` ))
        }
        return false
    }

    static findKeysInMessage(keys: string[], message: IMessage, case_sensitive?: boolean) {
        let content: string = message.candidates[ message.index ].text
        if( !content ){
            return false
        }
        if (case_sensitive) {
            return keys.some((key) => content.includes(key));
        } else {
            content = content.toLowerCase()
            return keys.some((key) => content.includes(key.toLowerCase()));
        }
    }

    static matchMessage(entry: ILorebookEntry, message: IMessage){
        if( !entry.enabled )
            return false;
        if( entry.constant )
            return true;
        if( entry.keys?.length == 0 )
            return false
        const has_primary_key = this.findKeysInMessage(entry.keys, message, entry.case_sensitive);
        if( has_primary_key ){
            if( entry.selective && entry.secondary_keys?.length > 0 ){
                const has_secondary_key = this.findKeysInMessage(entry.secondary_keys, message, entry.case_sensitive);
                return has_secondary_key;
            }
            return true;
        }
        return false;
    }

    static getGlobalLoreEntries(api: API, data: IGenerationData): Array<ILorebookEntry>{
        let entries_triggered: Array<ILorebookEntry> = []
        data.books?.forEach(book => {
            const entries = this.getEntriesFromBook( api, book, data )
            entries_triggered = entries_triggered.concat(entries)
        })
        return entries_triggered
    }

    static getEntriesFromBook(api: API, book: ILorebook, data: IGenerationData): Array<ILorebookEntry>{
        const character = data.character;
        const user = data.user;
        const messages = data.chat.messages;
        const settings = data.settings;
        const entries_triggered = [];
        if( !book ){
            return entries_triggered
        }

        const messages_scanned = book.scan_depth > 0 ? messages.slice(-book.scan_depth) : []

        book.entries.forEach((entry) => {
            if( !entry.content ){
                return
            }
            if( entry.constant ){
                entries_triggered.push(entry);
                return
            }
            const match = messages_scanned.some((message) => {
                this.matchMessage(entry, message)
            })
            if(match) {
                entries_triggered.push(entry);
            }
        });

        entries_triggered.forEach(entry => {
            entry.content = parseNames(entry.content, user.name, character.data.name)
        });
        // trim entries to fit book.token_budget
        // entries with lower priority are discarded first
        let tokens_used = 0;
        entries_triggered.sort((a,b) => b.priority - a.priority);
        for(let i = 0; i < entries_triggered.length; i++){
            const entry = entries_triggered[i];
            const tokens = api.getTokenCount(entry.content, settings.model);
            if(tokens_used + tokens <= book.token_budget){
                tokens_used += tokens;
            }else{
                entries_triggered.splice(i);
                break;
            }
        }
        // sort entries by insertion order
        entries_triggered.sort((a,b) => a.insertion_order - b.insertion_order);
        // const result = entries_triggered.map((entry) => entry.content).join("\n\n");
        return entries_triggered
    }

    static squashEntries(entries: Array<ILorebookEntry>): string {
        let squashed: string = "";
        entries.forEach((entry) => {
            squashed += entry.content + "\n\n";
        });
        return squashed;
    }
}