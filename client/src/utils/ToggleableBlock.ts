import { marked } from 'marked';
import * as SVG from "./SVGCollection.svelte"

const keys = ["thinking", "think"]
const pattern = /<(thinking)>([\s\S]*?)<\/(\1)>\n*/gi

export function addToggleableBlocks(node : Element, options : any){
    function parseBlocks(){
        node.innerHTML = node.innerHTML.replace(pattern, (match, tag, content) => {
            if ( keys.includes(tag) ){
               return `<p><button class="thinking">
                    <div class="heading">${SVG.chat} ${options.name}</div>
                    <div class="content">${marked.parse(content)}</div>
                </button></p>`
            }
        })

        const elements = node.querySelectorAll("button")
        elements?.forEach(element => {
            element?.addEventListener("click", (event) => toggleActive(event, element))
        });
    }

    function toggleActive(event : Event, element : Element){
        event.preventDefault();
        element.classList.toggle("active")
    }

    parseBlocks()

    return{
        update(options : any){
            parseBlocks()
        },

        destroy() {
            const elements = node.querySelectorAll("button")
            elements?.forEach(element => {
                element?.removeEventListener("click", (event) => toggleActive(event, element))
            });
        }
    }
}