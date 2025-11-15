import type { WebSocket } from 'ws';

export interface AccelerometerData {
	x: number | null;
	y: number | null;
	z: number | null;
}

export interface Device {
	id: string;
	connectedAt: number;
	lastSeen: number;
	accelerometer?: AccelerometerData;
	instrument?: string;
}

interface DeviceConnection extends Device {
	ws?: WebSocket;
}

class ConnectionManager {
	private devices = new Map<string, DeviceConnection>();
	private dashboards = new Set<WebSocket>();
	private screens = new Set<WebSocket>();
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private readonly HEARTBEAT_TIMEOUT = 15000; // 15 seconds

	constructor() {
		// Check for stale connections every 5 seconds
		this.heartbeatInterval = setInterval(() => {
			this.checkStaleConnections();
		}, 5000);
	}

	registerDevice(deviceId: string, ws?: WebSocket): void {
		const now = Date.now();
		const existing = this.devices.get(deviceId);

		if (existing) {
			existing.lastSeen = now;
			if (ws) existing.ws = ws;
		} else {
			this.devices.set(deviceId, {
				id: deviceId,
				connectedAt: now,
				lastSeen: now,
				ws
			});
		}

		this.broadcastToDevices();
	}

	updateHeartbeat(deviceId: string): void {
		const device = this.devices.get(deviceId);
		if (device) {
			device.lastSeen = Date.now();
			this.broadcastToDevices();
			this.broadcastHeartbeatEvent(deviceId);
		}
	}

	updateAccelerometer(deviceId: string, data: AccelerometerData): void {
		const device = this.devices.get(deviceId);
		if (device) {
			device.accelerometer = data;
			device.lastSeen = Date.now();
			this.broadcastToDevices();
		}
	}

	updateInstrument(deviceId: string, instrument: string): void {
		const device = this.devices.get(deviceId);
		if (device) {
			device.instrument = instrument;
			device.lastSeen = Date.now();
			console.log(`Device ${deviceId} selected instrument: ${instrument}`);
			this.broadcastToDevices();
		}
	}

	removeDevice(deviceId: string): void {
		this.devices.delete(deviceId);
		this.broadcastToDevices();
	}

	registerDashboard(ws: WebSocket): void {
		this.dashboards.add(ws);
		// Send current state immediately
		this.sendDeviceList(ws);
	}

	unregisterDashboard(ws: WebSocket): void {
		this.dashboards.delete(ws);
	}

	registerScreen(ws: WebSocket): void {
		this.screens.add(ws);
	}

	unregisterScreen(ws: WebSocket): void {
		this.screens.delete(ws);
	}

	private checkStaleConnections(): void {
		const now = Date.now();
		let hasChanges = false;

		for (const [deviceId, device] of this.devices.entries()) {
			if (now - device.lastSeen > this.HEARTBEAT_TIMEOUT) {
				this.devices.delete(deviceId);
				hasChanges = true;
			}
		}

		if (hasChanges) {
			this.broadcastToDevices();
		}
	}

	private broadcastToDevices(): void {
		for (const dashboard of this.dashboards) {
			this.sendDeviceList(dashboard);
		}
	}

	private sendDeviceList(ws: WebSocket): void {
		const devices: Device[] = Array.from(this.devices.values()).map(({ id, connectedAt, lastSeen, accelerometer, instrument }) => ({
			id,
			connectedAt,
			lastSeen,
			accelerometer,
			instrument
		}));

		try {
			ws.send(
				JSON.stringify({
					type: 'devices',
					devices
				})
			);
		} catch (error) {
			console.error('Error sending device list:', error);
		}
	}

	private broadcastHeartbeatEvent(deviceId: string): void {
		for (const screen of this.screens) {
			try {
				screen.send(
					JSON.stringify({
						type: 'heartbeat_event',
						deviceId
					})
				);
			} catch (error) {
				console.error('Error sending heartbeat event:', error);
			}
		}
	}

	getDeviceCount(): number {
		return this.devices.size;
	}

	cleanup(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}
	}
}

export const connectionManager = new ConnectionManager();
