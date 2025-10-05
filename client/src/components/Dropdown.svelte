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
</script>

<div class="section">
    <Heading title={title} description={description}/>
    <div class="component dropdown focus container min" class:dropdown={editable} class:container={editable} class:wide={wide}>

        <select class="component min" class:padding={!!icon} class:borderless={editable} class:wide={wide} class:capitalized={capitalize} bind:value={value}>
            {#each choices as item}
                {#if typeof(item) === "object"}
                    <option value={item.key} class:capitalized={capitalize}>{item.title}</option>
                {:else}
                    <option value={item}>{item}</option>
                {/if}
            {/each}
        </select>

        {#if icon}
            <div class="icon disabled">
                {@html icon}
            </div>
        {/if}

        {#if editable}
            <input type="text" class="component" bind:value={value}>
        {/if}
    </div>
</div>

<style>
    .capitalized{
        text-transform: capitalize;
    }

    .container{
        padding-right: 2px;
    }

    .padding{
        padding-left: 32px;
    }

    .icon{
        position: absolute;
        top: 7px;
        left: 12px;
    }
</style>
