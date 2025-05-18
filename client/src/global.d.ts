declare namespace svelteHTML{
    interface HTMLAttributes<T>{
        'on:startedit'?: (event: any) => any;
        'on:lazyload'?: (event: any) => any;
        'on:clickout'?: (event: any) => any;
    }
}