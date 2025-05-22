<script lang="ts">
    interface Props {
        color?: string;
        opacity?: number;
        height?: string;
    }

    let { color = "black", opacity = 0.0333, height = "25vh" }: Props = $props();
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