/// <reference types="svelte-gestures" />

declare module "marked"
declare module "character-card-utils"

declare namespace svelte.JSX {
	interface HTMLAttributes<T> {
		onoutclick?: (e: CustomEvent) => void
        onchatscroll?: (e: CustomEvent) => void
		onstartedit?: (e: CustomEvent) => void
	}
}

interface ICharacter{
    spec : string;
    spec_version : string;
    data : ICharacterBaseV2;
    metadata : ICharacterMetadata;
    temp : any;
}

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
    alternate_greetings : string[]
    tags : string[]
}

interface ICharacterMetadata{
    created : number;
    modified : number;
}

interface IChat{
    title : string;
    participants : string[];
    create_date : number;
    last_interaction : number;
    messages : Array
}

interface IMessage{
    participant : number;
    index : number;
    candidates : ICandidate[];
}

interface IReply{
    swipe : boolean;
    candidate : ICandidate;
    participant : number;
}

interface ICandidate{
    text : string;
    timestamp : number;
    model : string;
}