import { marked } from 'marked';
import * as SVG from "../svg/Common.svelte"

const keys = ["thinking", "think"]
const pattern = /<(thinking)>([\s\S]*?)<\/(\1)>\n*/gi

export function addToggleableBlocks(node: Element, args: { name: string, type?: string }) {
    function parseBlocks(){
        node.innerHTML = node.innerHTML.replace(pattern, (_match, tag, content) => {
            if ( keys.includes(tag) ){
               return `<p><button class="thinking ${args.type || ""}">
                    <div class="heading">${SVG.chat} ${args.name}</div>
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
        update(_options : any){
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