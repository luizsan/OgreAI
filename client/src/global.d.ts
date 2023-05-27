/// <reference types="svelte-gestures" />

declare module "marked"

declare namespace svelte.JSX {
	interface HTMLAttributes<T> {
		onoutclick?: (e: CustomEvent) => void
	}

	interface HTMLAttributes<T> {
		onchatscroll?: (e: CustomEvent) => void
	}
}

interface ICharacter{
    name : string;
    description : string;
    greeting : string;
    personality : string;
    scenario : string;
    dialogue : string;
    author : string;
    create_date : number;
    last_changed : number;
    metadata : any;
}

interface IChat{
    title : string;
    participants : string[];
    created : number;
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
}