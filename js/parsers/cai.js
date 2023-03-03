export function ParseCAIChat( json ){
    let chats = []

    if( !json ){ return chats; }
    if( !json.info || !json.info.character ){ return chats; }
    if( !json.histories || !json.histories.histories ){ return chats; }

    for( let c = 0; json.histories.histories.length; c++ ){
        try{
            let cai_chat = json.histories.histories[c];
            let new_chat = {
                title: cai_chat.external_id,
                created: Date.parse(cai_chat.created),
                last_interaction: Date.parse(cai_chat.last_interaction),
                participants: [ json.info.character.name ],
                messages: []
            }

            for( let m = 0; m < cai_chat.msgs.length; m++ ){
                let cai_msg = cai_chat.msgs[m]
                let new_msg = {
                    participant: cai_msg.src.is_human ? -1 : 0,
                    index: 0,
                    candidates: [
                        {
                            text: cai_msg.text.trim(),
                            timestamp: Date.parse(cai_msg.created), 
                        }
                    ]
                }
            }

            chats.push( new_chat )

        }catch(error){
            console.warn("Error reading character.ai chat\n" + error)
        }
    }

    return chats;
}

exports.ParseCAIChat = ParseCAIChat