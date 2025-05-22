<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { slide } from "svelte/transition";

    const dispatch = createEventDispatcher();

    interface Props {
        name?: string;
        open?: boolean;
        size?: number;
        limit?: number;
        showSize?: boolean;
        enabled?: boolean;
        onclose?: Function;
        children?: import('svelte').Snippet;
    }

    let {
        name = "",
        open = $bindable(false),
        size = 0,
        limit = undefined,
        showSize = false,
        enabled = true,
        onclose = () => {},
        children
    }: Props = $props();

    let label = $derived(`${name ? name : "List"}`);

    let self : HTMLElement = $state();

    function Toggle(){
        open = !open;
        dispatch(open ? "open" : "close")
        if( !open )
            onclose()
    }

    function Scroll(){
        if( open ){
            self.scrollIntoView({ block: "nearest", behavior: "smooth" })
        }
    }

</script>

<div class="main" bind:this={self} class:blocked={!enabled}>
    <button class="component wide accordion normal" class:active={open} onclick={Toggle}>
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
        <div class="container" in:slide={{duration: 150}} onintroend={Scroll}>
            {@render children?.()}
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
        box-shadow: 0px 4px 8px 0px #00000030;
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