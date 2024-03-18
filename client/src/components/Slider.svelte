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

    let self : HTMLElement;

    function reset(){
        if( original && value != original ){
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
        <input type="number" class="component no-spin" step={step} bind:value={value}>
        <input type="range" class="component" bind:value={value} min={min} max={max} step={step}>
        <button class="sub danger" title="Reset to default ({original})" on:click={reset}>{@html SVG.refresh}</button>
    </div>
</div>


<style>
    input{
        position: unset;
    }

    input[type="number"]{
        padding-left: 40px;
    }

    .input{
        display: grid;
        grid-template-columns: 128px auto;
        gap: 16px;
    }

    .sub{
        position: absolute;
        width: 32px;
        height: 30px;
        translate: 4px 0px;
        background: #80808016;
    }

    .sub :global(svg){
        translate: 0px 1px;
        width: 18px;
        height: 18px;
    }
</style>