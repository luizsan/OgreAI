<script lang="ts">
    
    
    

    interface Props {
        elements?: Array<any>;
        // the selected element
        value?: any;
        // override to define the value of the selected element
        key?: any;
        // override to define the label
        label?: any;
        wide?: boolean;
    }

    let {
        elements = [],
        value = $bindable(elements[0]),
        key = (element : any) => element,
        label = (element : any) => element,
        wide = false
    }: Props = $props();
</script>

<div class="group horizontal">

    {#each elements as item}
        <label class="component deselect pointer" class:wide={wide}>
            <input type="radio" class="component deselect" bind:group={value} value={key(item)} checked={value == key(item)}>{label(item)}
        </label>
    {/each}

</div>

<style>
    .group{
        display: flex;
        gap: 1px;
    }

    input[type="radio"]{
        position: absolute;
        margin: 0px;
        appearance: none;
        -moz-appearance: none;
    }

    label:has(:global(input[type="radio"]:checked)){
        z-index: 1;
    }

    label{
        padding: 0px 20px;
        border-radius: 0px;
        font-size: 0.9em;
    }

    label:first-child{
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
    }

    label:last-child{
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
    }
</style>