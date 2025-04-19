// user
export interface IUser{
    name : string;
    avatar : string;
    persona : string;
    customization : Record<string, any>;
    temp : any;
}

// character
export interface ICharacter{
    spec : string;
    spec_version : string;
    data : ICharacterBaseV2;
    metadata : ICharacterMetadata;
    temp : any;
}

// character v2 spec
export interface ICharacterBaseV2{
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
export interface ICharacterMetadata{
    created : number;
    modified : number;
}

// chat
export interface IChat{
    title : string;
    participants : Array<string>;
    create_date : number;
    last_interaction : number;
    messages : Array<IMessage>;
    filepath? : string;
}

// message entry in chat
export interface IMessage{
    participant : number;
    index : number;
    candidates : Array<ICandidate>;
}

// incoming reply from model
export interface IReply{
    done? : boolean;
    participant : number;
    swipe? : boolean;
    replace? : boolean;
    candidate : ICandidate;
}

// when the reply blows up
export interface IError{
    error: { type?: string, message: string };
}

// "swipe"
export interface ICandidate{
    text : string;
    reasoning? : string;
    timestamp? : number;
    model? : string;
    timer? : number;
    tokens? : Record<string, number>;
}

export interface ILorebook{
    name? : string;
    description? : string;
    scan_depth? : number; // check for tokens in the latest x messages
    token_budget? : number; // inserted tokens will not exceed this value
    recursive_scanning? : boolean; // entries can trigger other entries
    entries : Array<ILorebookEntry>;
    extensions : any;
}

export interface ILorebookEntry{
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

export interface IGenerationData{
    character : ICharacter;
    chat: IChat;
    user : IUser;
    settings : ISettings;
    prompt : any;
    swipe?: boolean;
    streaming?: boolean;
    books?: Record<string, ILorebook>;
}

export interface ISettings{
    api_mode: string;
    model : string;
    formatting?: Record<string, any>;
    prompt: Array<IPromptConfig>;
}

export interface IPromptEntry{
    role: string;
    content: string;
    prefix?: boolean;
}

export interface IPromptConfig{
    key: string;
    enabled?: boolean;
    allow_override?: boolean;
    content?: string;
}