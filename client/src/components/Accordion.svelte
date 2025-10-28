<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { slide } from "svelte/transition";

    const dispatch = createEventDispatcher();

    export let name : string = "";
    export let open : boolean = false;
    export let size : number = 0
    export let limit : number = undefined
    export let showSize : boolean = false;
    export let enabled : boolean = true;

    $: label = `${name ? name : "List"}`;

    let self : HTMLElement;

    function Toggle(){
        open = !open;
        dispatch(open ? "open" : "close")
    }

    function Scroll(){
        if( open ){
            self.scrollIntoView({ block: "nearest", behavior: "smooth" })
        }
    }

</script>

<div class="main" bind:this={self} class:blocked={!enabled}>
    <button class="component wide accordion normal" class:active={open} on:click={Toggle}>
        <span class="label deselect">{label}</span>

        {#if showSize}
            {#if limit && limit > -1}
                <span class="size deselect">{`(${size} of ${limit})`}</span>
            {:else}
                <span class="size deselect">{`(${size})`}</span>
            {/if}
        {/if}
    </button>

    {#if open && enabled}
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
    }

    .size{
        opacity: 0.33;
    }

    .accordion{
        padding: 16px 16px;
        max-height: 32px;
        place-content: flex-start;
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