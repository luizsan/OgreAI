<div class="container">
    <div class="main">
        <slot></slot>
    </div>
</div>

<style>
    .container{
        background: hsl(0, 0%, 15%);
        bottom: 0px;
        display: flex;
        flex-direction: column;
        left: 0px;
        position: absolute;
        overflow-x: hidden;
        right: 0px;
        overflow-y: scroll;
        top: var( --header-size );
        scrollbar-color: #909090 transparent;
    }

    @media (prefers-color-scheme: light){
        .container{
            background: hsl(0, 0%, 85%);
        }
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