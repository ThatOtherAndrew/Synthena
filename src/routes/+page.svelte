<script lang="ts">
	interface AccelerationData {
		x: number | null;
		y: number | null;
		z: number | null;
	}

	let acceleration = $state<AccelerationData>({ x: null, y: null, z: null });
	let permissionNeeded = $state(false);
	let error = $state<string | null>(null);

	// Check if we need to request permission (iOS 13+)
	$effect(() => {
		if (typeof DeviceMotionEvent !== 'undefined') {
			// @ts-expect-error - requestPermission is iOS-specific
			if (typeof DeviceMotionEvent.requestPermission === 'function') {
				permissionNeeded = true;
			} else {
				// Permission not needed, start listening
				startListening();
			}
		} else {
			error = 'DeviceMotion API not supported';
		}
	});

	async function requestPermission() {
		try {
			// @ts-expect-error - requestPermission is iOS-specific
			const response = await DeviceMotionEvent.requestPermission();
			if (response === 'granted') {
				permissionNeeded = false;
				startListening();
			} else {
				error = 'Permission denied';
			}
		} catch (err) {
			error = `Permission error: ${err}`;
		}
	}

	function startListening() {
		window.addEventListener('devicemotion', handleMotion);
	}

	function handleMotion(event: DeviceMotionEvent) {
		const acc = event.accelerationIncludingGravity;
		if (acc) {
			acceleration = {
				x: acc.x,
				y: acc.y,
				z: acc.z
			};
		}
	}
</script>

<div class="container">
	{#if error}
		<div class="error">{error}</div>
	{:else if permissionNeeded}
		<div class="permission">
			<p>Accelerometer access required</p>
			<button onclick={requestPermission}>Enable Accelerometer</button>
		</div>
	{:else}
		<div class="data">
			<div class="axis">
				<span class="label">X:</span>
				<span class="value">{acceleration.x?.toFixed(2) ?? '---'}</span>
			</div>
			<div class="axis">
				<span class="label">Y:</span>
				<span class="value">{acceleration.y?.toFixed(2) ?? '---'}</span>
			</div>
			<div class="axis">
				<span class="label">Z:</span>
				<span class="value">{acceleration.z?.toFixed(2) ?? '---'}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	.container {
		width: 100vw;
		height: 100vh;
		background-color: #000;
		color: #fff;
		display: flex;
		align-items: centre;
		justify-content: centre;
		font-family: monospace;
		font-size: 1.5rem;
	}

	.data {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		text-align: centre;
	}

	.axis {
		display: flex;
		gap: 1rem;
		justify-content: centre;
		align-items: centre;
	}

	.label {
		font-weight: bold;
		font-size: 2rem;
	}

	.value {
		font-size: 2.5rem;
		font-variant-numeric: tabular-nums;
		min-width: 6ch;
	}

	.permission,
	.error {
		text-align: centre;
		padding: 2rem;
	}

	.permission p {
		margin-bottom: 1.5rem;
		font-size: 1.2rem;
	}

	button {
		background-color: #fff;
		colour: #000;
		border: none;
		padding: 1rem 2rem;
		font-size: 1rem;
		font-family: monospace;
		cursor: pointer;
		border-radius: 0.5rem;
	}

	button:active {
		transform: scale(0.95);
	}

	.error {
		color: #ff6b6b;
	}
</style>
