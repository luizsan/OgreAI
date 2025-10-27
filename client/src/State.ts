import { writable } from "svelte/store"
import type {
    ISettings,
    IAPISettings,
    ICharacter,
    IChat,
    IPromptConfig,
    IUser,
    ILorebook,
    IMessage,
} from "@shared/types"

function getAddress(){
    const params = new URLSearchParams(window.location.search)
    const port = params.get("port") || 12480
    return `${window.location.protocol}//${window.location.hostname}:${port}`
}

export const localServer = getAddress()

// #region Server State
// local server status
export const connected = writable<boolean>( false )
// target api status
export const api = writable<boolean>( false )
// waiting for api reply
export const busy = writable<boolean>( false )
// waiting for server fetch
export const fetching = writable<boolean>( false )
// waiting for a message to be generated
export const generating = writable<boolean>( false )
// #endregion

// #region Client State
// current character being edited
export const editing = writable<ICharacter>( null )
// whether a character is being created
export const creating = writable<boolean>( false )
// toggles the state of batch deleting messages in chat
export const deleting = writable<boolean>( false )
// toggles the expanded swipe viewer
export const swipes = writable<IMessage>( null )
// toggles the state of viewing chat history
export const history = writable<boolean>( false )
// stores the current search query for characters
export const characterSearch = writable<string>( "" )
// stores the current search query for chats
export const chatSearch = writable<string>( "" )
// #endregion

// #region Lists
// stores the global list of characters
export const characterList = writable< Array<ICharacter> >( [] )
// stores the list of chats for the current character
export const chatList = writable< Array<IChat> >( [] )
// stores the chat count for each available character
export const chatCount = writable< Record<string, number> >( {} )
// stores the list of messages currently being edited
export const editList = writable< Array<IMessage> >( [] )
// stores the list of message indices to be deleted
export const deleteList = writable< Array<number> >( [] )
// stores the list of favorite characters by filepath
export const favoritesList = writable< Array<string> >( [] )
// stores the list of available API modes by title
export const availableAPIModes = writable< Array<{ key: string, title: string}> >( [] )
// #endregion

// DEFAULTS
// default schema for the selected API settings
export const defaultSettingsAPI = writable< Record<string, IAPISettings> >( null )
// default prompt order schema
export const defaultPrompt = writable< Record<string, IPromptConfig> >( null )

// #region Storage
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
// #endregion

// #region User Selection
// currently selected character
export const currentCharacter = writable<ICharacter>( null )
// currently selected chat
export const currentChat = writable<IChat>( null )
// #endregion

// #region Customization
// currently selected theme (dark or light)
export const currentTheme = writable<string>( "" )
// customization data
export const currentPreferences = writable< Record<string, any> >( {} )
// #endregion

// #region Interface
// toggles the state of the sidebar
export const sectionCharacters = writable<boolean>( false )
// toggles the state of the settings screen
export const sectionSettings = writable<boolean>( false )
// stores the state of the current settings tab
export const tabSettings = writable<string>( "" )
// stores the state of the current character tab (not yet implemented)
export const tabEditing = writable( 0 )
// #endregion