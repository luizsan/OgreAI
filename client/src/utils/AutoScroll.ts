import { tick } from "svelte";

export async function scroll(node : HTMLElement){
    await tick()
    node?.scrollTo({ top: node.scrollHeight });
}

export function AutoScroll(node : HTMLElement) {
    const callback = (_event : Event) => {
        scroll(node)
    }
    document.addEventListener("autoscroll", callback);
    scroll(node)

    return {
        destroy() {
			document.removeEventListener("autoscroll", callback);
		}
    }
}