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

import path from "path"
import chalk from "chalk"

import * as Config from "../core/config.ts"
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

    static Validate( chat: IChat, source: any ): void{
        chat.title = source.title
        chat.participants = source.participants || []
        chat.create_date = source.created || source.create_date || Date.now()
        chat.last_interaction = source.last_interaction || Date.now()
        chat.messages = source.messages || []
    }

    static New(character: ICharacter, empty: boolean = false): IChat{
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
            if(!empty){
                // create initial message
                const message_result: any = op["message_create"].get(chat_id, Date.now(), 0, 0, "{}");
                if(!message_result.id)
                    throw new Error("Failed to create first message on new chat");
                const message_id: number = message_result.id;

                // create greetings
                chat.messages.at(0).candidates.forEach((candidate, _index) => {
                    op["candidate_create"].run(
                        message_id, candidate.text, null, candidate.timestamp, null, 0, null, "{}"
                    )
                })
            }
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
                length: op["message_list"].all(entry.id).length,
                messages: [ Chat.GetLastMessage(entry.id) ]
            }
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
            messages: Chat.ListMessages(chat_id)
        }
        return chat
    }

    static Update(chat: IChat){
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

    static Duplicate(chat: IChat, new_title: string, branch: ICandidate = null){
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
            const messages = Chat.ListMessages(chat.id)
            messages.forEach((message: IMessage) => {
                Chat.AddMessage(new_chat_id, message)
            })
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
                timestamp: message.create_date,
                candidates: candidates
            }
        })
        return messages
    }

    static GetLastMessage(chat_id: number): IMessage | undefined{
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

    static AddMessage(chat_id: number, message: IMessage){
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
            const msg = op["message_create"].get(
                chat_id,
                message.timestamp,
                message.participant,
                message.index,
                "{}"
            ) as { id: number } | undefined

            if (!msg) {
                throw new Error(`Could not create message in chat ${chat_id}`);
            }
            // create candidates
            for(let candidate of message.candidates){
                let new_candidate = this.AddCandidate(msg.id, candidate)
                if (!new_candidate) {
                    throw new Error(`Could not create new candidate in m: ${msg.id}`);
                }
            }
            return msg.id;
        })
        const msg_id = transaction()
        if( !!msg_id )
            console.log(`New message created in chat ${chat_id} with id ${msg_id}`)
        return msg_id
    }

    static UpdateMessage(message: IMessage){
        const transaction = db.transaction(() => {
            const existing = op["message_get"].get(message.id)
            if (!existing) {
                throw new Error(`Could not update message: ${message.id} not found`);
            }
            op["message_update"].run(
                message.id,
                message.participant,
                message.index,
                "{}"
            )
            return true
        })
        const success = transaction()
        return !!success
    }

    static GetMessage(id: any): IMessage | undefined{
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

    static SwipeMessage(message: IMessage, index: number){
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

    static ReparentMessages(chat_id: number){
        throw new Error("Not implemented")
    }

    static AddCandidate(message_id: number, candidate: ICandidate){
        const transaction = db.transaction(() => {
            const id = op["candidate_create"].run(
                message_id,
                candidate.text ?? "",
                candidate.reasoning ?? null,
                candidate.timestamp ?? 0,
                candidate.model ?? null,
                candidate.timer ?? 0,
                JSON.stringify(candidate.tokens) ?? "{}",
                "{}"
            )
            if(!id)
                throw new Error(`Could not create candidate in message: ${message_id}`);
            const num_candidates = op["candidate_list"].all(message_id).length;
            if( num_candidates > 0 )
                op["message_swipe"].run(message_id, num_candidates - 1)
            return id
        })
        return transaction()
    }

    static UpdateCandidate(candidate: ICandidate){
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

    static Delete(chat_id: number){
        const result = op["chat_delete"].run(chat_id)
        if(result.changes === 0)
            throw new Error(`Could not delete chat with id ${chat_id}: not found`)
        return result.changes > 0
    }

    static DeleteMessages(id_list: Array<number>){
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

    static DeleteCandidate(candidate_id: number){
        const result = op["candidate_delete"].run(candidate_id)
        if(result.changes === 0)
            throw new Error(`Could not delete candidate with id ${candidate_id}: not found`)
        return result.changes > 0
    }

    static ImportLegacyJSON(){

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