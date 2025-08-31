import {
    ICandidate,
    ICharacter,
    IChat,
    IMessage
} from "../../shared/types.js"


import {
    existsSync,
    readdirSync,
    readFileSync,
    mkdirSync,
    writeFileSync,
    unlinkSync
} from "fs"


import {
    IDatabaseChat,
    IDatabaseCandidate,
    IDatabaseMessage,
    db, op
} from "../core/database.js"

import path from "path"
import chalk from "chalk"
import * as CAI from "../import/cai.ts"
import * as Tavern from "../import/tavern.ts"
import * as Format from "../../shared/format.ts"

const META_FILE: string = "_index.meta"

export default class Chat{

    static Create( character: ICharacter ): IChat{
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

    static New(character: ICharacter): IChat{
        const chat: IChat = Chat.Create(character)
        const transaction = db.transaction(() => {
            // create chat
            const character_id = path.parse(character.temp.filepath).name
            const chat_result: IDatabaseChat = op["chat_create"].get(
                character_id, chat.title, chat.create_date, chat.last_interaction, "{}"
            ) as IDatabaseChat | undefined
            if(!chat_result?.id)
                throw new Error("Failed to create chat");
            const chat_id: number = chat_result.id;

            // create initial message
            const message_result: any = op["message_create"].get(chat_id, 0, null, 0, "{}");
            if(!message_result.id)
                throw new Error("Failed to create first message on new chat");
            const message_id: number = message_result.id;

            // create greetings
            chat.messages.at(0).candidates.forEach((candidate, _index) => {
                op["candidate_create"].run(
                    message_id, candidate.text, null, candidate.timestamp, null, 0, null, "{}"
                )
            })
            return chat_id
        })
        chat.id = transaction()
        if(!!chat.id)
            console.log(`New chat created with id ${chat.id}`)
        return chat;
    }

    static ListChatsForCharacter(character_id: string): Array<IChat>{
        const chat_entries = op["chat_list"].all(character_id) as Array<IDatabaseChat>
        const list: Array<IChat> = chat_entries.map((entry: IDatabaseChat) => {
            let chat: IChat = {
                id: entry.id,
                title: entry.title,
                create_date: entry.create_date,
                participants: [ entry.character_id ],
                last_interaction: entry.last_interaction,
                messages: []
            }

            chat.messages = op["message_list"].all(chat.id).map((message: IDatabaseMessage) => {
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
                    candidates: candidates
                }
            })
            return chat
        })
        console.log(`Found ${list.length} chat(s) for character ${character_id}`)
        return list;
    }

    static Load(chat_id: number): IChat{
        const chat_entry: IDatabaseChat = op["chat_get"].get(chat_id) as IDatabaseChat | undefined
        if(!chat_entry)
            throw new Error(`Chat with id ${chat_id} not found`)

        const chat: IChat = {
            id: chat_id,
            title: chat_entry.title,
            participants: [ chat_entry.character_id ],
            create_date: chat_entry.create_date,
            last_interaction: chat_entry.last_interaction,
            messages: this.ListMessages(chat_id)
        }

        return chat
    }

    static ListMessages(chat_id: number): Array<IMessage>{
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
                candidates: candidates
            }
        })
        return messages
    }

    static AddMessage(chat_id: number, message: IMessage){
        const transaction = db.transaction(() => {
            // update chat's last interaction
            const chat = op["chat_get"].get(chat_id) as IDatabaseChat;
            if (!chat) {
                throw new Error(`Could not update chat last interaction: ${chat_id} not found`);
            }
            op["chat_update"].run( chat.title, Date.now(), "{}", chat_id)
            // create message
            const last = op["message_last"].get(chat_id, 1) as IDatabaseMessage;
            const parent : number = last ? last.id : null;
            const msg = op["message_create"].get(
                chat_id, message.participant, parent, message.index, "{}"
            ) as { id: number } | undefined
            if (!msg) {
                throw new Error(`Could not create message in chat ${chat_id}`);
            }
            // create candidates
            const current = message.candidates[0]
            const candidate = this.AddCandidate(msg.id, current)
            if (!candidate) {
                throw new Error(`Could not create candidate in m: ${msg.id}`);
            }
            return msg.id;
        })
        const msg_id = transaction()
        if( !!msg_id )
            console.log(`New message created in chat ${chat_id} with id ${msg_id}`)
        return msg_id
    }

    static AddCandidate(message_id: number, candidate: ICandidate){
        const transaction = db.transaction(() => {
            return op["candidate_create"].run(
                message_id,
                candidate.text || "",
                candidate.reasoning,
                candidate.timestamp || 0,
                candidate.model,
                candidate.timer || 0,
                candidate.tokens || "{}",
                "{}"
            )
        })
        return !!transaction()
    }

    static UpdateCandidate(candidate_id: number, candidate: ICandidate){
        const transaction = db.transaction(() => {
            const existing = op["candidate_get"].get(candidate_id)
            if (!existing) {
                throw new Error(`Could not update candidate: ${candidate_id} not found`);
            }
            return op["candidate_update"].run(
                candidate_id,
                candidate.text || "",
                candidate.reasoning,
                candidate.timestamp || 0,
                candidate.model,
                candidate.timer || 0,
                candidate.tokens || "{}",
                "{}"
            )
        })
        return !!transaction()
    }

    static Delete(chat_id: number){
        const result = op["chat_delete"].run(chat_id)
        if(result.changes === 0)
            throw new Error(`Could not delete chat with id ${chat_id}: not found`)
        return result.changes > 0
    }

    /*
    static ImportTavern( character: ICharacter, files: string[], dir: string ): boolean{
        if( !character ) return;

        try{
            for(let i = 0; i < files.length; i++){
                let file = files[i]
                let content = readFileSync( file, "utf-8")
                let parsed = Tavern.parseChat( content )
                if( parsed ){
                    let new_chat: IChat = this.Create(character)
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
                let new_chat: IChat = this.Create(character)
                this.Validate( new_chat, chats[i] )
                this.Save( new_chat, character, dir )
                return true
            }
        }catch(error){
            console.warn("Error trying to import Character.AI chat:\n" + error.message)
            return false
        }
    }
    */

}