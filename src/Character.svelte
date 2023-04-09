<script lang="ts">
    export let avatar : string = ""
    export let id : number = -1

    function clicked(){
        console.log(`clicked button ${id}\n${avatar}`)
    }
</script>

<button style="background-image: url({avatar})" on:click={clicked}></button>

<style>
    button{
        min-width: var( --avatar-size );
        min-height: var( --avatar-size );
        border: 0px;
        border-radius: 50%;
        padding: 0px;
        background-size: cover;
        background-repeat: no-repeat;
        transition: all 0.1s ease-out;
        outline: 0px solid white;
    }

    button:hover{
        outline-width: 3px;
    }
</style>