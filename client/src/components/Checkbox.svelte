

<script lang="ts">
    import Heading from "./Heading.svelte";

    export let value : boolean = false;
    export let title : string = "";
    export let description : string = "";
</script>

<div class="toggle wide vertical">
    <label>
        <input type="checkbox" class="component" bind:checked={value}>
    </label>
    <Heading title={title} description={description}/>
</div>

<style>
    .toggle{
        display: grid;
        grid-template-columns: 32px auto;
        gap: 16px;
    }

    label{
        display: flex;
    }

    input[type="checkbox"]{
        align-self: center;
    }
</style>