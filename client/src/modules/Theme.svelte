<script lang="ts" context="module">

    const themes = ["dark", "light"]

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
        if( themes.includes(theme) ){
            document.body.classList.add(theme)
        }else{
            document.body.classList.add("dark")
        }
    }
</script>