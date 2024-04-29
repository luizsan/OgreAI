// character
interface ICharacter{
    spec : string;
    spec_version : string;
    data : ICharacterBaseV2;
    metadata : ICharacterMetadata;
    temp : any;
}

// character v2 spec
interface ICharacterBaseV2{
    // v1
    name : string;
    description : string;
    personality : string;
    scenario : string;
    author : string;
    first_mes : string;
    mes_example : string;

    // v2
    creator_notes : string
    creator : string
    character_version : string
    system_prompt : string
    post_history_instructions : string
    alternate_greetings : Array<string>
    tags : Array<string>
    character_book : ILorebook;
    extensions : any;
}

// ogre "exclusive"
interface ICharacterMetadata{
    created : number;
    modified : number;
}

// chat
interface IChat{
    title : string;
    participants : Array<string>;
    create_date : number;
    last_interaction : number;
    messages : Array<IMessage>;
    filepath? : string;
}

// message entry in chat
interface IMessage{
    participant : number;
    index : number;
    candidates : Array<ICandidate>;
}

// incoming reply from model
interface IReply{
    candidate : ICandidate;
    participant : number;
    swipe? : boolean;
    replace? : boolean;
}

// "swipe"
interface ICandidate{
    text : string;
    timestamp? : number;
    model? : string;
    timer? : number;
    tokens? : any;
}

interface ILorebook{
    name? : string;
    description? : string;
    scan_depth? : number; // check for tokens in the latest x messages
    token_budget? : number; // inserted tokens will not exceed this value
    recursive_scanning? : boolean; // entries can trigger other entries
    entries : Array<ILorebookEntry>;
    extensions : any;
}

interface ILorebookEntry{
    keys : Array<string>;
    content : string;
    extensions : any;
    enabled : boolean;
    insertion_order : number; // sort inserted entries by this value - lower = first
    case_sensitive? : boolean;
    name? : string;
    comment? : string; // fallback to name field. Why is ST like this?
    priority? : number; // if token budget is reached, lower priority = discarded first
    selective? : boolean // requires a key from both `keys` and `secondary_keys`
    secondary_keys? : Array<string>;
    constant? : boolean; // is always inserted?
}