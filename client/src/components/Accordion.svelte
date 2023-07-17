<script lang="ts">
    import { fade, scale, slide } from "svelte/transition";

    export let name = "";
    export let open = false;

    function Toggle(){ 
        open = !open;
        if( open ){
            
        }
    }

</script>

<div>
    <button class="component wide accordion normal" class:active={open} on:click={Toggle}>
        <span class="label">{name}</span>
    </button>

    {#if open}
        <div class="container" transition:slide={{duration: 150}}>
            <slot/>
        </div>
    {/if}
</div>

<style>
    .label{
        text-align: left;
        width: 100%;
    }

    .accordion{
        padding: 16px 16px;
        max-height: 32px;
    }

    .accordion:before{
        content: "▼";
        margin-right: 4px;
        text-align: right;
        transform: rotate(-90deg);
        font-size: 75%;
    }

    .accordion.active:before{
        transform: rotate(0deg);
    }

    .container{
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 24px;
        background-color: hsla(0, 0%, 0%, 0.075);
        border-radius: 0px 0px 6px 6px;
    }

    
</style>