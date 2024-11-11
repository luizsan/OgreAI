import { marked } from 'marked';
import * as SVG from "./SVGCollection.svelte"

const thinkingPattern = /<(thinking)>([\s\S]*?)<\/(\1)>/gi

export function addThinkingBlocks(node : Element, options : any){
    const thinkingReplacement = `
        <button class="thinking">
            <div class="heading">${SVG.chat} ${options.name}'s thoughts</div>
            <div class="content">$2</div>
        </button>`

    function parseThinking(){
        node.innerHTML = node.innerHTML.replace(thinkingPattern, thinkingReplacement)
        let content = node.querySelector(".content")
        if( content ){
            content.innerHTML = marked.parse(content.innerHTML)
        }

        const elements = node.querySelectorAll("button")
        elements?.forEach(element => {
            element?.addEventListener("click", (event) => toggleActive(event, element))
        });
    }

    function toggleActive(event : Event, element : Element){
        event.preventDefault();
        element.classList.toggle("active")
    }

    parseThinking()

    return{
        update(options : any){
            parseThinking()
        },

        destroy() {
            const elements = node.querySelectorAll("button")
            elements?.forEach(element => {
                element?.removeEventListener("click", (event) => toggleActive(event, element))
            });
        }
    }
}