<script lang="ts">
    let { instrumentName, imgUrl, onCycleLeft, onCycleRight } = $props<{
        instrumentName: string;
        imgUrl: string;
        onCycleLeft?: () => void;
        onCycleRight?: () => void;
    }>();
</script>

<div class="instrument">
    <button class="nav-button left" onclick={onCycleLeft} disabled={!onCycleLeft}>
        &lt;
    </button>
    <img src={imgUrl} alt={instrumentName} />
    <button class="nav-button right" onclick={onCycleRight} disabled={!onCycleRight}>
        &gt;
    </button>
    <p class="instrument-label">
        {instrumentName}
    </p>
</div>

<style>
    .instrument {
        display: grid;
        grid-template-columns: 32px 1fr 32px;
        grid-template-rows: 1fr min(70px, 12vmin); 
        grid-column-gap: 4px;
        grid-row-gap: 20px;
        align-items: center;
        justify-items: center;
        justify-content: center;
        flex-direction: column;
        /* text-align: center; */
        /* height: min(400px, calc(100vh - 120px)) !important; */
    }

    .instrument-label {
        font-size: min(70px, 12vmin);
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        /* height: 0 !important; */
        grid-area: 2 / 1 / 3 / 4;
    }
 
    .instrument img {
        max-width: 100%;
        max-height: calc(100vh - 120px);
        /* margin: min(16px, 6.7vmin); */
    }
    .nav-button {
        font-size: min(32px, 7vw);
        background: none;
        border: none;
        color: #fff;
        cursor: pointer;
        padding: 0.5rem;
        transition: opacity 0.3s;
    }

    .nav-button:active:not(:disabled) {
        opacity: 0.5;
    }

    .nav-button:disabled {
        opacity: 0.3;
        cursor: default;
    }
</style>