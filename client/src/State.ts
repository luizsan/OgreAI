import { writable } from "svelte/store"

function getAddress(){
    const params = new URLSearchParams(window.location.search)
    const port = params.get("port") || 12480
    return `${window.location.protocol}//${window.location.hostname}:${port}`
}

export const localServer = getAddress()

// SERVER STATE
// local server status
export const connected = writable( false ) 
// target api status
export const api = writable( false )
// waiting for api reply
export const busy = writable( false ) 
// waiting for server fetch
export const fetching = writable( false )

// client state
export const editing = writable( null )
export const creating = writable( false )
export const deleting = writable( false )
export const history = writable( false )

// lists 
export const characterList = writable( [] )
export const chatList = writable( [] )
export const deleteList = writable( [] )
export const favoritesList = writable( [] )
export const availableAPIModes = writable( [] )

// defaults
export const defaultSettingsAPI = writable( null )
export const defaultPrompt = writable( null )

// storage
export const currentSettingsMain = writable( null )
export const currentSettingsAPI = writable( null )
export const currentPresets = writable( null )
export const currentProfile = writable( null )
export const currentLorebooks = writable( [] )

// logic
export const currentCharacter = writable( null )
export const currentCreate = writable( null )
export const currentChat = writable( null )

// customization
export const currentTheme = writable( "" )
export const currentPreferences = writable( {} )

// toggle elements
export const sectionCharacters = writable( false )
export const sectionEditing = writable( false )
export const sectionSettings = writable( false )
export const tabSettings = writable( "" )
export const tabEditing = writable( 0 )