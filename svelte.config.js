import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			// 本地开发用根路径，打包发布去 GitHub Pages 时带上你的仓库名
			base: process.argv.includes('dev') ? '' : '/tiny_word_book'
		}
	}
};

export default config;
