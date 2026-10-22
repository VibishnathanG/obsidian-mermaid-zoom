import type { App, SettingDefinitionItem } from 'obsidian';
import { PluginSettingTab, Setting } from 'obsidian';
import type MermaidZoomPlugin from './main';
import { t } from './i18n';
import type { ExportDestination } from './export';

export interface MermaidZoomSettings {
	zoomSensitivity: number; // multiplier on wheel/pinch zoom strength, 1 = default
	showInlineZoomButtons: boolean;
	showContainerBorder: boolean;
	alignment: 'left' | 'center' | 'right';
	exportDestination: ExportDestination; // 'vault' | 'download'
	preserveColors: boolean; // Keep native/Genie diagram colors in fullscreen (default: true)
	// Lazy rendering configuration
	enableLazyLoading: boolean; // Master toggle for lazy rendering
	lazyTrigger: 'auto' | 'click'; // 'auto' on scroll into viewport, or 'click' on placeholder
	lazyRootMargin: string; // Viewport distance margin (e.g. '200px')
	lazyShowType: boolean; // Show diagram keyword on placeholder
	lazyRerenderOnThemeChange: boolean; // Re-render visible diagrams on theme change
}

export const DEFAULT_SETTINGS: MermaidZoomSettings = {
	zoomSensitivity: 1,
	showInlineZoomButtons: true,
	showContainerBorder: false,
	alignment: 'center',
	exportDestination: 'vault',
	preserveColors: true,
	enableLazyLoading: true,
	lazyTrigger: 'auto',
	lazyRootMargin: '200px',
	lazyShowType: true,
	lazyRerenderOnThemeChange: true,
};

export class MermaidZoomSettingTab extends PluginSettingTab {
	plugin: MermaidZoomPlugin;

	constructor(app: App, plugin: MermaidZoomPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// Declarative settings API (Obsidian 1.13.0+). When this returns a
	// non-empty array, Obsidian renders the tab from these definitions and
	// indexes them for settings search; display() is used as the fallback for
	// older Obsidian versions.
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: t('setting.zoomSensitivity.name'),
				desc: t('setting.zoomSensitivity.desc'),
				control: {
					type: 'slider',
					key: 'zoomSensitivity',
					min: 0.2,
					max: 3,
					step: 0.1,
					defaultValue: 1,
					displayFormat: (value) => `${value}x`,
				},
			},
			{
				name: t('setting.inlineZoomButtons.name'),
				desc: t('setting.inlineZoomButtons.desc'),
				control: {
					type: 'toggle',
					key: 'showInlineZoomButtons',
					defaultValue: true,
				},
			},
			{
				name: t('setting.containerBorder.name'),
				desc: t('setting.containerBorder.desc'),
				control: {
					type: 'toggle',
					key: 'showContainerBorder',
					defaultValue: false,
				},
			},
			{
				name: t('setting.alignment.name'),
				desc: t('setting.alignment.desc'),
				control: {
					type: 'dropdown',
					key: 'alignment',
					options: {
						left: t('setting.alignment.option.left'),
						center: t('setting.alignment.option.center'),
						right: t('setting.alignment.option.right'),
					},
					defaultValue: 'center',
				},
			},
			{
				name: t('setting.preserveColors.name'),
				desc: t('setting.preserveColors.desc'),
				control: {
					type: 'toggle',
					key: 'preserveColors',
					defaultValue: true,
				},
			},
			{
				name: t('setting.exportDestination.name'),
				desc: t('setting.exportDestination.desc'),
				control: {
					type: 'dropdown',
					key: 'exportDestination',
					options: {
						vault: t('setting.exportDestination.option.vault'),
						download: t('setting.exportDestination.option.download'),
					},
					defaultValue: 'vault',
				},
			},
			{
				name: 'Enable lazy rendering',
				desc: 'Defer rendering of off-screen Mermaid diagrams until they approach or enter the viewport. Opens notes with many diagrams smoothly without freezing.',
				control: {
					type: 'toggle',
					key: 'enableLazyLoading',
					defaultValue: true,
				},
			},
			{
				name: 'Render trigger',
				desc: 'Auto: render when scrolling near viewport. Manual: click placeholder to render.',
				control: {
					type: 'dropdown',
					key: 'lazyTrigger',
					options: {
						auto: 'Auto (near viewport)',
						click: 'Manual (click to render)',
					},
					defaultValue: 'auto',
				},
			},
			{
				name: 'Pre-render margin',
				desc: 'Distance in pixels from the viewport to start rendering diagrams. E.g. 200px.',
				control: {
					type: 'text',
					key: 'lazyRootMargin',
					defaultValue: '200px',
				},
			},
			{
				name: 'Show diagram type on placeholder',
				desc: 'Display diagram keyword badge (e.g. flowchart, sequenceDiagram) on unrendered placeholders.',
				control: {
					type: 'toggle',
					key: 'lazyShowType',
					defaultValue: true,
				},
			},
			{
				name: 'Re-render on theme change',
				desc: 'Automatically re-render visible diagrams when switching between light and dark themes.',
				control: {
					type: 'toggle',
					key: 'lazyRerenderOnThemeChange',
					defaultValue: true,
				},
			},
		];
	}

	// Persist declarative-control writes through the plugin's own saver so
	// data.json stays in sync. (The base reads from this.plugin.settings.)
	async setControlValue(key: string, value: unknown): Promise<void> {
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		await this.plugin.saveSettings();
		if (key === 'alignment' || key === 'showContainerBorder' || key === 'showInlineZoomButtons') {
			// Appearance classes are baked onto each block at decoration time;
			// re-sync them so open notes update immediately.
			this.plugin.decorateAllMermaidBlocks();
		}
		if (key.startsWith('lazy') || key === 'enableLazyLoading') {
			this.plugin.lazyManager.updateSettings();
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const headerDiv = containerEl.createDiv({ cls: 'mermaid-zoom-header-card' });
		headerDiv.style.padding = '12px 16px';
		headerDiv.style.marginBottom = '18px';
		headerDiv.style.border = '1px solid var(--background-modifier-border)';
		headerDiv.style.borderRadius = '8px';
		headerDiv.style.backgroundColor = 'var(--background-secondary)';

		const title = headerDiv.createEl('h3', { text: 'Mermaid Zoom & Lazy Render' });
		title.style.marginTop = '0';
		title.style.marginBottom = '6px';

		const info = headerDiv.createEl('p', { cls: 'setting-item-description' });
		info.style.margin = '0';
		info.appendText('Enhanced & maintained by ');
		const authorLink = info.createEl('a', { text: 'Vibish', href: 'https://github.com/VibishnathanG' });
		authorLink.style.color = 'var(--text-accent)';
		info.appendText(' • ');
		const repoLink = info.createEl('a', { text: 'GitHub Repository & Documentation', href: 'https://github.com/VibishnathanG/obsidian-mermaid-zoom' });
		repoLink.style.color = 'var(--text-accent)';

		new Setting(containerEl)
			.setName('Zoom & Appearance')
			.setHeading();

		new Setting(containerEl)
			.setName(t('setting.zoomSensitivity.name'))
			.setDesc(t('setting.zoomSensitivity.desc'))
			.addSlider(slider => slider
				.setLimits(0.2, 3, 0.1)
				.setValue(this.plugin.settings.zoomSensitivity)
				.onChange(async (value) => {
					this.plugin.settings.zoomSensitivity = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t('setting.inlineZoomButtons.name'))
			.setDesc(t('setting.inlineZoomButtons.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showInlineZoomButtons)
				.onChange(async (value) => {
					this.plugin.settings.showInlineZoomButtons = value;
					await this.plugin.saveSettings();
					this.plugin.decorateAllMermaidBlocks();
				}));

		new Setting(containerEl)
			.setName(t('setting.containerBorder.name'))
			.setDesc(t('setting.containerBorder.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showContainerBorder)
				.onChange(async (value) => {
					this.plugin.settings.showContainerBorder = value;
					await this.plugin.saveSettings();
					this.plugin.decorateAllMermaidBlocks();
				}));

		new Setting(containerEl)
			.setName(t('setting.alignment.name'))
			.setDesc(t('setting.alignment.desc'))
			.addDropdown(dropdown => dropdown
				.addOption('left', t('setting.alignment.option.left'))
				.addOption('center', t('setting.alignment.option.center'))
				.addOption('right', t('setting.alignment.option.right'))
				.setValue(this.plugin.settings.alignment)
				.onChange(async (value) => {
					this.plugin.settings.alignment = value as 'left' | 'center' | 'right';
					await this.plugin.saveSettings();
					this.plugin.decorateAllMermaidBlocks();
				}));

		new Setting(containerEl)
			.setName(t('setting.preserveColors.name'))
			.setDesc(t('setting.preserveColors.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.preserveColors)
				.onChange(async (value) => {
					this.plugin.settings.preserveColors = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t('setting.exportDestination.name'))
			.setDesc(t('setting.exportDestination.desc'))
			.addDropdown(dropdown => dropdown
				.addOption('vault', t('setting.exportDestination.option.vault'))
				.addOption('download', t('setting.exportDestination.option.download'))
				.setValue(this.plugin.settings.exportDestination)
				.onChange(async (value) => {
					this.plugin.settings.exportDestination = value as ExportDestination;
					await this.plugin.saveSettings();
				}));

		// ==========================================
		// Lazy Rendering Section
		// ==========================================
		new Setting(containerEl)
			.setName('Viewport Lazy Rendering')
			.setHeading();

		new Setting(containerEl)
			.setName('Enable lazy rendering')
			.setDesc('Defer rendering of off-screen Mermaid diagrams until they enter or approach the viewport. Prevents UI lag when opening notes containing many diagrams.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableLazyLoading)
				.onChange(async (value) => {
					this.plugin.settings.enableLazyLoading = value;
					await this.plugin.saveSettings();
					this.plugin.lazyManager.updateSettings();
					this.display(); // Reveal or hide child lazy options immediately
				}));

		if (this.plugin.settings.enableLazyLoading) {
			new Setting(containerEl)
				.setName('Render trigger mode')
				.setDesc('Auto: render automatically when diagram scrolls near viewport. Manual: click placeholder to render.')
				.addDropdown(dropdown => dropdown
					.addOption('auto', 'Auto (on scroll near viewport)')
					.addOption('click', 'Manual (click placeholder to render)')
					.setValue(this.plugin.settings.lazyTrigger)
					.onChange(async (value) => {
						this.plugin.settings.lazyTrigger = value as 'auto' | 'click';
						await this.plugin.saveSettings();
						this.plugin.lazyManager.updateSettings();
					}));

			new Setting(containerEl)
				.setName('Pre-render viewport margin')
				.setDesc('Distance in pixels from viewport before diagram starts rendering. Higher margin renders earlier before scrolling into view (e.g. 200px).')
				.addText(text => text
					.setPlaceholder('200px')
					.setValue(this.plugin.settings.lazyRootMargin)
					.onChange(async (value) => {
						this.plugin.settings.lazyRootMargin = value.trim() || '200px';
						await this.plugin.saveSettings();
						this.plugin.lazyManager.updateSettings();
					}));

			new Setting(containerEl)
				.setName('Show diagram type badge')
				.setDesc('Display diagram type label on placeholder (e.g. flowchart, sequenceDiagram, block).')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.lazyShowType)
					.onChange(async (value) => {
						this.plugin.settings.lazyShowType = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Re-render on theme switch')
				.setDesc('Automatically re-render visible diagrams when switching between light and dark themes.')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.lazyRerenderOnThemeChange)
					.onChange(async (value) => {
						this.plugin.settings.lazyRerenderOnThemeChange = value;
						await this.plugin.saveSettings();
						this.plugin.lazyManager.updateSettings();
					}));
		}

		containerEl.createEl('p', {
			text: t('settings.note'),
			cls: 'setting-item-description'
		});
	}
}
