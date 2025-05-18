import { get, writable } from "svelte/store";

export type DialogType = 'alert' | 'confirm' | 'prompt'
export type DialogData = {
    type: DialogType,
    title: string,
    message: string,
    initial?: string,
    resolve: (value: any) => void
}

export const data = writable<DialogData | null>(null)

export function isOpen(): boolean{
    return get( data ) !== null
}

export function alert(title: string, message: string): Promise<void>{
    return new Promise(resolve => data.set({ type: 'alert', title, message, resolve }))
}

export function confirm(title: string, message: string): Promise<boolean>{
    return new Promise(resolve => data.set({ type: 'confirm', title, message, resolve }))
}

export function prompt(title: string, message: string, initial: string = ''): Promise<string>{
    return new Promise(resolve => data.set({ type: 'prompt', title, message, initial, resolve }))
}