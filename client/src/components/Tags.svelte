<script lang="ts">
    import { run, preventDefault } from 'svelte/legacy';

    import { onMount } from 'svelte';
    import * as SVG from "../svg/Common.svelte"

    let self : HTMLElement = $state();
    const numDropdown : number = 5


    
    interface Props {
        choices?: Array<any>;
        selected?: Array<any>;
        placeholder?: string;
        notFound?: string;
        // use custom functions to retrieve object properties if choices aren't strings
        display?: any;
        item?: any;
    }

    let {
        choices = $bindable([ "Apples", "Bananas", "Coconuts", "Durians", "Eggplants" ]),
        selected = $bindable([]),
        placeholder = "Add tags...",
        notFound = "No tags found",
        display = (v : string | any) => v.toLowerCase(),
        item = (v : string | any) => v
    }: Props = $props();

    let inputText : string = $state("");
    let filtered = $state(choices);


    function filterTags() {
        selected = selected.filter(s => choices.some(c => item(c) == item(s)))
        filtered = choices.filter(e => item(e) && item(e).toLowerCase().includes(inputText.toLowerCase()));
        filtered = filtered.filter(e => !selected.some((s) => item(e) == item(s)))
    }

    function addTag(tag : string) {
        if(selected.includes(tag)){
            return
        }
        selected = [...selected, tag];
        // inputText = "";
        filterTags();
        self.dispatchEvent(new Event("change", { bubbles: true }))
    }

    function removeTag(index : number) {
        selected = selected.filter((_, i) => i !== index);
        filterTags()
        self.dispatchEvent(new Event("change", { bubbles: true }))
    }

    onMount(filterTags);
    run(() => {
        choices = choices;
        selected = selected;
        filterTags()
    });
</script>


<div class="section" bind:this={self}>
    <div class="component container input">
        <input type="text" class="component borderless wide" bind:value={inputText} oninput={filterTags} placeholder={placeholder}>

        {#if selected.length !== choices.length}
            <div class="component container dropdown wide ellipsis">
                {#if filtered.length > 0}
                    {#each filtered.slice(0, numDropdown) as element}
                        <button class="component borderless wide candidate ellipsis" onclick={preventDefault(() => addTag(element))}>{display(element)}</button>
                    {/each}
                {:else}
                    <button class="component borderless candidate empty disabled">{notFound}</button>
                {/if}
            </div>
        {/if}
    </div>

    <div class="selected">
        {#each selected as tag, index}
            <div class="tag accent">
                <span>{display(tag)}</span>
                <button onclick={() => removeTag(index)}>{@html SVG.close}</button>
            </div>
        {/each}
    </div>
</div>


<style>
    .selected{
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
    }

    .tag {
        position: relative;
        display: flex;
        align-items: center;
        background-color: var( --accent-color-normal );
        font-size: 0.8em;
        color: #fff;
        padding: 0px 32px 0px 8px;
        height: 24px;
        border-radius: 3px;
    }

    .tag button{
        position: absolute;
        right: 0px;
        width: 24px;
        height: 100%;
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
    }

    .tag button:hover{ background-color: var( --accent-color-dark ) }
    .tag button:active{ background-color: var( --accent-color-light ) }

    .tag :global(svg){
        width: 10px;
        height: 10px;
    }


    .candidate{
        padding: 4px 16px;
        font-size: 0.9em;
        justify-content: left;
        height: 24px;
        gap: 8px;
    }

    .candidate :global(svg){
        min-width: 16px;
        min-height: 16px;
    }

    .dropdown {
        display: none;
        position: absolute;
        z-index: 1000;
        top: calc( 100% + 4px );
        border: none;
        left: 0;
        width: fit-content;
        max-width: 100%;
        height: auto;
        overflow-y: auto;
        font-size: 0.9em;
    }

    .dropdown button{
        border-radius: 0px;
    }

    .input:focus-within .dropdown{
        display: flex;
        flex-direction: column;
    }
</style>
