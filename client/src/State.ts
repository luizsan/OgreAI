import { writable } from "svelte/store"
import type {
    ISettings,
    IAPISettings,
    ICharacter,
    IChat,
    IPromptConfig,
    IUser,
    ILorebook,
    IChatMeta
} from "@shared/types"

function getAddress(){
    const params = new URLSearchParams(window.location.search)
    const port = params.get("port") || 12480
    return `${window.location.protocol}//${window.location.hostname}:${port}`
}

export const localServer = getAddress()

// SERVER STATE
// local server status
export const connected = writable<boolean>( false )
// target api status
export const api = writable<boolean>( false )
// waiting for api reply
export const busy = writable<boolean>( false )
// waiting for server fetch
export const fetching = writable<boolean>( false )

// CLIENT STATE
// current character being edited
export const editing = writable<ICharacter>( null )
// whether a character is being created
export const creating = writable<boolean>( false )
// toggles the state of batch deleting messages in chat
export const deleting = writable<boolean>( false )
// toggles the state of viewing chat history
export const history = writable<boolean>( false )
// stores the current search query
export const search = writable<string>( "" )

// LISTS
// stores the global list of characters
export const characterList = writable< Array<ICharacter> >( [] )
// stores the list of chats for the current character
export const chatList = writable< Array<IChatMeta> >( [] )
// stores the list of messages indices to be deleted
export const deleteList = writable< Array<number> >( [] )
// stores the list of favorite characters by filepath
export const favoritesList = writable< Array<string> >( [] )
// stores the list of available API modes by title
export const availableAPIModes = writable< Array<string> >( [] )

// DEFAULTS
// default schema for the selected API settings
export const defaultSettingsAPI = writable< Record<string, IAPISettings> >( null )
// default prompt order schema
export const defaultPrompt = writable< Record<string, IPromptConfig> >( null )

// STORAGE
// current overall settings
export const currentSettingsMain = writable<ISettings>( null )
// current API-specific settings
export const currentSettingsAPI = writable< Record<string,any> >( null )
// current prompt
export const currentPrompt = writable< Array<IPromptConfig> >( null )
// current prompt presets
export const currentPresets = writable< Record<string, any[]> >( null )
// current user profile
export const currentProfile = writable<IUser>( null )
// list of global lorebooks
export const currentLorebooks = writable< Array<ILorebook> >( [] )
// list of selected lorebooks
export const selectedLorebooks = writable< Array<ILorebook> >( [] )

// USER SELECTION
// currently selected character
export const currentCharacter = writable<ICharacter>( null )
// currently selected chat
export const currentChat = writable<IChat>( null )
// currently selected chat meta
export const currentChatMeta = writable<IChatMeta>( null )

// CUSTOMIZATION
// currently selected theme (dark or light)
export const currentTheme = writable<string>( "" )
// customization data
export const currentPreferences = writable< Record<string, any> >( {} )

// VIEWS
// toggles the state of the sidebar
export const sectionCharacters = writable<boolean>( false )
// toggles the state of the settings screen
export const sectionSettings = writable<boolean>( false )
// stores the state of the current settings tab
export const tabSettings = writable<string>( "" )
// stores the state of the current character tab (not yet implemented)
export const tabEditing = writable( 0 )