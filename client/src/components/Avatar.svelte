<script lang="ts">
    import { currentCharacter } from "@/State";

    export let url : String;
    export let size : number;
</script>

<div class="avatar" style="background-image: url({url}?{$currentCharacter.last_changed})"></div>

<style>
    .avatar{
        background: #00000020;
        border-radius: 10%;
        background-size: cover;
        background-position: center;
    }
</style>