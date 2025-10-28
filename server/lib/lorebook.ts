import fs from "fs";
import path from "path"
import chalk from "chalk";

import {
    IGenerationData,
    ILorebook,
    ILorebookEntry,
    IMessage
} from "../../shared/types.js";

import {
    parseNames
} from "../../shared/format.ts";

import {
    IDatabaseLorebook,
    db
} from "../core/database.js"

import API from "../core/api.ts";
import { path_dir } from "../core/config.ts"

import * as LorebookSQL from "../sql/lorebook.ts"

const EXT_LORE = [".json"]


export function List(){
    const entries = LorebookSQL.LIST.all() as IDatabaseLorebook[]
    return entries.map((entry: IDatabaseLorebook) => {
        let book: ILorebook = JSON.parse(entry.content)
        book.temp = {
            toggled: entry.toggled
        }
        return book
    })
}

export function Save( book: ILorebook, metadata: any = {}, overwrite = true ): boolean{
    const transaction = db.transaction(() => {
        if( !overwrite ){
            const exists = LorebookSQL.GET.get(book.name)
            if( !!exists ){
                console.warn(chalk.yellow(`Failed to save lorebook [${book.name}]: already exists in the database.`));
                return false
            }
        }
        const raw: string = JSON.stringify(book)
        const meta: string = JSON.stringify(metadata)
        const result = LorebookSQL.SAVE.run(book.name, raw, meta)
        if(result.changes === 0){
            console.warn(chalk.yellow(`Failed to save lorebook [${book.name}]`));
            return false
        }
        console.log(`Saved lorebook: [${book.name}]`)
        return result
    })
    return !!transaction()
}

export function Toggle( book: ILorebook, state: boolean ): boolean{
    const result = LorebookSQL.TOGGLE.run(state ? 1 : 0, book.name)
    if(result.changes > 0)
        console.log(`Toggled lorebook [${book.name}]: ${state ? "✅" : "❌"}`);
    return result.changes > 0
}

export function Delete( book: ILorebook ): boolean{
    const result = LorebookSQL.DELETE.run(book.name)
    if(result.changes === 0)
        throw new Error(`Could not delete lorebook [${book.name}]: not found`)
    return result.changes > 0
}

export function findKeysInMessage(keys: string[], message: IMessage, case_sensitive?: boolean) {
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

export function matchMessage(entry: ILorebookEntry, message: IMessage){
    if( !entry.enabled ){
        return false;
    }
    if( entry.constant ){
        return true;
    }
    if( entry.keys?.length == 0 ){
        return false
    }
    const has_primary_key = findKeysInMessage(entry.keys, message, entry.case_sensitive);
    if( has_primary_key ){
        if( entry.selective && entry.secondary_keys?.length > 0 ){
            const has_secondary_key = this.findKeysInMessage(entry.secondary_keys, message, entry.case_sensitive);
            return has_secondary_key;
        }
        return true;
    }
    return false;
}

export function getGlobalLoreEntries(api: API, data: IGenerationData): Array<ILorebookEntry>{
    let entries_triggered: Array<ILorebookEntry> = []
    data.books?.forEach(book => {
        const entries = getEntriesFromBook( api, book, data )
        entries_triggered = entries_triggered.concat(entries)
    })
    return entries_triggered
}

export function getEntriesFromBook(api: API, book: ILorebook, data: IGenerationData): Array<ILorebookEntry>{
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
            return matchMessage(entry, message)
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

export function squashEntries(entries: Array<ILorebookEntry>): string {
    let squashed: string = "";
    entries.forEach((entry) => {
        squashed += entry.content + "\n\n";
    });
    return squashed;
}

export function Import(contents: ILorebook, metadata: any = {}){
    const transaction = db.transaction(() => {
        const raw: string = JSON.stringify(contents)
        const result = LorebookSQL.SAVE.get(
            contents.name, raw, JSON.stringify(metadata)
        ) as number | undefined
        if(!result)
            throw new Error("Failed to import lorebook");
        return result
    })
    const success = transaction()
    if(!success)
        throw new Error("Failed to import lorebook");
    console.log(`Imported lorebook: [${contents.name}]`)
}

export function ImportLorebooks(){
    let imported = 0
    const dir = path_dir.lorebooks
    const files = fs.readdirSync(dir)
    for(const file of files){
        const ext = path.parse(file).ext
        const filepath = path.join(dir, file)
        try{
            if(!EXT_LORE.includes(ext) || file.startsWith("."))
                continue
            const raw = fs.readFileSync(filepath, "utf-8")
            const content: ILorebook = JSON.parse(raw)
            Import(content, {})
            imported += 1
        }catch(error){
            console.warn(chalk.yellow(`Error trying to import lorebook from ${filepath}:\n`) + error.message)

        }
    }
    console.log(`Imported ${imported} lorebook(s) into the database`)
}