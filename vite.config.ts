import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { webSocketPlugin } from './src/lib/server/websocket-plugin';

export default defineConfig({
	plugins: [sveltekit(), devtoolsJson(), webSocketPlugin()],

	server: {
		allowedHosts: ['tunnel.thatother.dev']
	}
});
