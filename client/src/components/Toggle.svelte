<script lang="ts">
    export let value: boolean = false;
    export let size: number = 16;
    export let mirror: boolean = false;
    export let title: string = "";
    export let toggled: Function = (_b: boolean): void => {};
    function toggle(){
        value = !value;
        toggled(value);
    }
</script>

<button

    class={value ? "info" : "normal"}
    class:mirror={mirror}
    on:click={toggle}
    style="--size: {size}px"
    title={title}
>
    <slot></slot>
</button>

<style>
    button{
        position: relative;
        cursor: pointer;
    }

    button :global(svg){
        width: var( --size);
        height: var( --size);
        pointer-events: none;
    }

    button.mirror :global(svg){
        transform: scaleX(-1);
    }
</style>