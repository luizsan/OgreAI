<script lang="ts">
    import Heading from "./Heading.svelte";



    interface Props {
        value?: any;
        choices: Array<any>;
        editable?: boolean;
        title?: string;
        description?: string;
        wide?: boolean;
        icon?: string;
        capitalize?: boolean;
    }

    let {
        value = $bindable(null),
        choices,
        editable = false,
        title = "",
        description = "",
        wide = false,
        icon = "",
        capitalize = false
    }: Props = $props();
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
        top: 6px;
        left: 12px;
    }
</style>
