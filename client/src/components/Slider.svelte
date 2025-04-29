<script lang="ts">
    import * as SVG from "../utils/SVGCollection.svelte";
    import Heading  from "./Heading.svelte";

    export let value : number;
    export let original : number;
    export let title : string = "";
    export let description : string = "";

    export let min : number = undefined
    export let max : number = undefined
    export let step : number = undefined

    export let unit : string = ""

    let self : HTMLElement;

    function reset(){
        if( original !== undefined && value != original ){
            value = original;
            update()
        }
    }

    function update(){
        self.dispatchEvent(new Event("change", { bubbles: true }))
    }
</script>


<div class="section">
    <Heading title={title} description={description}/>
    <div class="input wide horizontal" bind:this={self}>
        <input type="number" class="component no-spin" class:padding={unit} step={step} bind:value={value}>
        <input type="range" class="component" bind:value={value} min={min} max={max} step={step}>
        <button class="reset danger" title="Reset to default ({original})" on:click={reset}>{@html SVG.refresh}</button>
        {#if unit}
            <div class="unit disabled deselect">{unit}</div>
        {/if}
    </div>
</div>


<style>
    input{
        position: unset;
    }

    input[type="number"]{
        padding-left: 40px;
        text-align: right;
    }

    input[type="number"].padding{
        padding-right: 24px;
    }

    .input{
        position: relative;
        display: grid;
        grid-template-columns: 128px auto;
        gap: 16px;
    }

    .reset{
        position: absolute;
        width: 32px;
        height: 30px;
        translate: 4px 0px;
        background: #80808016;
    }

    .reset :global(svg){
        translate: 0px 1px;
    }

    .unit{
        width: 20px;
        font-size: 0.8em;
        color: gray;
        position: absolute;
        left: -2px;
        translate: calc( 128px - 100%) 0px;
        height: 30px;
        display: flex;
        justify-content: flex-start;
        align-items: center;
    }
</style>