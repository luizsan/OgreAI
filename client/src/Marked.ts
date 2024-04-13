import { marked } from "marked"

const quotePattern = /(&quot;|")([^"]+)(\1)/gi

export const marked_renderer = new marked.Renderer();
marked_renderer.del = function(text : string){ return "~" + text + "~"; };
marked_renderer.list = function(text : string, ordered : boolean){
    return ordered ? '<ol>' + text + '</ol>' : '<ul>' + text + '</ul>';
}

marked_renderer.listitem = function(text : string){
    return '<li>' + text + '</li>';
}

marked_renderer.code = function(text : string) {
    text = text.replace("&", "&gt;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    return '<div class="codeblock"><code>' + text + '</code></div>';
};

marked_renderer.text = function(text : string){
    text = text.replace(quotePattern, `<span class="quote">"$2"</span>`)
    return text;
}

marked.setOptions({
    breaks: true,
    renderer: marked_renderer,
})