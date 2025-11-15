<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	interface AccelerationData {
		x: number | null;
		y: number | null;
		z: number | null;
	}

	let acceleration = $state<AccelerationData>({ x: null, y: null, z: null });
	let permissionNeeded = $state(false);
	let error = $state<string | null>(null);
	let connected = $state(false);

	// Non-reactive variables for WebSocket management
	let ws: WebSocket | null = null;
	let deviceId = '';
	let heartbeatInterval: number | null = null;
	let reconnectTimeout: number | null = null;
	let isCleaningUp = false;

	// Generate or retrieve device ID
	function getDeviceId(): string {
		if (!browser) return '';

		let id = localStorage.getItem('deviceId');
		if (!id) {
			// Get device info
			const ua = navigator.userAgent;
			const platform = navigator.platform;

			// Try to determine device type
			let deviceType = 'desktop';
			if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
				if (/iPad|Tablet/i.test(ua)) {
					deviceType = 'tablet';
				} else if (/iPhone/i.test(ua)) {
					deviceType = 'iphone';
				} else if (/Android/i.test(ua)) {
					deviceType = 'android';
				} else {
					deviceType = 'mobile';
				}
			} else if (/Mac/i.test(platform)) {
				deviceType = 'mac';
			} else if (/Win/i.test(platform)) {
				deviceType = 'windows';
			} else if (/Linux/i.test(platform)) {
				deviceType = 'linux';
			}

			// Generate unique suffix
			const uniqueSuffix = Math.random().toString(36).substring(2, 9);

			id = `${deviceType}-${uniqueSuffix}`;
			localStorage.setItem('deviceId', id);
		}
		return id;
	}

	// Initialize WebSocket connection
	function connectWebSocket() {
		if (!browser || isCleaningUp) return;

		// Clear existing connection if any
		if (ws) {
			ws.close();
			ws = null;
		}

		try {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const wsUrl = `${protocol}//${window.location.host}/ws`;

			ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				connected = true;
				if (ws && deviceId) {
					ws.send(JSON.stringify({ type: 'connect', deviceId }));
					startHeartbeat();
				}
			};

			ws.onclose = () => {
				connected = false;
				if (!isCleaningUp) {
					// Attempt to reconnect after 3 seconds
					reconnectTimeout = window.setTimeout(connectWebSocket, 3000);
				}
			};

			ws.onerror = () => {
				connected = false;
			};
		} catch (err) {
			console.error('WebSocket connection error:', err);
		}
	}

	// Send periodic heartbeats
	function startHeartbeat() {
		if (heartbeatInterval) clearInterval(heartbeatInterval);

		heartbeatInterval = window.setInterval(() => {
			if (ws && ws.readyState === WebSocket.OPEN && deviceId) {
				ws.send(JSON.stringify({ type: 'heartbeat', deviceId }));
			}
		}, 5000);
	}

	// Initialize on mount
	onMount(() => {
		deviceId = getDeviceId();
		connectWebSocket();

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

		// Cleanup function
		return () => {
			isCleaningUp = true;

			if (heartbeatInterval) {
				clearInterval(heartbeatInterval);
				heartbeatInterval = null;
			}

			if (reconnectTimeout) {
				clearTimeout(reconnectTimeout);
				reconnectTimeout = null;
			}

			if (ws) {
				ws.close();
				ws = null;
			}
		};
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
	<div class="status" class:connected>
		{connected ? '●' : '○'}
	</div>

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
		color: #000;
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

	.status {
		position: absolute;
		top: 1rem;
		right: 1rem;
		font-size: 2rem;
		color: #666;
		transition: color 0.3s;
	}

	.status.connected {
		color: #4ade80;
	}
</style>
