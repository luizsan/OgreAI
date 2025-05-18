export function clickOutside(node : HTMLElement, args?: { exclude?: Array<HTMLElement> }) {
    const handleClick = (event: Event) => {
        const target = event.target as HTMLElement;
        if (!event.target) {
            return;
        }
        if(args?.exclude){
            for(let i = 0; i < args.exclude.length; i++){
                if(args.exclude[i] && args.exclude[i].contains(target)){
                    return
                }
            }
        }
        if (node && !node.contains(target) && !event.defaultPrevented) {
            node.dispatchEvent(new CustomEvent("clickout", { bubbles: true }));
        }
    }
	document.body.addEventListener("click", handleClick, true);
	return {
        update(newValue?: Array<HTMLElement>){
            args.exclude = newValue;
        },
		destroy() {
			document.body.removeEventListener("click", handleClick, true);
		}
	};
}