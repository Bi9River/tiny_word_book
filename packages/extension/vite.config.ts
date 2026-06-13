import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [svelte()],
	publicDir: 'public',
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		target: 'esnext',
		minify: false,
		sourcemap: true,
		rollupOptions: {
			input: {
				popup: resolve(__dirname, 'popup.html'),
				options: resolve(__dirname, 'options.html'),
				background: resolve(__dirname, 'src/background.ts')
			},
			output: {
				entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
				chunkFileNames: 'assets/chunk-[hash].js',
				assetFileNames: 'assets/[name]-[hash].[ext]'
			}
		}
	}
});
