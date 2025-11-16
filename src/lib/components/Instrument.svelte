<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		instrumentName,
		imgUrl,
		direction = 'right',
		onCycleLeft,
		onCycleRight
	} = $props<{
		instrumentName: string;
		imgUrl: string;
		direction?: 'left' | 'right';
		onCycleLeft?: () => void;
		onCycleRight?: () => void;
	}>();

	// Calculate slide distance based on direction (reactive)
	const slideDistance = 100;
	const inX = $derived(direction === 'left' ? -slideDistance : slideDistance);
	const outX = $derived(direction === 'left' ? slideDistance : -slideDistance);
</script>

<div class="instrument">
	<button class="nav-button left" onclick={onCycleLeft} disabled={!onCycleLeft}> &lt; </button>

	{#key instrumentName}
		<img
			src={imgUrl}
			alt={instrumentName}
			in:scale={{ duration: 400, start: 0.8, easing: cubicOut }}
			out:scale={{ duration: 300, start: 0.8, easing: cubicOut }}
		/>
	{/key}

	<button class="nav-button right" onclick={onCycleRight} disabled={!onCycleRight}> &gt; </button>

	{#key instrumentName}
		<p
			class="instrument-label"
			in:fly={{ x: inX, duration: 300, delay: 50, easing: cubicOut, opacity: 0 }}
			out:fly={{ x: outX, duration: 100, easing: cubicOut, opacity: 0 }}
		>
			{instrumentName}
		</p>
	{/key}
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
		grid-area: 2 / 1 / 3 / 4;
	}

	.instrument img {
		max-width: 100%;
		max-height: calc(100vh - 120px);
		grid-area: 1 / 2 / 2 / 3;
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
