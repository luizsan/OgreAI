<script lang="ts">
    import * as SVG from "../svg/Common.svelte"

    export let search : string = ""
    export let elements : Array<any> = []
    export let results : Array<any> = []
    export let placeholder : string = ""
    // what to search in the array
    // assumes it's an Array of strings by default
    // override to access object fields
    export let item = (item : any) => item;
    // the condition to filter items
    export let condition = (obj : any, arg : string) => obj.indexOf(arg) >- 1
    // "post-process" the search results (can sort here)
    export let after = (list : Array<any>) => list;

    $: results = update()

    function update(){
        results = elements.filter((element) => condition(item(element), search))
        results = after(results)
        return results
    }

    function clear(){
        search = "";
        results = update()
    }
</script>


<div class="section wide">
    <input type="text" class="component wide" autocomplete="off" placeholder={placeholder} bind:value={search} on:input={update}>
    {#if search}
        <button class="normal icon cancel" on:click={clear}>{@html SVG.close}</button>
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