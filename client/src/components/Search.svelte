<script lang="ts">
    import * as SVG from "../utils/SVGCollection.svelte"

    export let search : string = ""
    export let elements : Array<any> = []
    export let results : Array<any> = []
    export let placeholder : string = ""
    // what to search in the array
    // assumes it's an Array of strings by default
    // override to access object fields
    export let item = (item : any) => item;
    export let sort = (a : string | any, b : string | any) => 0;

    $: results = update()

    function update(){
        results = elements.filter((element) => item(element).indexOf(search) > -1)
        if( sort ){
            results = results.toSorted(sort)
        }
        return results
    }

    function clear(){
        search = "";
        results = update()
    }
</script>


<div class="section">
    <input type="text" class="component" autocomplete="off" placeholder={placeholder} bind:value={search} on:input={update}>
    {#if search}
        <button class="normal icon cancel" on:click={clear}>{@html SVG.close}</button>
    {:else}
        <div class="normal disabled icon">{@html SVG.search}</div>
    {/if}
</div>


<style>
    input[type="text"]{
        position: relative;
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