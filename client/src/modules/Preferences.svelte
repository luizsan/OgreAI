<script lang="ts" context="module">

    export const prefs = {

        chat_background: {
            title: "Chat background",
            description: "Sets the orientation of the character's image as the background of the chat screen.",
            type: "choice", default: "", choices: ["", "horizontal", "vertical"],
            disabled: () => false,
        },

        background_coverage: {
            title: "Background coverage",
            description: "Controls how much percentage of the screen is covered by the background.",
            type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%",
            disabled: (userprefs) => !userprefs["chat_background"],
        },

        background_opacity: {
            title: "Background opacity",
            description: "Controls the opacity of the background.",
            type: "range", default: 50, min: 0, max: 100, step: 1, unit: "%",
            disabled: (userprefs) => !userprefs["chat_background"],
        },

        content_width: {
            title: "Content width",
            description: "Controls the maximum width of chat, editing and settings screens.",
            type: "range", default: 900, min: 600, max: window.screen.availWidth, step: 10, unit: "px",
            disabled: () => document.body.classList.contains("portrait"),
        },

        show_datetime: {
            title: "Show date & time",
            description: "Toggle the display of date and time in chat messages.",
            type: "checkbox", default: false,
            disabled: () => false,
        },

        show_model: {
            title: "Show model",
            description: "Toggle the display of the model used to generate the reply in chat.",
            type: "checkbox", default: false,
            disabled: () => false,
        },

        show_timer: {
            title: "Show timer",
            description: "Toggle the display of the time taken to generate the response for each message.",
            type: "checkbox", default: false,
            disabled: () => false,
        },

        enter_sends_message: {
            title: "Send message with Enter",
            description: "Off - Sends message with Shift+Enter, newline with Enter.\nOn - Sends message with Enter, newline with Shift+Enter.",
            type: "checkbox", default: false,
            disabled: () => false,
        },

        load_last_chat: {
            title: "Auto-load last chat",
            description: "Automatically loads the latest chat you interacted with at the start of the application.",
            type: "checkbox", default: true,
            disabled: () => false,
        },
    }

    export const prefsList = Object.keys(prefs)

    export function loadAllPreferences(){
        let obj = {}
        prefsList.forEach(key => {
            let value : any = window.localStorage.getItem(key)

            if( value === "null" ) value = null
            if( value === "NaN" ) value = NaN
            if( value === "undefined" ) value = undefined
            if( value === "true" ) value = true
            if( value === "false" ) value = false

            if( prefs[key].type == "select"){
                value = prefs[key].choices.find(item => item.key === value)
            }else if(parseFloat(value)){
                value = parseFloat(value)
            }

            obj[key] = value !== null && value !== undefined ? value : prefs[key].default;
            setPreference(key, obj[key])
        });
        return obj;
    }

    export function setPreference(key : string, value : any){
        if(!prefsList.includes(key)){
            return;
        }
        window.localStorage.setItem(key, value)
    }

</script>