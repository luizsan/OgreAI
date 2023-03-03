export function ParseTavernChat( jsonl ){
    let lines = jsonl.split("\n")
    if( lines.length < 2 ){
        return null;
    }

    let info = JSON.parse( line[0] )
    let chat = {
        title: info.create_date.tosString(),
        participants: [ info.character_name ],
        created: info.create_date,
        last_interaction: info.create_date,
        messages: []
    }

    for( let line = 1; line < lines.length; line++){
        let old_msg = JSON.parse( lines[line] )
        let new_msg = {
            participant: old_msg.is_user ? -1 : 0,
            index: 0,
            candidates: [
                {
                    text: old_msg.mes,
                    timestamp: old_msg.send_date, 
                }
            ]
        }

        chat.messages.push( new_msg )
    }
    
    return chat;
}

exports.ParseTavernChat = ParseTavernChat