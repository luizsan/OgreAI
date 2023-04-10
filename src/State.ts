import { writable } from "svelte/store"

export const busy = writable( false )
export const sidebarCharacters = writable( false )
export const creating = writable( false )
export const deleting = writable( false )

export const currentSettings = writable( {} )
export const currentProfile  = writable( {} )
export const currentCharacter  = writable( null )
export const currentCreate  = writable( null )
export const currentChat  = writable( null )
export const characterList = writable( [] )