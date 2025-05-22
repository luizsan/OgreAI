<script lang="ts">
    import { run } from 'svelte/legacy';

    import * as SVG from "../svg/Common.svelte"

    // what to search in the array
    // assumes it's an Array of strings by default
    
    
    
    interface Props {
        search?: string;
        elements?: Array<any>;
        results?: Array<any>;
        placeholder?: string;
        // override to access object fields
        item?: any;
        // the condition to filter items
        condition?: any;
        // "post-process" the search results (can sort here)
        after?: any;
    }

    let {
        search = $bindable(""),
        elements = [],
        results = $bindable([]),
        placeholder = "",
        item = (item : any) => item,
        condition = (obj : any, arg : string) => obj.indexOf(arg) >- 1,
        after = (list : Array<any>) => list
    }: Props = $props();


    function update(){
        results = elements.filter((element) => condition(item(element), search))
        results = after(results)
        return results
    }

    function clear(){
        search = "";
        results = update()
    }
    run(() => {
        results = update()
    });
</script>


<div class="section wide">
    <input type="text" class="component wide" autocomplete="off" placeholder={placeholder} bind:value={search} oninput={update}>
    {#if search}
        <button class="normal icon cancel" onclick={clear}>{@html SVG.close}</button>
    {:else}
        <div class="normal disabled icon">{@html SVG.search}</div>
    {/if}
</div>


<style>
    input[type="text"]{
        position: relative;
        height: 30px;
        padding-left: 32px;
    }

    .icon{
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        translate: 4px -1px;
        width: 32px;
        height: 32px;
        opacity: 0.75;
    }
</style>