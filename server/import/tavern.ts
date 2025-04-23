import type { IChat } from "../../shared/types.d.ts"

const KEY_MAP = {
    "main": "base_prompt",
    "worldInfoBefore": "world_info",
    "worldInfoAfter": "character_book",
    "chatHistory": "messages",
    "jailbreak": "sub_prompt",
    "prefill": "prefill_prompt",
    "personaDescription": "persona",
    "charDescription": "description",
    "scenario": "scenario",
    "charPersonality": "personality",
    "dialogueExamples": "mes_example"
}

export function decodeTimestamp(str): number{
    // to whoever made me do this, I sincerely
    // hope you solve your skill issues someday
    const [y, m, d, h, min, s, ms] = str.match(/\d+/g);
    const date = new Date(y, m - 1, d, h || 0, min || 0, s || 0, ms || 0);
    return date.getTime()
}

export function parseJSONL( jsonl: string ): IChat{
    let lines = jsonl.split("\n")
    if( lines.length < 2 ){
        return null;
    }
    let info = JSON.parse( lines[0] )
    if( typeof(info.create_date) === "string" ){
        if( info.create_date.indexOf("@") > -1 ){
            info.create_date = decodeTimestamp(info.create_date)
        }else{
            info.create_date = new Date(info.create_date).getTime()
        }
    }
    let chat = {
        title: info.create_date.toString(),
        participants: [ info.character_name ],
        create_date: info.create_date,
        last_interaction: info.create_date,
        messages: []
    }
    for( let line = 1; line < lines.length; line++){
        let ref = JSON.parse( lines[line] )
        let msg = {
            participant: ref.is_user ? -1 : 0,
            index: 0,
            candidates: []
        }
        let timestamp = ref.send_date
        if( typeof(timestamp) === "string" ){
            if( timestamp.indexOf("@") > -1 ){
                timestamp = decodeTimestamp(timestamp)
            }else{
                timestamp = new Date(timestamp).getTime()
            }
        }

        if( ref.swipes ){
            if( ref.swipe_id ){
                msg.index = ref.swipe_id
            }

            for( let s = 0; s < ref.swipes.length; s++){
                msg.candidates.push({
                    text: ref.swipes[s],
                    timestamp: timestamp,
                })
            }
        }else{
            msg.candidates.push({
                text: ref.mes,
                timestamp: timestamp,
            })
        }
        if( timestamp > chat.create_date ){
            chat.last_interaction = timestamp
        }
        chat.messages.push( msg )
    }
    return chat;
}

export function convertPrompt(obj: any): Array<any>{
    let list = []
    obj.prompt_order[0]?.order.forEach((item) => {
        let id: string = item.identifier
        let enabled: boolean = item.enabled
        let target: any = obj.prompts.find((e) => e.identifier == id)
        let source: any = {
            key: "",
            enabled: enabled,
            open: false,
        }

        if( KEY_MAP[id] ){
            source.key = KEY_MAP[id]
        }else{
            source.key = "custom"
        }

        switch(id){
            case "main":
                source.content = target.content
                source.allow_override = !target.forbid_overrides
                break
            case "jailbreak":
                source.content = target.content
                break
            default:
                source.label = target.name || target.identifier
                source.role = target.role || "system"
                source.content = target.content
        }

        list.push(source)
        // insert prefill after jailbreak
        if(source.key === "sub_prompt" && obj.assistant_prefill){
            list.push({
                key: "prefill_prompt",
                enabled: true,
                content: obj.assistant_prefill,
                open: false,
            })
        }

    })
    return list
}