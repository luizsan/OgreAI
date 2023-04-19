/// <reference types="svelte-gestures" />

declare namespace svelteHTML {
    interface HTMLProps<T> {
        outclick?: (e: CustomEvent) => void;
    }
}

interface ICandidate{
    text : string;
    timestamp : number;
}
