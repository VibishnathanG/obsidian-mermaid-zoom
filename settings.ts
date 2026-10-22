import type { App } from 'obsidian';
import { PluginSettingTab, Setting } from 'obsidian';
import type MermaidZoomPlugin from './main';
import { t } from './i18n';
import type { ExportDestination } from './export';

export interface MermaidZoomSettings {
	zoomSensitivity: number; // multiplier on wheel/pinch zoom strength, 1 = default
	showInlineZoomButtons: boolean;
	alignment: 'left' | 'center' | 'right';
	exportDestination: ExportDestination; // 'vault' | 'download'
	preserveColors: boolean; // Keep native/Genie diagram colors in fullscreen (default: true)
	// Lazy rendering configuration
	enableLazyLoading: boolean; // Master toggle for lazy rendering (set false for immediate normal render)
	lazyTrigger: 'auto' | 'click'; // 'auto' on scroll into viewport, or 'click' on placeholder
	lazyRootMargin: string; // Viewport distance margin (e.g. '200px')
	lazyShowType: boolean; // Show diagram keyword on placeholder
	lazyRerenderOnThemeChange: boolean; // Re-render visible diagrams on theme change
}

export const DEFAULT_SETTINGS: MermaidZoomSettings = {
	zoomSensitivity: 1,
	showInlineZoomButtons: true,
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
				.setDynamicTooltip()
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
			.setDesc('Defer rendering of off-screen Mermaid diagrams until they enter or approach the viewport. Prevents UI lag when opening notes containing many diagrams. Turn off to render all diagrams immediately.')
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
			cls: 'setting-item-description',
		});
	}
}
