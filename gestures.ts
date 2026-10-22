export interface ZoomState {
	scale: number;
	minScale: number;
	maxScale: number;
	isDragging: boolean;
	startX: number;
	startY: number;
	translateX: number;
	translateY: number;
	// Optional readout showing the current scale as a percentage; updated
	// by updateTransform whenever the transform changes.
	scaleIndicator?: HTMLElement;
	svg: SVGSVGElement;
	container: HTMLElement;
	// Original SVG dimensions (saved once)
	svgOriginalWidth: number;
	svgOriginalHeight: number;
}

export function updateTransform(contentWrapper: HTMLElement, state: ZoomState) {
	contentWrapper.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;

	// Update scale indicator
	if (state.scaleIndicator) {
		state.scaleIndicator.textContent = `${Math.round(state.scale * 100)}%`;
	}
}

/** Zoom by a multiplicative factor, keeping the container's center fixed. */
export function zoom(contentWrapper: HTMLElement, state: ZoomState, factor: number) {
	let newScale = state.scale * factor;
	newScale = Math.max(state.minScale, Math.min(state.maxScale, newScale));

	// Center the zoom on the middle of the container
	const container = state.container;
	const rect = container.getBoundingClientRect();
	const centerX = rect.width / 2;
	const centerY = rect.height / 2;
	const scaleRatio = newScale / state.scale;

	state.translateX = centerX - (centerX - state.translateX) * scaleRatio;
	state.translateY = centerY - (centerY - state.translateY) * scaleRatio;

	state.scale = newScale;
	updateTransform(contentWrapper, state);
}

/** Convert a wheel event into a multiplicative zoom factor: normalize
 *  deltaMode (line/page) to pixels, clamp a single event to one notch
 *  (~100px), and scale exponentially so trackpads and Magic Mouse aren't
 *  hair-triggered. A full notch zooms ~11% (×0.88/×1.13) at sensitivity 1.
 *  Shared by the fullscreen modal and inline zoom (inlineZoom.ts). */
export function wheelZoomFactor(e: WheelEvent, sensitivity = 1): number {
	// Normalize the delta to pixels: line-mode (deltaMode 1) deltas are
	// line counts, page-mode (2) are page fractions.
	let deltaPx = e.deltaY;
	if (e.deltaMode === 1) deltaPx *= 33;
	else if (e.deltaMode === 2) deltaPx *= 300;

	// Clamp a single event to one notch (~100px) so coarse devices
	// can't skip several zoom steps at once.
	const clamped = Math.max(-100, Math.min(100, deltaPx));

	// Scale the zoom step with the actual scroll amount: a full mouse
	// notch (~100px) zooms ~11% (matching the old fixed step), while
	// the tiny deltas from trackpads and Magic Mouse zoom ~0.5% each,
	// so high-resolution devices no longer feel hair-triggered.
	return Math.exp((-clamped / 100) * 0.12 * sensitivity);
}

export function addWheelZoom(container: HTMLElement, contentWrapper: HTMLElement, state: ZoomState, sensitivity = 1): () => void {
	let cachedRect: DOMRect | null = null;
	let rectTimer: number | null = null;
	let rafId: number | null = null;

	const wheelHandler = (e: WheelEvent) => {
		e.preventDefault();

		if (!cachedRect) {
			cachedRect = container.getBoundingClientRect();
		}
		if (rectTimer !== null) window.clearTimeout(rectTimer);
		rectTimer = window.setTimeout(() => {
			cachedRect = null;
			rectTimer = null;
		}, 150);

		const mouseX = e.clientX - cachedRect.left;
		const mouseY = e.clientY - cachedRect.top;

		const factor = wheelZoomFactor(e, sensitivity);
		const oldScale = state.scale;
		let newScale = oldScale * factor;
		newScale = Math.max(state.minScale, Math.min(state.maxScale, newScale));

		if (newScale !== oldScale) {
			const scaleRatio = newScale / oldScale;
			state.translateX = mouseX - (mouseX - state.translateX) * scaleRatio;
			state.translateY = mouseY - (mouseY - state.translateY) * scaleRatio;
			state.scale = newScale;

			if (rafId === null) {
				rafId = requestAnimationFrame(() => {
					rafId = null;
					updateTransform(contentWrapper, state);
				});
			}
		}
	};
	container.addEventListener('wheel', wheelHandler, { passive: false });

	return () => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		if (rectTimer !== null) clearTimeout(rectTimer);
		container.removeEventListener('wheel', wheelHandler);
	};
}

export function addDragPan(container: HTMLElement, contentWrapper: HTMLElement, state: ZoomState): () => void {
	let rafId: number | null = null;

	container.addEventListener('mousedown', (e) => {
		if (e.button === 0) { // Left click
			state.isDragging = true;
			state.startX = e.clientX - state.translateX;
			state.startY = e.clientY - state.translateY;
			contentWrapper.addClass('dragging');
		}
	});

	const onMouseMove = (e: MouseEvent) => {
		if (state.isDragging) {
			e.preventDefault();
			state.translateX = e.clientX - state.startX;
			state.translateY = e.clientY - state.startY;

			if (rafId === null) {
				rafId = requestAnimationFrame(() => {
					rafId = null;
					updateTransform(contentWrapper, state);
				});
			}
		}
	};

	const onMouseUp = () => {
		if (state.isDragging) {
			state.isDragging = false;
			contentWrapper.removeClass('dragging');
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
			updateTransform(contentWrapper, state);
		}
	};

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);

	return () => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	};
}

export function addTouchGestures(container: HTMLElement, contentWrapper: HTMLElement, state: ZoomState, sensitivity = 1): () => void {
	let initialDistance = 0;
	let initialScale = 1;
	let initialTranslateX = 0;
	let initialTranslateY = 0;
	let initialCenterX = 0;
	let initialCenterY = 0;
	let cachedRect: DOMRect | null = null;
	let rafId: number | null = null;

	const onTouchStart = (e: TouchEvent) => {
		cachedRect = container.getBoundingClientRect();
		if (e.touches.length === 2) {
			const touch1 = e.touches[0];
			const touch2 = e.touches[1];
			initialDistance = Math.hypot(
				touch2.clientX - touch1.clientX,
				touch2.clientY - touch1.clientY
			);
			initialScale = state.scale;
			initialTranslateX = state.translateX;
			initialTranslateY = state.translateY;

			initialCenterX = (touch1.clientX + touch2.clientX) / 2 - cachedRect.left;
			initialCenterY = (touch1.clientY + touch2.clientY) / 2 - cachedRect.top;
			state.isDragging = false;
		} else if (e.touches.length === 1) {
			state.isDragging = true;
			state.startX = e.touches[0].clientX - state.translateX;
			state.startY = e.touches[0].clientY - state.translateY;
		}
	};

	const onTouchMove = (e: TouchEvent) => {
		e.preventDefault();

		if (e.touches.length === 2) {
			if (initialDistance === 0) return;

			const touch1 = e.touches[0];
			const touch2 = e.touches[1];
			const currentDistance = Math.hypot(
				touch2.clientX - touch1.clientX,
				touch2.clientY - touch1.clientY
			);

			const scaleRatio = currentDistance / initialDistance;
			let newScale = initialScale * Math.pow(scaleRatio, sensitivity);
			newScale = Math.max(state.minScale, Math.min(state.maxScale, newScale));

			const rect = cachedRect ?? container.getBoundingClientRect();
			const currentCenterX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
			const currentCenterY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
			const appliedScaleRatio = newScale / initialScale;

			state.translateX = currentCenterX - (initialCenterX - initialTranslateX) * appliedScaleRatio;
			state.translateY = currentCenterY - (initialCenterY - initialTranslateY) * appliedScaleRatio;
			state.scale = newScale;

			if (rafId === null) {
				rafId = requestAnimationFrame(() => {
					rafId = null;
					updateTransform(contentWrapper, state);
				});
			}
		} else if (e.touches.length === 1 && state.isDragging) {
			state.translateX = e.touches[0].clientX - state.startX;
			state.translateY = e.touches[0].clientY - state.startY;

			if (rafId === null) {
				rafId = requestAnimationFrame(() => {
					rafId = null;
					updateTransform(contentWrapper, state);
				});
			}
		}
	};

	const onTouchEnd = () => {
		state.isDragging = false;
		cachedRect = null;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		updateTransform(contentWrapper, state);
	};

	container.addEventListener('touchstart', onTouchStart);
	container.addEventListener('touchmove', onTouchMove, { passive: false });
	container.addEventListener('touchend', onTouchEnd);
	container.addEventListener('touchcancel', onTouchEnd);

	return () => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		container.removeEventListener('touchstart', onTouchStart);
		container.removeEventListener('touchmove', onTouchMove);
		container.removeEventListener('touchend', onTouchEnd);
		container.removeEventListener('touchcancel', onTouchEnd);
	};
}

