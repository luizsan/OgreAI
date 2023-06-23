<div class="container">
    <div class="main">
        <slot></slot>
    </div>
</div>

<style>
    .container{
        --scrollbar-bg: hsl(0, 0%, 15%);
        
        background: var( --default-bg-color);
        bottom: 0px;
        display: flex;
        flex-direction: column;
        left: 0px;
        position: absolute;
        overflow-x: hidden;
        right: 0px;
        overflow-y: scroll;
        top: var( --header-size );
    }

    .main{
        align-self: center;
        display: flex;
        flex-direction: column;
        height: 100%;
        max-width: var( --chat-width );
        width: 100%;
    }
</style>