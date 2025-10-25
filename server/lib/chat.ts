import {
    ICandidate,
    ICharacter,
    IChat,
    IMessage
} from "../../shared/types.js"

import {
    IDatabaseChat,
    IDatabaseCandidate,
    IDatabaseMessage,
    db, op
} from "../core/database.js"

import fs from "fs"
import path from "path"
import chalk from "chalk"

import { path_dir } from "../core/config.ts"
import * as Tavern from "../external/tavern.ts"
import * as Format from "../../shared/format.ts"

const EXT_CHAT = [".json", ".jsonl"]


export function New( character: ICharacter ): IChat{
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

    chat.participants.push( character.temp?.filename || character.data.name )

    let first: IMessage = { participant: 0, index: 0, timestamp: timestamp, candidates: [] }
    let first_mes: string= character.data.first_mes || "Hello, {{user}}!"
    let alt_mes: string[] = character.data.alternate_greetings ? character.data.alternate_greetings : []
    let greetings: string[] = [first_mes].concat(alt_mes)

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

export function Validate( chat: IChat, source: any ): void{
    chat.title = source.title
    chat.participants = source.participants || []
    chat.create_date = source.created || source.create_date || Date.now()
    chat.last_interaction = source.last_interaction || Date.now()
    chat.messages = source.messages || []
}

export function Create(character_id: string, chat: IChat, insert_messages: boolean = false): IChat{
    const transaction = db.transaction(() => {
        // create chat
        const result: IDatabaseChat = op["chat_create"].get(
            character_id,
            chat.title || Date.now().toString(),
            chat.create_date ?? Date.now(),
            chat.last_interaction ?? Date.now(),
            "{}"
        ) as IDatabaseChat | undefined
        if(!result?.id)
            throw new Error("Failed to create chat");
        const chat_id: number = result.id;
        chat.id = result.id

        // create initial message
        if(insert_messages){
            let timestamp: number = Date.now()
            for(let msg of chat.messages){
                msg = AddMessage(chat_id, msg, timestamp)
                timestamp += 1
            }
        }
        return chat
    })
    chat = transaction()
    if(chat)
        console.log(`New chat created with id ${chat.id}`)
    return chat;
}

export function ListChatsForCharacter(character_id: string): Array<IChat>{
    const chat_entries = op["chat_list"].all(character_id) as Array<IDatabaseChat>
    const list: Array<IChat> = chat_entries.map((entry: IDatabaseChat) => {
        let chat: IChat = {
            id: entry.id,
            title: entry.title,
            create_date: entry.create_date,
            participants: [ entry.character_id ],
            last_interaction: entry.last_interaction,
            length: op["message_list"].all(entry.id).length,
            messages: [ GetLastMessage(entry.id) ]
        }
        return chat
    })
    console.log(`Found ${list.length} chat(s) for character ${character_id}`)
    return list;
}

export function Load(chat_id: number): IChat{
    const chat_entry: IDatabaseChat = op["chat_get"].get(chat_id) as IDatabaseChat | undefined
    if(!chat_entry)
        throw new Error(`Chat with id ${chat_id} not found`)
    const chat: IChat = {
        id: chat_id,
        title: chat_entry.title,
        participants: [ chat_entry.character_id ],
        create_date: chat_entry.create_date,
        last_interaction: chat_entry.last_interaction,
        messages: ListMessages(chat_id)
    }
    return chat
}

export function Update(chat: IChat): boolean{
    const transaction = db.transaction(() => {
        const chat_entry: IDatabaseChat = op["chat_get"].get(chat.id) as IDatabaseChat | undefined
        if(!chat_entry)
            throw new Error(`Could not update chat with id ${chat.id}: not found`)
        op["chat_update"].run( chat.title, chat.last_interaction, "{}", chat.id )
        return true
    })
    const success: boolean = !!transaction()
    if( success ){
        console.log(`Updated chat with id ${chat.id}`)
    }
    return success
}

export function Find(character_id: string, title: string): number | undefined{
    const chat_id = op["chat_find"].get(character_id, title) as number | undefined
    return chat_id
}

export function Duplicate(chat: IChat, new_title: string, branch: ICandidate = null): number{
    const timestamp = Date.now()
    const transaction = db.transaction(() => {
        const new_chat: IDatabaseChat = op["chat_create"].get(
            chat.participants[0],
            new_title || timestamp.toString(),
            timestamp,
            timestamp,
            "{}"
        ) as IDatabaseChat | undefined

        if(!new_chat)
            throw new Error(`Failed to duplicate chat with id ${chat.id}`)

        const new_chat_id: number = new_chat.id
        const messages = ListMessages(chat.id)
        console.log("Attempting branch chat with branch %o", branch)
        for(let i = 0; i < messages.length; i++){
            // add new messages until it finds a candidate that matches the branch
            let message = messages[i]
            let candidates = message.candidates
            if( branch ){
                let index = candidates.findIndex((candidate: ICandidate) => {
                    return candidate.id == branch.id
                })
                if(index > -1){
                    console.log(`Found branch candidate at index ${index}`)
                    message.candidates = [candidates[index]]
                    message.index = 0
                    console.log("Adding message %o", message)
                    AddMessage(new_chat_id, message, timestamp)
                    break
                }
            }
            AddMessage(new_chat_id, message, timestamp)
        }
        return new_chat_id
    })
    const new_chat_id: number = transaction()
    if(new_chat_id){
        console.log(`New chat created with id ${new_chat_id}`)
    }else{
        console.log(`Failed to duplicate chat with id ${chat.id}`)
    }
    return new_chat_id
}

export function Count(): Record<string, number>{
    const rows = op["chat_count"].all()
    return Object.fromEntries(rows.map((row: any) => [row.character_id, row.count]))
}

export function Latest(): Record<string, number>{
    const rows = op["chat_latest"].all()
    return Object.fromEntries(rows.map((row: any) => [row.character_id, row.last_interaction]))
}

export function ListMessages(chat_id: number): Array<IMessage>{
    const messages = op["message_list"].all(chat_id).map((message: IDatabaseMessage) => {
        const candidates = op["candidate_list"].all(message.id).map((candidate: IDatabaseCandidate) => {
            return {
                id: candidate.id,
                text: candidate.text_content,
                timestamp: candidate.create_date,
                model: candidate.model,
                reasoning: candidate.text_reasoning,
                timer: candidate.timer,
                tokens: JSON.parse(candidate.tokens)
            }
        })
        return {
            id: message.id,
            participant: message.participant,
            index: message.candidate,
            timestamp: message.create_date,
            candidates: candidates
        }
    })
    return messages
}

export function GetLastMessage(chat_id: number): IMessage | undefined{
    const transaction = db.transaction(() => {
        const msg_id = op["message_last"].get(chat_id) as IDatabaseMessage | undefined
        if(!msg_id)
            return undefined
        const message = op["message_get"].get(msg_id.id) as IDatabaseMessage
        const candidates = op["candidate_list"].all(message.id) as Array<IDatabaseCandidate>
        let index = message.candidate
        if(index < 0) index = 0
        if(index >= candidates.length) index = candidates.length - 1
        const current: IDatabaseCandidate = candidates[index]
        return {
            id: message.id,
            participant: message.participant,
            timestamp: message.create_date,
            index: message.candidate,
            candidates: [{
                id: current.id,
                text: current.text_content,
                timestamp: current.create_date,
                model: current.model,
                reasoning: current.text_reasoning,
                timer: current.timer,
                tokens: JSON.parse(current.tokens)
            }]
        }
    })
    return transaction()
}

export function AddMessage(chat_id: number, message: IMessage, timestamp: number = Date.now()): IMessage{
    const transaction = db.transaction(() => {
        // update chat's last interaction
        const chat = op["chat_get"].get(chat_id) as IDatabaseChat;
        if (!chat) {
            throw new Error(`Could not update chat last interaction: ${chat_id} not found`);
        }
        op["chat_update"].run( chat.title, Date.now(), "{}", chat_id)

        // create message
        // const last = op["message_last"].get(chat_id) as IDatabaseMessage;
        // const parent : number = last ? last.id : null;
        const new_message = op["message_create"].get(
            chat_id,
            message.timestamp ?? timestamp,
            message.participant,
            message.index,
            "{}"
        ) as { id: number } | undefined
        if (!new_message.id) {
            throw new Error(`Could not create message in chat ${chat_id}`);
        }
        message.id = new_message.id
        // create candidates
        for(let candidate of message.candidates){
            let new_candidate = AddCandidate(message.id, candidate)
            if (!new_candidate) {
                throw new Error(`Could not create new candidate in message: ${message.id}`);
            }
            candidate.id = new_candidate.id
        }
        return message
    })
    const success = transaction()
    if( success )
        console.log(`New message created in chat ${chat_id} with id ${message.id}`)
    return message
}

export function UpdateMessage(message: IMessage): boolean{
    const transaction = db.transaction(() => {
        const existing = op["message_get"].get(message.id)
        if (!existing) {
            throw new Error(`Could not update message: ${message.id} not found`);
        }
        op["message_update"].run(
            message.id,
            message.index,
            "{}"
        )
        return true
    })
    const success = transaction()
    return !!success
}

export function GetMessage(id: any): IMessage | undefined{
    const transaction = db.transaction(() => {
        const message = op["message_get"].get(id) as IDatabaseMessage
        if (!message) {
            throw new Error(`Could not get message: ${id} not found`);
        }
        const result = {
            id: message.id,
            participant: message.participant,
            index: message.candidate,
            timestamp: message.create_date,
            candidates: op["candidate_list"].all(message.id).map((candidate: IDatabaseCandidate) => {
                return {
                    id: candidate.id,
                    text: candidate.text_content,
                    timestamp: candidate.create_date,
                    model: candidate.model,
                    reasoning: candidate.text_reasoning,
                    timer: candidate.timer,
                    tokens: JSON.parse(candidate.tokens),
                    metadata: JSON.parse(candidate.metadata)
                }
            })
        }
        return result
    })
    return transaction()
}

export function SwipeMessage(message: IMessage, index: number): boolean{
    const transaction = db.transaction(() => {
        const msg = op["message_get"].get(message.id) as IDatabaseMessage
        if (!msg) {
            throw new Error(`Could not swipe message: ${message.id} not found`);
        }
        const num_candidates = op["candidate_list"].all(message.id).length;
        if( num_candidates <= 0 )
            throw new Error(`Could not swipe message: ${message.id} has no candidates`);
        if( index < 0 ) index = 0;
        if( index >= num_candidates ) index = num_candidates - 1;

        const result = op["message_swipe"].run(index, message.id)
        if( result.changes === 0 )
            throw new Error(`Could not swipe message: ${message.id} not found`);
        console.log(`Changed message ${message.id} candidate to ${index+1} of ${num_candidates}`)
        return true
    })
    return transaction()
}

export function AddCandidate(message_id: number, candidate: ICandidate): ICandidate{
    const transaction = db.transaction(() => {
        const result = op["candidate_create"].get(
            message_id,
            candidate.text ?? "",
            candidate.reasoning ?? null,
            candidate.timestamp ?? 0,
            candidate.model ?? null,
            candidate.timer ?? 0,
            JSON.stringify(candidate.tokens) ?? "{}",
            "{}"
        ) as { id: number } | undefined
        if(!result)
            throw new Error(`Could not create candidate in message: ${message_id}`);
        candidate.id = result.id
        const num_candidates = op["candidate_list"].all(message_id).length;
        if( num_candidates > 0 )
            op["message_swipe"].run(message_id, num_candidates - 1)
        return candidate
    })
    return transaction()
}

export function UpdateCandidate(candidate: ICandidate): boolean{
    const result = op["candidate_update"].run(
        candidate.text ?? "",
        candidate.reasoning ?? null,
        candidate.timestamp ?? 0,
        candidate.model ?? null,
        candidate.timer ?? 0,
        JSON.stringify(candidate.tokens) ?? "{}",
        "{}",
        candidate.id
    )
    if(result.changes === 0){
        throw new Error(`Could not update candidate with id ${candidate.id}: candidate not found`);
    }else{
        console.log(`Updated candidate with id ${candidate.id}`)
    }
    return result.changes > 0
}

export function Delete(chat_id: number): boolean{
    const result = op["chat_delete"].run(chat_id)
    if(result.changes === 0)
        throw new Error(`Could not delete chat with id ${chat_id}: not found`)
    return result.changes > 0
}

export function DeleteMessages(id_list: Array<number>): boolean{
    const transaction = db.transaction(() => {
        for(const id of id_list){
            const result = op["message_delete"].run(id)
            if(result.changes === 0)
                throw new Error(`Could not delete message with id ${id}: not found`)
        }
        return true
    })
    return !!transaction()
}

export function DeleteCandidate(candidate_id: number): boolean{
    const transaction = db.transaction(() => {
        const candidate = op["candidate_get"].get(candidate_id) as IDatabaseCandidate
        if(!candidate)
            throw new Error(`Could not delete candidate with id ${candidate_id}: not found`)
        const siblings = op["candidate_list"].all(candidate.message_id) as Array<IDatabaseCandidate>
        if(siblings.length > 1){
            const result = op["candidate_delete"].run(candidate_id)
            if(result.changes === 0)
                throw new Error(`Could not delete candidate with id ${candidate_id}: not found`)
            return result.changes > 0
        }else{
            return DeleteMessages([candidate.message_id])
        }
    })
    return !!transaction()
}

export function Import(dir: string, content: IChat, overwrite: boolean = false){
    const transaction = db.transaction(() => {
        const exists: number = Find(dir, content.title)
        if(!!exists){
            if(overwrite){
                Delete(exists)
            }else{
                console.log(`Skipping chat [${dir}/${content.title}]: already exists in the database.`);
                return false;
            }
        }
        const chat = Create(dir, content, true)
        if(!chat)
            throw new Error(`Could not insert chat into the database`);
        console.log(`Imported chat [${dir}/${content.create_date}]: created with id ${chat.id}`);
        return true;
    })
    return transaction()
}

export function ImportChats(){
    let imported = 0
    const entries = fs.readdirSync(path_dir.chats, {
        recursive: false, withFileTypes: true
    })
    for(const entry of entries){
        if(!entry.isDirectory())
            continue
        const dir = path.join(path_dir.chats, entry.name)
        const files = fs.readdirSync(dir)
        for(const file of files){
            const ext = path.parse(file).ext
            const filepath = path.join(dir, file)
            try{
                if(!EXT_CHAT.includes(ext) || file.startsWith("."))
                    continue
                const content = fs.readFileSync(filepath, "utf-8")
                let success = false
                switch(ext){
                    case ".json":
                        success = Import(entry.name, JSON.parse(content))
                        break
                    case ".jsonl":
                        success = Import(entry.name, Tavern.parseChat(content))
                        break
                    default:
                        continue
                }
                if(success)
                    imported += 1
            }catch(error){
                console.warn(chalk.yellow(`Error trying to import chat from ${filepath}}:\n`) + error.message)
            }
        }
    }
    console.log(`Imported ${imported} chat(s) into the database`)
}

export function UpdateChatInteraction(chat: IChat, timestamp: number){
    const result = op["chat_update"].run(chat.title, timestamp, "{}", chat.id)
    return result.changes > 0
}

export function UpdateAllChatInteractions(){
    const result = op["chat_interactions"].run()
    return result.changes > 0
}