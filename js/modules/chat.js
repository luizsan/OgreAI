const fs = require("fs")
const path = require("path")

class Chat{
    constructor( character ){
        let timestamp = Date.now()
        this.title = timestamp.toString()
        this.participants = []
        this.created = timestamp
        this.last_interaction = timestamp

        if( character ){
            this.participants.push( character.name )
            this.messages = [
                {
                    "participant": 0,
                    "index": 0,
                    "candidates": [ 
                        { "timestamp": Date.now(), "text": character.greeting },
                    ],
                },
            ]
        }
    }

    static path = "./user/chats/"

    SetFrom( chat ){
        this.title = chat.title
        this.participants = []
        for( let p = 0; p < chat.participants.length; p++ ){
            this.participants.push( chat.participants[p] )
        }
        this.created = chat.created
        this.last_interaction = chat.last_interaction
        this.messages = []
        for( let m = 0; m < chat.messages.length; m++ ){
            let old_msg = chat.messages[m]
            let new_msg = {
                participant: old_msg.participant,
                index: old_msg.index,
                candidates: [],
            }

            for( let c = 0; c < old_msg.candidates.length; c++ ){
                let old_candidate = old_msg.candidates[c]
                let new_candidate = {
                    timestamp: old_candidate.timestamp,
                    text: old_candidate.text
                }

                new_msg.candidates.push( new_candidate )
            }

            this.messages.push( new_msg )
        }
    }

    static GetLatestChat(character){
        if( !character ){
            return null;
        }

        let result = new Chat( character )
        let target = path.join(Chat.path, character.name, "/" )
        if(fs.existsSync(target)){
            try{
                let files = fs.readdirSync(target)
                let latest_time = 0;
                let latest_chat = null;
                
                for(let i = 0; i < files.length; i++){
                    if(!files[i].toLowerCase().endsWith('.json')){
                        continue;
                    }
                    
                    let filepath = path.join(target, files[i])
                    let chat = fs.readFileSync( filepath, "utf-8")
                    let parsed = JSON.parse( chat )
                    if( parsed.last_interaction > latest_time && parsed.messages.length > 0 ){
                        latest_time = parsed.last_interaction;
                        latest_chat = parsed;
                    }
                }
    
                if( latest_chat ){
                    result.SetFrom( latest_chat )
                    console.debug(`Loaded latest chat for character ${character.name}`)
                    return result
                }
    
            }catch(error){
                console.warn(error)
            }
        }

        console.debug(`Started new chat for character ${character.name}`)
        return result;
    }

    Save( character ){
        if( !character ) return;
        if( !character.name || character.name.length < 1 ) return;
    
        let filename = this.created + ".json";
        let folder =  path.join(Chat.path, character.name)
        let target = path.join(folder, filename)
    
        try{
            if(!fs.existsSync(folder)){
                fs.mkdirSync(folder);
            }
    
            let json = JSON.stringify(this, function(key, value){ 
                return key != "dom" ? value : undefined;
            });
    
            fs.writeFileSync(target, json);
            console.debug(`Saved chat at ${target}`)
        }catch(error){
            console.warn(`Could not save chat at ${target}\n${error}`)
        }
    }
}

exports.Chat = Chat