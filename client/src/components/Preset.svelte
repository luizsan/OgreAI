<script lang="ts">
    import * as SVG from "../utils/SVGCollection.svelte";

    // object to build options
    export let elements : Array<any> 
    export let content : any // actual content
    let index : number = -1; // the numerical selection index

    $: enabled = elements && index > -1;

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
</script>


<div class="component group overall">
    <div class="top">
        {#if elements}
            <select class="component" bind:value={index} on:change={() => set(index)} style="flex: 1 1 auto">
                <option value={-1}>-- Select a prompt --</option>
                {#each elements as entry, i}
                    <option value={i}>{entry.name ?? `Preset ${i}`}</option>
                {/each}
            </select>
        {/if}
        <button class="component {enabled ? "confirm" : "normal disabled"}" id="apply" disabled={!enabled} on:click={() => set(index)}>Apply {@html SVG.arrow}</button>
        <button class="component danger" id="clear" on:click={clear}>Clear {@html SVG.close}</button>
    </div>
    <hr>
    <textarea class="component clear wide" rows={6} bind:value={content} on:change={() => update(content)}></textarea>
</div>

<style>
    hr{
        align-self: center;
        width: 100%;
        margin: 0px;
        border: 1px solid gray;
        opacity: 0.1;
    }

    .overall{
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 2px;
    }

    .top{
        height: 26px;
        display: flex;
        flex-direction: row;
        gap: 2px;
    }

    .top *{
        height: 100%;
    }

    button{
        padding: 0px 12px;
        font-size: 90%;
    }

    button, select{
        min-height: 12px;
        border-radius: 4px;
        border: none;
        outline: none;
        box-shadow: none;
        background: none;
    }

    button:hover{
        background: var( --component-bg-normal );
    }

    select:focus{
        background: var( --component-bg-hover );
    }

    select{
        padding: 2px 8px;
    }

    textarea{
        padding: 8px;
        font-size: 95%;
    }

    #apply :global(svg){
        width: 16px;
        height: 16px;
        transform: scaleX(-1);
        translate: 0px 0px;
    }

    #clear :global(svg){
        width: 14px;
        height: 14px;
        translate: 0px 0px;
    }

</style>