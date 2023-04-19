import { writable } from "svelte/store"

export const localServer = "http://192.168.0.8:8000"

// server state

// local server connection
export const connected = writable( false ) 
// api status
export const api = writable( false )
// waiting for reply
export const busy = writable( false ) 

// client state
export const editing = writable( false )
export const creating = writable( false )
export const deleting = writable( false )

// lists 
export const characterList = writable( [] )
export const availableAPIModes = writable( [] )
export const availableAPISettings = writable( [] )

// logic
export const currentSettings = writable( null )
export const currentProfile = writable( null )
export const currentCharacter = writable( null )
export const currentCreate = writable( null )
export const currentChat = writable( null )

// toggle elements
export const sectionCharacters = writable( false )
export const sectionEditing = writable( false )
export const sectionSettings = writable( false )