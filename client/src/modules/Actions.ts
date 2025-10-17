import type { IMessage } from "@shared/types";
import { get, writable } from "svelte/store";

export type ContextData = {
    x: number,
    y: number,
    opener?: HTMLElement,
}

export const index = writable<number>(-1)
export const message = writable<IMessage | null>(null)
export const data = writable<ContextData | null>(null)

export function open(element: HTMLElement, new_msg: IMessage, new_id: number){
    index.set(new_id)
    message.set(new_msg)
    data.set({
        x: element.offsetLeft,
        y: element.offsetTop,
        opener: element
    })
}

export function close(){
    data.set(null)
}

export function isOpen(): boolean{
    return get( data ) !== null
}