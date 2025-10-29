<script lang="ts">
    export let elements : Array<any> = []
    // the selected element
    export let value : any = elements[0];
    // override to define the value of the selected element
    export let key = (element : any) => element;
    // override to define the label
    export let label = (element : any) => element;

    export let wide : boolean = false
</script>

<div class="group horizontal">

    {#each elements as item}
        <label class="component deselect pointer" class:wide={wide}>
            <input type="radio" class="deselect disabled" bind:group={value} value={key(item)} checked={value == key(item)}>
            {label(item)}
        </label>
    {/each}

</div>

<style>
    .group{
        display: flex;
        gap: 1px;
    }

    label{
        position: relative;
        padding: 0px 16px;
        border-radius: 0px;
        font-size: 0.85em;
        display: flex;
        box-sizing: border-box;
        box-shadow: none;
    }

    input[type="radio"]{
        -webkit-appearance: none;
        -moz-appearance: none;;
        appearance: none;
        margin: 0px;
        width: 0px;
        height: 0px;
        position: absolute;
        opacity: 0;
    }

    label:has(input[type="radio"]:checked).component{
        color: var( --surface-primary-400 );
        background: var(--surface-neutral-300);
        outline-color: var(--surface-primary-400);
    }

    :global(body.light) label:has(input[type="radio"]:checked).component{
        color: var( --surface-primary-200 );
        background: var(--surface-primary-400);
        outline-color: var(--surface-primary-100);
    }

    label:has(input[type="radio"]:checked){
        z-index: calc(var( --layer-base ) + 2);
    }

    label:hover{
        z-index: calc(var( --layer-base ) + 1);
    }

    label:first-child{
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
    }

    label:last-child{
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
    }
</style>