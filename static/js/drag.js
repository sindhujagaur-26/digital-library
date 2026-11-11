/*
 * drag.js — Drag-to-reorder books on the shelf.
 * Uses native HTML5 drag & drop. After a drop, the new order is
 * persisted to the server via PUT /api/books/reorder.
 * Works across shelf rows (books can be dragged between shelves).
 */

let dragSrcId = null; // Book ID being dragged

// When a spine starts being dragged, fade it out and record its ID.
document.addEventListener('dragstart', (e) => {
    const spine = e.target.closest('.book-spine');
    if (!spine) return;
    dragSrcId = parseInt(spine.dataset.bookId);
    spine.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
});

// Highlight the drop target as the dragged book hovers over it.
document.addEventListener('dragover', (e) => {
    const spine = e.target.closest('.book-spine');
    if (!spine) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    spine.classList.add('drag-over');
});

// Remove highlight when the dragged book leaves a spine.
document.addEventListener('dragleave', (e) => {
    const spine = e.target.closest('.book-spine');
    if (spine) spine.classList.remove('drag-over');
});

// Restore opacity if the drag is cancelled.
document.addEventListener('dragend', (e) => {
    const spine = e.target.closest('.book-spine');
    if (spine) spine.style.opacity = '1';
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
});

// On drop: reorder the books array, re-render the shelf, and persist to server.
document.addEventListener('drop', (e) => {
    e.preventDefault();
    const targetSpine = e.target.closest('.book-spine');
    if (!targetSpine) return;
    targetSpine.classList.remove('drag-over');

    const targetId = parseInt(targetSpine.dataset.bookId);
    if (dragSrcId === targetId) return;

    // Splice the dragged book out and insert it at the target's position
    const srcIdx = books.findIndex(b => b.id === dragSrcId);
    const dstIdx = books.findIndex(b => b.id === targetId);
    if (srcIdx === -1 || dstIdx === -1) return;

    const [moved] = books.splice(srcIdx, 1);
    books.splice(dstIdx, 0, moved);

    renderShelf(books, false);

    // Persist the new order to the database
    fetch('/api/books/reorder', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({order: books.map(b => b.id)}),
    }).catch(() => {});

    dragSrcId = null;
});
