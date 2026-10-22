import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'obsidian') {
    return {
      PluginSettingTab: class {},
      Setting: class {
        setName() { return this; }
        setDesc() { return this; }
        addToggle(fn: (t: unknown) => unknown) { fn({ setValue() { return this; }, onChange() { return this; } }); return this; }
        addSlider(fn: (s: unknown) => unknown) { fn({ setLimits() { return this; }, setValue() { return this; }, onChange() { return this; } }); return this; }
        addDropdown(fn: (d: unknown) => unknown) { fn({ addOption() { return this; }, setValue() { return this; }, onChange() { return this; } }); return this; }
      },
      Platform: { isMobile: false },
      Notice: class {},
      setIcon: () => {},
      getLanguage: () => 'en',
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { DEFAULT_SETTINGS } = require('../settings');
Module._load = originalLoad;

test('Mermaid Zoom: DEFAULT_SETTINGS preserves normal rendering colors by default', () => {
  assert.equal(DEFAULT_SETTINGS.preserveColors, true);
  assert.equal(DEFAULT_SETTINGS.zoomSensitivity, 1);
  assert.equal(DEFAULT_SETTINGS.showInlineZoomButtons, true);
});

test('Mermaid Zoom styles: dark mode does not force invert(1) hue-rotate on normal modal SVG', () => {
  const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf-8');

  // Verify that the destructive unconditional invert filter is removed
  assert.ok(
    !css.includes('.theme-dark .mermaid-zoom-modal-wrapper svg {\n\tfilter: invert(1) hue-rotate(180deg);'),
    'Should not have unconditional dark mode invert filter on modal SVG'
  );

  // Verify that blanket vector-effect on svg * is removed
  assert.ok(
    !css.includes('.mermaid-zoom-modal-wrapper svg * {\n\tvector-effect: non-scaling-stroke;'),
    'Should not have blanket vector-effect on all elements inside modal SVG'
  );

  // Verify that connector line vector-effect is selectively scoped
  assert.ok(
    css.includes('.mermaid-zoom-modal-wrapper svg :is(.flowchart-link, path.path, path.transition)'),
    'Should selectively apply non-scaling-stroke to connector paths only'
  );

  // Verify Mermaid Genie styling integration exists in styles.css
  assert.ok(
    css.includes('.mermaid svg.mfe-enhanced'),
    'Should include Mermaid Genie color and shape definitions'
  );
  assert.ok(
    css.includes('--mpe-highlight'),
    'Should support --mpe-highlight and theme variables'
  );
});

test('Mermaid Zoom modal: inherits .mermaid class and --mpe-* CSS variables from source diagram', () => {
  const dom = new JSDOM(`<!DOCTYPE html>
    <body class="theme-dark">
      <div class="mermaid mfe-enhanced theme-cool" style="--mpe-node: #1e293b; --mpe-border: #3b82f6; --mpe-text: #f8fafc;">
        <svg id="test-svg" class="mfe-enhanced mermaid-genie-diagram" viewBox="0 0 400 300">
          <g class="node mfe-fill-0"><rect width="100" height="40"/></g>
        </svg>
      </div>
    </body>`);

  const { window } = dom;
  const sourceSvg = window.document.getElementById('test-svg') as unknown as SVGSVGElement;
  const host = sourceSvg.closest('.mermaid') as HTMLElement;

  // Simulate modal wrapper construction logic from main.ts
  const modalContentWrapper = window.document.createElement('div');
  modalContentWrapper.className = 'mermaid-zoom-modal-wrapper mermaid';

  for (const cls of Array.from(host.classList)) {
    if (cls !== 'mermaid' && !cls.startsWith('mermaid-zoom-')) {
      modalContentWrapper.classList.add(cls);
    }
  }

  const hostStyle = window.getComputedStyle(host);
  for (const prop of ['--mpe-node', '--mpe-border', '--mpe-line', '--mpe-text', '--mpe-label', '--mpe-highlight']) {
    const val = hostStyle.getPropertyValue(prop);
    if (val) {
      modalContentWrapper.style.setProperty(prop, val);
    }
  }

  const svgClone = sourceSvg.cloneNode(true) as SVGSVGElement;
  modalContentWrapper.appendChild(svgClone);

  // Assertions
  assert.ok(modalContentWrapper.classList.contains('mermaid'), 'Modal wrapper must carry .mermaid class');
  assert.ok(modalContentWrapper.classList.contains('mfe-enhanced'), 'Modal wrapper should inherit .mfe-enhanced');
  assert.ok(modalContentWrapper.classList.contains('theme-cool'), 'Modal wrapper should inherit theme class');
  assert.equal(svgClone.classList.contains('mermaid-genie-diagram'), true, 'SVG clone should keep its Genie diagram class');
  assert.equal(modalContentWrapper.style.getPropertyValue('--mpe-node'), '#1e293b');
  assert.equal(modalContentWrapper.style.getPropertyValue('--mpe-border'), '#3b82f6');
  assert.equal(modalContentWrapper.style.getPropertyValue('--mpe-text'), '#f8fafc');
});

test('Mermaid Zoom styles: maintains high contrast rules for Sankey gradients, Block text, and Gantt active bars', () => {
  const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf-8');

  // Sankey gradient visibility
  assert.ok(css.includes('mix-blend-mode: normal !important;'), 'Sankey links should use normal blend mode');
  assert.ok(css.includes('stroke-opacity: 0.72 !important;'), 'Sankey dark mode links should have 0.72 opacity');

  // Block diagram text readability
  assert.ok(css.includes(':is(text, span, p, div, .nodeLabel, .label)'), 'Block diagram selector should cover text and foreignObject elements');

  // Gantt chart active task contrast
  assert.ok(css.includes('fill: #0f172a !important;'), 'Active tasks in dark mode should use high contrast dark text');
});
