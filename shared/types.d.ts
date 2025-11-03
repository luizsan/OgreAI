// user
export interface IUser{
    name : string;
    avatar : string;
    persona : string;
    customization : Record<string, any>;
    temp?: any;
}

// character
export interface ICharacter{
    spec : string;
    spec_version : string;
    data : ICharacterBaseV2;
    metadata : ICharacterMetadata;
    temp : {
        filename : string;
        filepath : string;
        avatar : string;
        chat_count? : number,
        chat_latest? : number,
        tokens?: Record<string, number>;
        filecreated? : number;
        filemodified? : number;
    };
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
    extensions : Record<string, any>;
}

// ogre "exclusive"
export interface ICharacterMetadata{
    created? : number;
    modified? : number;
    version? : number;
    source? : string;
    tool? : {
        name : string;
        version : string;
        url : string;
    }
}

// chat
export interface IChat{
    id? : number;
    title : string;
    participants : Array<string>;
    create_date : number;
    last_interaction : number;
    length?: number;
    messages : Array<IMessage>;
    // filepath? : string;
}

// message entry in chat
export interface IMessage{
    id? : number;
    participant : number;
    index : number;
    timestamp : number;
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
    id? : number;
    text : string;
    timestamp : number;
    model? : string;
    reasoning? : string;
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
    extensions : Record<string, any>;
    temp?: any;
}

export interface ILorebookEntry{
    keys : Array<string>;
    content : string;
    extensions : Record<string, any>;
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
    prompt : Array<IPromptConfig>;
    swipe?: boolean;
    streaming?: boolean;
    books?: Array<ILorebook>;
    output?: any;
}

export interface ISettings{
    api_mode: string;
    model : string;
    formatting?: Record<string, any>;
    prompt: Array<IPromptConfig>;
}

export interface IAPISettings{
    title: string;
    description: string;
    depends_on?: string;
    /**
     * The type of setting. Accepted strings are:
     * - "select": A dropdown selection from predefined choices.
     * - "range": A numeric slider within a specified range.
     * - "checkbox": A toggleable true/false option.
     * - "text": A single-line text input.
     * - "textarea": A multi-line text input.
     * - "list": An array of items
     * - "dictionary": An object with a single key-value pair
    **/
    type: string;
    default: any;

    // select
    choices?: Array<string>;
    capitalize?: boolean;

    // range
    min?: number;
    max?: number;
    step?: number;
    unit?: string;

    // text
    placeholder?: string;

    // list
    length?: number;
    limit?: number;

    // dictionary
    value?: string;
}

export interface IPromptEntry{
    role: string;
    content: string;
    prefix?: boolean;
}

export interface IPromptConfig{
    key: string;
    //
    content?: string;
    enabled: boolean;
    role?: string;
    open?: boolean;
    allow_override?: boolean;
    // defauls
    editable?: boolean;
    toggleable?: boolean;
    overridable?: boolean;
    label?: string;
    description?: string;
    row_size?: number;
    locked?: string;
}

export interface IReplaceEntry{
    name?: string;
    enabled: boolean;
    pattern?: string;
    replacement: string;
    mode: string;
    flags?: string;
}