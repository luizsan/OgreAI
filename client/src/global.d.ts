declare namespace svelteHTML{
    interface HTMLAttributes<T>{
        'onstartedit'?: (event: any) => any;
        'onlazyload'?: (event: any) => any;
        'onclickout'?: (event: any) => any;
    }
}