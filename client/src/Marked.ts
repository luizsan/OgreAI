import { marked } from "marked"

const quotePattern = /(&quot;|")([^"]+)(\1)/gi

export function initializeMarked(){
    const marked_renderer = new marked.Renderer();

    marked_renderer.del = function(text : string){
        return "~" + text + "~"
    }
    marked_renderer.text = function(text : string){
        text = text.replaceAll("<", "&lt;")
        text = text.replaceAll(">", "&gt;")
        text = text.replace(quotePattern, `<span class="quote">"$2"</span>`)
        return text;
    }
    
    marked.setOptions({
        breaks: true,
        renderer: marked_renderer,
    })
}
