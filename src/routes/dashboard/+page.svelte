<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	interface Device {
		id: string;
		connectedAt: number;
		lastSeen: number;
	}

	let devices = $state<Device[]>([]);
	let connected = $state(false);

	// Non-reactive variables for WebSocket management
	let ws: WebSocket | null = null;
	let reconnectTimeout: number | null = null;
	let updateInterval: number | null = null;
	let isCleaningUp = false;

	// Connect to WebSocket as dashboard client
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
				if (ws) {
					ws.send(JSON.stringify({ type: 'dashboard' }));
				}
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);
					if (message.type === 'devices') {
						devices = message.devices;
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
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

	// Initialize connection
	onMount(() => {
		connectWebSocket();

		// Update display every second for live durations
		updateInterval = window.setInterval(() => {
			// Force re-render by creating new array reference
			devices = [...devices];
		}, 1000);

		return () => {
			isCleaningUp = true;

			if (reconnectTimeout) {
				clearTimeout(reconnectTimeout);
				reconnectTimeout = null;
			}

			if (updateInterval) {
				clearInterval(updateInterval);
				updateInterval = null;
			}

			if (ws) {
				ws.close();
				ws = null;
			}
		};
	});

	// Format time helpers
	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString();
	}

	function getConnectionDuration(connectedAt: number): string {
		const duration = Date.now() - connectedAt;
		const seconds = Math.floor(duration / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) return `${hours}h ${minutes % 60}m`;
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
		return `${seconds}s`;
	}

	function getTimeSinceLastSeen(lastSeen: number): string {
		const duration = Date.now() - lastSeen;
		const seconds = Math.floor(duration / 1000);

		if (seconds < 1) return 'just now';
		if (seconds < 60) return `${seconds}s ago`;
		return `${Math.floor(seconds / 60)}m ago`;
	}
</script>

<div class="container">
	<header>
		<h1>Synthena Dashboard</h1>
		<div class="status" class:connected>
			{connected ? '● Connected' : '○ Disconnected'}
		</div>
	</header>

	<div class="content">
		<div class="stats">
			<div class="stat">
				<div class="stat-value">{devices.length}</div>
				<div class="stat-label">Connected Devices</div>
			</div>
		</div>

		{#if devices.length === 0}
			<div class="empty">
				<p>No devices connected</p>
				<p class="hint">Open the accelerometer page on a device to see it appear here</p>
			</div>
		{:else}
			<div class="devices">
				{#each devices as device (device.id)}
					<div class="device">
						<div class="device-header">
							<div class="device-status">●</div>
							<div class="device-id">{device.id}</div>
						</div>
						<div class="device-info">
							<div class="info-item">
								<span class="info-label">Connected:</span>
								<span class="info-value">{formatTime(device.connectedAt)}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Duration:</span>
								<span class="info-value">{getConnectionDuration(device.connectedAt)}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Last seen:</span>
								<span class="info-value">{getTimeSinceLastSeen(device.lastSeen)}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #0a0a0a;
		color: #fff;
		font-family: monospace;
	}

	.container {
		min-height: 100vh;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: centre;
		margin-bottom: 3rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #333;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: bold;
	}

	.status {
		font-size: 1rem;
		color: #666;
		transition: color 0.3s;
	}

	.status.connected {
		color: #4ade80;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.stats {
		display: flex;
		gap: 2rem;
	}

	.stat {
		background: #1a1a1a;
		padding: 2rem;
		border-radius: 0.5rem;
		border: 1px solid #333;
		min-width: 200px;
	}

	.stat-value {
		font-size: 3rem;
		font-weight: bold;
		color: #4ade80;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 1rem;
		color: #999;
	}

	.empty {
		text-align: centre;
		padding: 4rem 2rem;
		color: #666;
	}

	.empty p {
		margin: 0.5rem 0;
	}

	.hint {
		font-size: 0.9rem;
		color: #555;
	}

	.devices {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.device {
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 0.5rem;
		padding: 1.5rem;
		transition: border-color 0.3s;
	}

	.device:hover {
		border-color: #4ade80;
	}

	.device-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #333;
	}

	.device-id {
		font-size: 1.1rem;
		font-weight: bold;
		color: #4ade80;
		word-break: break-all;
	}

	.device-status {
		color: #4ade80;
		font-size: 1.5rem;
	}

	.device-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
	}

	.info-label {
		color: #999;
	}

	.info-value {
		color: #fff;
		font-weight: bold;
	}

	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}

		header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.devices {
			grid-template-columns: 1fr;
		}
	}
</style>
