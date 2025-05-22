

<script lang="ts">
    import Heading from "./Heading.svelte";

    interface Props {
        value?: boolean;
        title?: string;
        description?: string;
        disabled?: any;
    }

    let {
        value = $bindable(false),
        title = "",
        description = "",
        disabled = () => false
    }: Props = $props();
</script>

<div class="toggle wide vertical" class:disabled={disabled()}>
    <label>
        <input type="checkbox" class="component" disabled={disabled()} bind:checked={value}>
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

    .disabled{
        opacity: 0.33;
    }
</style>