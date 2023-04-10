import { writable } from "svelte/store"

export const busy = writable( false )
export const sidebarCharacters = writable( false )
export const deleteMode = writable( false )

export const characterList = writable( [] )
export const testObject = writable( { ogey: "rrat" } )