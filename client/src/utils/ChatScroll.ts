import { tick } from "svelte";

export async function scroll(node : HTMLElement){
    await tick()
    if( !node )
        return;
    node.scrollTo({ top: node.scrollHeight });
}

export function ChatScroll(node : HTMLElement) {
    const scrollCallback = (_event : Event) => {
        scroll(node)
    }

    document.addEventListener("chatscroll", scrollCallback);
    return { 
        destroy() {
			document.removeEventListener("chatscroll", scrollCallback);
		}
    }
}