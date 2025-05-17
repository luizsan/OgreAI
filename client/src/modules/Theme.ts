export const themes = {
    "dark": { label: "Dark" },
    "light": { label: "Light" },
}

export const themeList : Array<string> = Object.keys(themes)

export function updateRatio(){
    const ratio = window.innerWidth / window.innerHeight
    const source = ratio >= 1 ? "portrait" : "landscape"
    const target = ratio >= 1 ? "landscape" : "portrait"
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