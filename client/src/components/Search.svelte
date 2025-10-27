<script lang="ts">
    import * as SVG from "../svg/Common.svelte"

    export let search : string = ""
    export let elements : Array<any> = []
    export let results : Array<any> = []
    export let placeholder : string = ""
    // the condition to filter items
    export let condition = (item : any, arg : string) => item.indexOf(arg) >- 1
    // "post-process" the search results (can sort here)
    export let after = (list : Array<any>) => list;

    $: results = update()

    function update(){
        results = elements.filter((element) => condition(element, search))
        results = after(results)
        return results
    }

    function clear(){
        search = "";
        results = update()
    }
</script>


<div class="anchor section wide">
    <input type="text" class="component wide" autocomplete="off" placeholder={placeholder} bind:value={search} on:input={update}>
    {#if search}
        <button class="normal cancel" on:click={clear}>
            <div class="normal icon">{@html SVG.close}</div>
        </button>
    {:else}
        <div class="normal icon disabled">{@html SVG.search}</div>
    {/if}
</div>

<style>
    button.cancel{
        position: absolute;
        top: 0px;
        left: 0px;
        width: 36px;
        height: 100%;
    }
</style>