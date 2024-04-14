import { tick } from "svelte";

export async function scroll(node : HTMLElement){
    await tick()
    node?.scrollTo({ top: node.scrollHeight });
}

export function ChatScroll(node : HTMLElement, options : any) {
    const scrollCallback = (_event : Event) => {
        scroll(node)
    }

    document.addEventListener("chatscroll", scrollCallback);
    scroll(node)
    
    return {
        update(options : any) {
            if( options?.chat?.messages ){
                scroll(node)
            }
        },
        destroy() {
			document.removeEventListener("chatscroll", scrollCallback);
		}
    }
}