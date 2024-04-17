<script lang="ts">
    import Heading from "./Heading.svelte";

    export let value : any = null;
    export let choices : Array<any>;
    export let editable : boolean = false;

    export let title : string = "";
    export let description : string = "";
    export let wide : boolean = false

    export let icon : string = "";
</script>

<div class="section">
    <Heading title={title} description={description}/>
    <div class="component dropdown container min" class:dropdown={editable} class:container={editable} class:wide={wide}>

        <select class="component min" class:padding={!!icon} class:borderless={editable} class:wide={wide} bind:value={value}>
            {#each choices as item}
                {#if typeof(item) === "object"}
                    <option value={item.key}>{item.title}</option>
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
    .container{
        padding-right: 2px;
    }

    .padding{
        padding-left: 32px;
    }

    .icon{
        position: absolute;
        top: 6px;
        left: 12px;
    }
</style>
