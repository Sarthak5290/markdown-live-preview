// The draggable divider between the editor and the preview. Pointer events, so
// it works with a mouse, a finger or a pen. Double-click splits the panes evenly.
export const setupDivider = () => {
    let lastLeftRatio = 0.5;
    const divider = document.getElementById('split-divider');
    const leftPane = document.getElementById('edit');
    const rightPane = document.getElementById('preview');
    const container = document.getElementById('container');
    let isDragging = false;

    divider.addEventListener('pointerenter', () => {
        divider.classList.add('hover');
    });

    divider.addEventListener('pointerleave', () => {
        if (!isDragging) {
            divider.classList.remove('hover');
        }
    });

    divider.addEventListener('pointerdown', (e) => {
        isDragging = true;
        // Keep receiving moves even when the pointer leaves the thin divider.
        divider.setPointerCapture(e.pointerId);
        divider.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    divider.addEventListener('dblclick', () => {
        const halfWidth = (container.getBoundingClientRect().width - divider.offsetWidth) / 2;
        leftPane.style.width = halfWidth + 'px';
        rightPane.style.width = halfWidth + 'px';
    });

    divider.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const containerRect = container.getBoundingClientRect();
        const totalWidth = containerRect.width;
        const dividerWidth = divider.offsetWidth;

        // Keep both panes at least 100px wide.
        const minWidth = 100;
        const maxWidth = totalWidth - minWidth - dividerWidth;
        const leftWidth = Math.max(minWidth, Math.min(e.clientX - containerRect.left, maxWidth));
        leftPane.style.width = leftWidth + 'px';
        rightPane.style.width = (totalWidth - leftWidth - dividerWidth) + 'px';
        lastLeftRatio = leftWidth / (totalWidth - dividerWidth);
    });

    const endDrag = () => {
        if (isDragging) {
            isDragging = false;
            divider.classList.remove('active');
            divider.classList.remove('hover');
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
        }
    };
    divider.addEventListener('pointerup', endDrag);
    divider.addEventListener('pointercancel', endDrag);

    // Keep the same split when the window (or the space beside the outline) changes.
    window.addEventListener('resize', () => {
        const availableWidth = container.getBoundingClientRect().width - divider.offsetWidth;
        leftPane.style.width = availableWidth * lastLeftRatio + 'px';
        rightPane.style.width = availableWidth * (1 - lastLeftRatio) + 'px';
    });
};
