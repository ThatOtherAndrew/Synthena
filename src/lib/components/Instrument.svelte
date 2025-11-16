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
	<div class="inner">
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
	</div>

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
		justify-items: center;
		/* flex-direction: column;
		row-gap: 20px; */
		grid-template-columns: 1fr;
		grid-template-rows: 1fr min(40px, 8vmin);;
		align-items: center;
		row-gap: 20px;
		width: 90%;
		max-width: 90% !important;
	}

	.instrument .inner {
		display: grid;
		grid-template-columns: 32px auto 32px;
		grid-template-rows: 1fr;
		align-items: center;
		justify-items: center;
		min-width: 100% !important;
		max-width: 100% !important;
		/* margin-bottom: min(40px, 8vmin); */
	}

	.instrument-label {
		font-size: min(40px, 8vmin);
		margin-top: 0 !important;
		margin-bottom: 0 !important;
		grid-area: 2 / 1 / 3 / 2;
		line-height: 0;
		height: 0px;
	}

	.instrument img {
		width: calc(80vw - 64px);
		height: calc(80vh - 120px);
		grid-area: 1 / 2 / 2 / 3;
		object-fit: contain;
	}
	.nav-button {
		font-size: min(32px, 7vw);
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0.5rem;
		transition: opacity 0.3s, background-color 0.2s;
		height: 40%;
		border-radius: 4px;
		background-color: transparent;
	}

	@media(hover: hover) and (pointer: fine) {
		.nav-button:hover {
			background-color: #ffffff7e;
		}
	}

	/* .nav-button:active:not(:disabled) {
		opacity: 0.5;
	} */

	.nav-button:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.left {
		grid-area: 1 / 1 / 2 / 2;
	}
	.right {
		grid-area: 1 / 3 / 2 / 4;
	}
</style>
