<script lang="ts" context="module">

    export const themes = {
        "dark": { label: "Dark" },
        "light": { label: "Light" },
    }

    export const themeList : Array<string> = Object.keys(themes)

    export function updateRatio(){
        let ratio = window.innerWidth / window.innerHeight
        let source = ""
        let target = ""

        if(ratio >= 1){
            source = "portrait"
            target = "landscape"
        }else{
            source = "landscape"
            target = "portrait"
        }

        document.body.classList.remove(source)
        document.body.classList.add(target)
    }

    export function loadTheme(){
        let theme = window.localStorage.getItem("theme") 
        theme = themeList.includes(theme) ? theme : "dark"
        setTheme( theme )
        return theme;
    }

    export function setTheme(s: string){
        if(!themeList.includes(s)){
            if( themeList.length > 0 ){
                setTheme( themeList[0] )
            }
            return
        }

        window.localStorage.setItem("theme", s)
        for(let i = 0; i < themeList.length; i++){
            document.body.classList.remove( themeList[i] )
        }
        document.body.classList.add(s)
    }

</script>