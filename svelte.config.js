// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},

	onwarn(warning, handler) {
		const suppress = new Set([
			'css_unused_selector',
			'state_referenced_locally',
			'a11y_click_events_have_key_events',
			'a11y_no_static_element_interactions',
			'a11y_interactive_supports_focus',
			'a11y_autofocus',
			'a11y_label_has_associated_control',
			'a11y_invalid_attribute',
			'svelte_component_deprecated',
			'non_reactive_update'
		]);

		if (suppress.has(warning.code)) return;

		handler(warning);
	},

	kit: {
		adapter: adapter(),

		alias: {
			$jobs: 'src/jobs',
			$prisma: 'node_modules/.prisma/client/index.js',

			$components: 'src/lib/components',
			$ui: 'src/lib/components/ui',
			$utils: 'src/lib/utils',
			$hooks: 'src/lib/hooks',
			$server: 'src/lib/server',
			$stores: 'src/lib/stores',
			$types: 'src/lib/types',
			$schemas: 'src/lib/schemas',
			$actions: 'src/lib/actions',
			$constants: 'src/lib/constants',
			$config: 'src/lib/config',
			$services: 'src/lib/services',
			$db: 'src/lib/db',
			$auth: 'src/lib/auth'
		},

		csp: {
  directives: {
    'default-src': ['self'],
    'script-src': ['self', 'cdn.jsdelivr.net', 'unsafe-inline'],
    'worker-src': ['self', 'blob:'], // ← Add this
    'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
    'font-src': ['self', 'https://fonts.gstatic.com'],
    'img-src': ['self', 'data:', 'blob:'],
    'media-src': ['self', 'blob:'],
    'connect-src': ['self', 'ws://localhost:2605', 'wss://localhost:2605', 'https://fonts.gstatic.com'],
    'frame-src': ['none'],
    'object-src': ['none']
  }
}
	}
};

export default config;