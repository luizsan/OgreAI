<script lang="ts">
    import { slide } from "svelte/transition";

    export let name : string = "";
    export let open : boolean = false;
    export let size : number = 0
    export let limit : number = undefined

    let self : HTMLElement;

    function Toggle(){ 
        open = !open;
    }

    function Scroll(){
        if( open ){
            self.scrollIntoView({ block: "nearest", behavior: "smooth" })
        }
    }

</script>

<div class="main" bind:this={self}>
    <button class="component wide accordion normal" class:active={open} on:click={Toggle}>
        {#if name}
            <span class="label">{name}</span>
        {:else}
            {#if limit && limit > -1}
                <span class="label">{`List (${size} of ${limit})`}</span>
            {:else}
                <span class="label">{`List (${size})`}</span>
            {/if}
        {/if}
    </button>

    {#if open}
        <div class="container" in:slide={{duration: 150}} on:introend={Scroll}>
            <slot/>
        </div>
    {/if}
</div>

<style>
    .main{
        scroll-margin: 20px;
    }

    .label{
        text-align: left;
        width: 100%;
    }

    .accordion{
        padding: 16px 16px;
        max-height: 32px;
        box-shadow: 0px 4px 8px 0px #00000030;
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