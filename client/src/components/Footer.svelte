<script lang="ts">
    export let color : string = "black"
    export let opacity : number = 0.0333
    export let height : string = "50vh"
</script>

<div class="main grow" style="min-height: {height}; --stripe-color: {color}; opacity: {opacity}">
</div>

<style>
    .main{
        width: 100%;
        background: repeating-linear-gradient(
            -45deg,
            var( --stripe-color ),
            var( --stripe-color ) 10px,
            transparent 5px,
            transparent 20px
        );
    }
</style>