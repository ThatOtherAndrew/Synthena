import type { Plugin } from 'vite';
import type { WebSocketServer } from 'ws';
import { setupWebSocketServer } from './websocket-server';

/**
 * Vite plugin that adds WebSocket support during development.
 * In production, use server.js instead.
 */
export function webSocketPlugin(): Plugin {
	let wss: WebSocketServer | null = null;

	return {
		name: 'websocket-plugin',
		configureServer(server) {
			if (!server.httpServer) return;

			// Use shared WebSocket setup function
			wss = setupWebSocketServer(server.httpServer);
		},
		closeBundle() {
			if (wss) {
				wss.close();
			}
		}
	};
}
