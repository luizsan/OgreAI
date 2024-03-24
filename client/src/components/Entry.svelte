<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import * as SVG from "../utils/SVGCollection.svelte"

    const dispatch = createEventDispatcher();

    export let placeholder : string = "";
    export let value : string = "";

    function remove(){
        dispatch("remove")
    }
</script>


<div class="content">
    <input type="text" class="component" placeholder={placeholder} bind:value={value}>
    <button class="component danger" on:click={remove}>{@html SVG.trashcan}</button>
</div>


<style>
    .content{
        display: grid;
        grid-template-columns: auto 32px;
        gap: 8px;
    }

    button{
        width: 100%;
        padding: 0px;
    }
</style>