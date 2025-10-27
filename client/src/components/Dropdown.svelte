<script lang="ts">
    import Heading from "./Heading.svelte";

    export let value : any = null;
    export let choices : Array<any>;
    export let editable : boolean = false;

    export let title : string = "";
    export let description : string = "";
    export let wide : boolean = false

    export let icon : string = "";
    export let capitalize : boolean = false

    export let after = () => {}
</script>

<div class="main section" class:wide={wide}>
    <Heading title={title} description={description}/>
    <div class="anchor component" class:min={!wide} class:wide={wide}>
        <select class="component" class:min={!wide} class:editable={editable} class:wide={wide} class:capitalized={capitalize} bind:value={value} on:change={after}>
            {#each choices as item}
                {#if typeof(item) === "object"}
                    <option value={item.key} class:capitalized={capitalize}>{item.title}</option>
                {:else}
                    <option value={item} class:capitalized={capitalize}>{item}</option>
                {/if}
            {/each}
        </select>

        {#if icon}
            <div class="icon disabled">
                {@html icon}
            </div>
        {/if}

        {#if editable}
            <input type="text" class="component cover" bind:value={value}>
        {/if}
    </div>
</div>

<style>
    .main{
        position: relative;
    }

    .capitalized{
        text-transform: capitalize;
    }
</style>
