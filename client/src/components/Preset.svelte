<script lang="ts">
    import * as SVG from "../utils/SVGCollection.svelte";

    // object to build options
    export let elements : Array<any> 
    export let content : any = "" // actual content
    export let rows : number = 0
    export let resizable : Boolean = false

    let index : number = findEntryByContent(content)

    $: can_apply = elements && index > -1 && content != item(elements[index]);

    // functions to call when the value changes
    function set(i: number){
        if( i > -1 ){
            content = item( elements[i] )
        }
        update(content)
    }

    export let item = (e: any) => e;
    export let update = (v: any) => {}
    export function clear(){
        content = ""
        update(content)
    }

    export let save = (c: string) => {}

    function findEntryByContent(s : string){
        if(!elements) return -1
        return elements.findIndex((item) => item.content == s)
    }

    function refreshIndex(){
        index = findEntryByContent(content)
    }
    
</script>


<div class="main">
    <div class="component container">
        {#if elements}
        <div class="top">
            <div class="list">
                <select class="component borderless" bind:value={index} on:change={() => set(index)}>
                    <option value={-1}>-- Select a preset --</option>
                    {#each elements as entry, i}
                        <option value={i}>{entry.name ?? `Preset ${i}`}</option>
                    {/each}
                </select>
            </div>

            <div class="controls">
                <button class="component clear {can_apply ? "confirm" : "normal disabled"}" title="Apply preset" disabled={!can_apply} on:click={() => set(index)}>{@html SVG.confirm} Apply</button>
                <button class="component clear info" title="Save current" on:click={() => { save(content); refreshIndex(); }}>{@html SVG.save} Save</button>
                <button class="component clear danger" title="Clear" on:click={clear}>{@html SVG.close} Clear</button>
            </div>
        </div>
        
        <hr>
        {/if}
        
        <textarea class="component clear wide" class:resizable={resizable} rows={rows > 0 ? rows : 0} bind:value={content} on:change={() => update(content)}></textarea>
    </div>
</div>


<style>
    hr{
        align-self: center;
        width: calc( 100% - 20px );
        margin: 0px;
        border: none;
        border-bottom: 2px dotted gray;
        opacity: 0.2;
    }

    .main{
        display: flex;
        width: 100%;
        flex-direction: column;
        gap: 8px;
    }

    select{
        height: 32px;
        width: 100%;
    }

    textarea{
        margin: 0px;
        padding: 8px;
        font-size: 0.9em;
        resize: none;
    }

    textarea.resizable{
        resize: vertical;
    }

    .list{
        flex: 1 1 content;
        min-width: 50%;
    }

    .top{
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        height: fit-content;
    }

    .controls{
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
    }

    .controls button{
        height: 32px;
        display: flex;
        align-items: center;
        padding: 4px 16px;
    }

    .controls button :global(svg){
        width: 16px;
        height: 16px;
    }
    
    .controls button.disabled{
        opacity: 0.25;
    }

</style>