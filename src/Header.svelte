<script>
    import { menu, settings } from "./assets/svg"
</script>


<header>
    <button>
        <div class="icon">{@html menu}</div>
    </button>
    <div>
        (it's) OgreAI
    </div>
    <button>
        <div class="icon">{@html settings}</div>
    </button>
</header>


<style>
    header{
        position: fixed;
        grid-template-columns: 48px auto 48px;
        top: 0px;
        left: 0px;
        width: 100%;
        height: var( --header-size );
        background: #00000080;
        border-bottom: 1px solid #FFFFFF40;
        display: grid;
        align-items: center;
        justify-items: center;
    }

    button{
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .icon{
        width: 24px;
        height: 24px;
    }
</style>