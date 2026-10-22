import { Notice, setIcon } from 'obsidian';
import type MermaidZoomPlugin from './main';

/**
 * Detects diagram type from Mermaid source text (e.g. flowchart, sequenceDiagram, block-beta, etc.)
 */
export function detectDiagramType(source: string): string {
	const lines = String(source || '').split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('---')) continue;
		const token = trimmed.split(/[\s(;{]/)[0];
		if (token) return token;
	}
	return 'mermaid';
}

/**
 * Sanitizes rendered SVG markup to protect against script execution while preserving
 * all diagram styles, paths, markers, and geometry.
 */
export function sanitizeSvg(svg: string): string {
	if (typeof svg !== 'string') return '';
	return svg
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
		.replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
		.replace(/\son\w+\s*=\s*'[^']*'/gi, '')
		.replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
		.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
}

let renderCounter = 0;
function nextRenderId(): string {
	renderCounter = (renderCounter + 1) % 1e9;
	return 'mermaid-lazy-' + Date.now().toString(36) + '-' + renderCounter;
}

function encodeSource(source: string): string {
	try {
		return btoa(unescape(encodeURIComponent(source)));
	} catch {
		return '';
	}
}

function decodeSource(b64: string): string {
	try {
		return decodeURIComponent(escape(atob(b64)));
	} catch {
		return '';
	}
}

export class LazyRenderManager {
	plugin: MermaidZoomPlugin;
	private originalRender: any = null;
	private pendingRenders: Map<string, { source: string; timestamp: number }> = new Map();
	private activeObservers: Set<IntersectionObserver> = new Set();
	private domObserver?: MutationObserver;
	private themeObserver?: MutationObserver;

	constructor(plugin: MermaidZoomPlugin) {
		this.plugin = plugin;
	}

	setup(): void {
		this.patchMermaid();
		this.startDomObserver();
		if (this.plugin.settings.lazyRerenderOnThemeChange) {
			this.startThemeObserver();
		}
	}

	teardown(): void {
		this.unpatchMermaid();
		if (this.domObserver) {
			this.domObserver.disconnect();
			this.domObserver = undefined;
		}
		if (this.themeObserver) {
			this.themeObserver.disconnect();
			this.themeObserver = undefined;
		}
		for (const observer of Array.from(this.activeObservers)) {
			try {
				observer.disconnect();
			} catch {}
		}
		this.activeObservers.clear();
		this.pendingRenders.clear();
	}

	private getMermaidInstance(): any {
		const w = typeof window !== 'undefined' ? window : globalThis;
		return (w as any)?.mermaid ?? null;
	}

	patchMermaid(): void {
		const mermaid = this.getMermaidInstance();
		if (!mermaid || typeof mermaid.render !== 'function') {
			// In case Obsidian initializes mermaid asynchronously, retry shortly
			window.setTimeout(() => this.patchMermaid(), 800);
			return;
		}

		if (this.originalRender) return; // Already patched

		this.originalRender = mermaid.render.bind(mermaid);
		const self = this;

		mermaid.render = function lazyInterceptRender(id: string, text: string, ...args: any[]) {
			if (!self.plugin.settings.enableLazyLoading) {
				// Lazy rendering disabled: pass directly to native renderer
				return self.originalRender(id, text, ...args);
			}

			// Store source text for deferred execution
			self.pendingRenders.set(id, { source: text, timestamp: Date.now() });

			// Return minimal placeholder SVG markup
			const placeholderSvg = `<svg class="mermaid-lazy-marker" data-lazy-id="${id}" xmlns="http://www.w3.org/2000/svg" style="min-height:64px;width:100%;display:block"></svg>`;
			return Promise.resolve({ svg: placeholderSvg, bindFunctions: () => {} });
		};
	}

	unpatchMermaid(): void {
		const mermaid = this.getMermaidInstance();
		if (this.originalRender && mermaid) {
			mermaid.render = this.originalRender;
			this.originalRender = null;
		}
	}

	startDomObserver(): void {
		if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;

		this.processExistingPlaceholders();

		this.domObserver = new MutationObserver((mutations) => {
			for (const mutation of Array.from(mutations)) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (!(node instanceof HTMLElement)) continue;

					if (node.classList?.contains('mermaid-lazy-marker')) {
						this.handlePlaceholder(node as unknown as SVGElement);
					}

					const markers = node.querySelectorAll<SVGElement>('.mermaid-lazy-marker');
					for (const marker of Array.from(markers)) {
						this.handlePlaceholder(marker);
					}
				}
			}
		});

		this.domObserver.observe(document.body, { childList: true, subtree: true });
	}

	processExistingPlaceholders(): void {
		if (typeof document === 'undefined') return;
		const markers = document.querySelectorAll<SVGElement>('.mermaid-lazy-marker');
		for (const marker of Array.from(markers)) {
			this.handlePlaceholder(marker);
		}
	}

	handlePlaceholder(markerSvg: SVGElement): void {
		const id = markerSvg.getAttribute('data-lazy-id');
		if (!id) return;

		const pending = this.pendingRenders.get(id);
		if (!pending) return;

		const source = pending.source;
		const placeholder = document.createElement('div');
		placeholder.className = 'mermaid-lazy-placeholder';
		placeholder.setAttribute('data-lazy-id', id);

		const type = detectDiagramType(source);
		if (this.plugin.settings.lazyShowType) {
			const badge = document.createElement('div');
			badge.className = 'mermaid-lazy-badge';
			badge.textContent = `Mermaid • ${type}`;
			placeholder.appendChild(badge);
		}

		const button = document.createElement('button');
		button.className = 'mermaid-lazy-button';
		button.textContent = this.plugin.settings.lazyTrigger === 'click'
			? 'Click to render diagram'
			: 'Scroll to render diagram';
		button.addEventListener('click', (ev) => {
			ev.stopPropagation();
			this.doRender(placeholder, id, source);
		});
		placeholder.appendChild(button);

		const parent = markerSvg.parentNode;
		if (parent) {
			parent.replaceChild(placeholder, markerSvg);
		}

		if (this.plugin.settings.lazyTrigger === 'auto') {
			const margin = this.plugin.settings.lazyRootMargin || '200px';
			const observer = new IntersectionObserver((entries) => {
				for (const entry of Array.from(entries)) {
					if (entry.isIntersecting) {
						this.doRender(placeholder, id, source);
						observer.disconnect();
						this.activeObservers.delete(observer);
						break;
					}
				}
			}, { rootMargin: margin, threshold: 0 });

			observer.observe(placeholder);
			this.activeObservers.add(observer);
		}
	}

	async doRender(container: HTMLElement, id: string, source: string): Promise<void> {
		if (container.classList.contains('mermaid-lazy-rendered')) return;
		if (!this.originalRender) {
			this.patchMermaid();
			if (!this.originalRender) return;
		}

		container.classList.add('mermaid-lazy-rendered', 'mermaid-lazy-rendering');
		container.innerHTML = '<div class="mermaid-lazy-loading">Rendering diagram…</div>';

		try {
			const renderId = nextRenderId();
			const result = await this.originalRender(renderId, source);
			const rawSvg = typeof result === 'string' ? result : result?.svg;

			container.classList.remove('mermaid-lazy-rendering');
			container.innerHTML = sanitizeSvg(rawSvg || '');

			if (result && typeof result.bindFunctions === 'function') {
				result.bindFunctions(container);
			}

			// Store encoded source for theme-switch re-renders
			container.setAttribute('data-lazy-source', encodeSource(source));
			this.pendingRenders.delete(id);

			// Trigger inline zoom controls and click handlers on the newly rendered block
			const hostMermaid = container.closest('.mermaid') ?? container;
			this.plugin.decorateAllMermaidBlocks();
		} catch (err) {
			console.error('[Mermaid Zoom Lazy Render] Error rendering diagram:', err);
			container.classList.remove('mermaid-lazy-rendering');
			container.classList.add('mermaid-lazy-error');
			container.innerHTML = '<div class="mermaid-lazy-error-msg">Render failed. Click to retry.</div>';
			container.onclick = () => {
				container.classList.remove('mermaid-lazy-rendered', 'mermaid-lazy-error');
				this.doRender(container, id, source);
			};
		}
	}

	startThemeObserver(): void {
		if (typeof document === 'undefined' || !document.body) return;
		if (typeof MutationObserver === 'undefined') return;
		if (this.themeObserver) return;

		let lastTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
		this.themeObserver = new MutationObserver(() => {
			const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
			if (currentTheme !== lastTheme) {
				lastTheme = currentTheme;
				this.rerenderAllVisible();
			}
		});

		this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
	}

	rerenderAllVisible(): void {
		if (typeof document === 'undefined') return;
		const renderedContainers = document.querySelectorAll<HTMLElement>('.mermaid-lazy-rendered[data-lazy-source]');
		for (const container of Array.from(renderedContainers)) {
			const b64 = container.getAttribute('data-lazy-source');
			if (!b64) continue;
			const source = decodeSource(b64);
			if (source) {
				const id = container.getAttribute('data-lazy-id') || 'theme-refresh';
				this.doRender(container, id, source);
			}
		}
	}

	renderAllInActiveNote(): number {
		if (typeof document === 'undefined') return 0;
		const placeholders = document.querySelectorAll<HTMLElement>('.mermaid-lazy-placeholder');
		if (placeholders.length === 0) {
			new Notice('No unrendered diagrams in active note', 2500);
			return 0;
		}

		let renderedCount = 0;
		for (const placeholder of Array.from(placeholders)) {
			if (!placeholder.classList.contains('mermaid-lazy-rendered')) {
				const id = placeholder.getAttribute('data-lazy-id') || '';
				const pending = this.pendingRenders.get(id);
				if (pending) {
					this.doRender(placeholder, id, pending.source);
					renderedCount++;
				} else {
					const btn = placeholder.querySelector<HTMLButtonElement>('.mermaid-lazy-button');
					if (btn) {
						btn.click();
						renderedCount++;
					}
				}
			}
		}

		if (renderedCount > 0) {
			new Notice(`Rendered ${renderedCount} diagrams in active note`, 2500);
		}
		return renderedCount;
	}

	renderVisibleInActiveNote(): number {
		if (typeof document === 'undefined') return 0;
		const placeholders = document.querySelectorAll<HTMLElement>('.mermaid-lazy-placeholder');
		const viewportHeight = window.innerHeight;
		let count = 0;

		for (const placeholder of Array.from(placeholders)) {
			const rect = placeholder.getBoundingClientRect();
			if (rect.bottom >= 0 && rect.top <= viewportHeight && !placeholder.classList.contains('mermaid-lazy-rendered')) {
				const id = placeholder.getAttribute('data-lazy-id') || '';
				const pending = this.pendingRenders.get(id);
				if (pending) {
					this.doRender(placeholder, id, pending.source);
					count++;
				}
			}
		}

		if (count > 0) {
			new Notice(`Rendered ${count} visible diagrams in viewport`, 2500);
		} else {
			new Notice('No unrendered diagrams in visible viewport', 2500);
		}
		return count;
	}

	updateSettings(): void {
		if (!this.plugin.settings.enableLazyLoading) {
			// Unpatch and render any pending placeholders immediately
			this.renderAllInActiveNote();
		} else {
			this.patchMermaid();
		}

		if (this.plugin.settings.lazyRerenderOnThemeChange) {
			this.startThemeObserver();
		} else if (this.themeObserver) {
			this.themeObserver.disconnect();
			this.themeObserver = undefined;
		}
	}
}
