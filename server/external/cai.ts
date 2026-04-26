import type {
    IChat,
    IMessage
} from "../../shared/types.js"

export function parseChat( json: any ): Array<IChat>{
    let chats: Array<IChat> = []

    if( !json ){ return chats; }
    if( !json.info || !json.info.character ){ return chats; }
    if( !json.histories || !json.histories.histories ){ return chats; }

    for( let c = 0; c < json.histories.histories.length; c++ ){
        try{
            let cai_chat = json.histories.histories[c];
            let new_chat: IChat = {
                title: cai_chat.external_id,
                create_date: Date.parse(cai_chat.created),
                last_interaction: Date.parse(cai_chat.last_interaction),
                participants: [ json.info.character.data.name ],
                messages: []
            }

            for( let m = 0; m < cai_chat.msgs.length; m++ ){
                let cai_msg = cai_chat.msgs[m]
                let timestamp: number = Date.parse(cai_msg.created)
                let new_msg: IMessage = {
                    participant: cai_msg.src.is_human ? -1 : 0,
                    index: 0,
                    timestamp: timestamp,
                    candidates: [
                        {
                            text: cai_msg.text.trim(),
                            timestamp: timestamp,
                        }
                    ]
                }
                new_chat.messages.push( new_msg )
            }

            if( new_chat.messages.length > 1 ){
                chats.push( new_chat )
            }

        }catch(error){
            console.warn("Error reading Character.AI chat\n" + error)
        }
    }

    return chats;
}