import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

const isDev = process.argv.includes('dev');
const base = isDev ? '' : '/tiny_word_book';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			injectRegister: false,
			manifest: false,
			kit: {
				base
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}']
			},
			devOptions: {
				enabled: false
			}
		})
	]
});
