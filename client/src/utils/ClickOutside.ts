export function clickOutside(node : HTMLElement, ignore?: Array<HTMLElement>) {

    const handleClick = (event: Event) => {
        const target = event.target as HTMLElement;
        if (!event.target) {
            return;
        }

        if(ignore){
            for(let i = 0; i < ignore.length; i++){
                if(ignore[i] && ignore[i].contains(target)){
                    return
                }
            }
        }

        if (node && !node.contains(target) && !event.defaultPrevented) {
            node.dispatchEvent(
                new CustomEvent('outclick')
            );
        }
    }

	document.addEventListener("click", handleClick, true);

	return {
		destroy() {
			document.removeEventListener("click", handleClick, true);
		}
	};
}