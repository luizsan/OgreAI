<script lang="ts">
    import Sidebar from "@/components/Sidebar.svelte";
    import {
        swipes
    } from "@/State";

</script>

<Sidebar side="right" enabled={!!$swipes}>

<div class="main">

</div>

</Sidebar>


<style>
    .main{
        inset: 0px;
        padding: 0px;
        margin: 0px;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        --scrollbar-bg: var( --sub-bg-color );

    }
</style>