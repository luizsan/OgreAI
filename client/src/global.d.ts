/// <reference types="svelte-gestures" />

declare module "marked"

declare namespace svelte.JSX {
	interface HTMLAttributes<T> {
		onoutclick?: (e: CustomEvent) => void
        onchatscroll?: (e: CustomEvent) => void
		onstartedit?: (e: CustomEvent) => void
		onlazyload?: (e: CustomEvent) => void
	}
}