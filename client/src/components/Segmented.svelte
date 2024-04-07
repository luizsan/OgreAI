<script lang="ts">
    export let elements : Array<any> = []
    // the selected element
    export let value : any;
    // override to define the value of the selected element
    export let key = (element : any) => element;
    // override to define the label
    export let label = (element : any) => element;

    export let wide : boolean = false
</script>

<div class="group horizontal">
    
    {#each elements as item}
        <label class="component deselect" class:wide={wide}>
            <input type="radio" class="component deselect" name="group" bind:group={value} value={key(item)} checked={value == key(item)}>{label(item)}
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

    label:has(input[type="radio"]:checked){
        z-index: 1;
    }

    label{
        padding: 0px 20px;
        border-radius: 0px;
        cursor: pointer;
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