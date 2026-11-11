/*
 * shelf.js — Core state, initialization, shelf rendering, and event wiring.
 * Loads after helpers.js. All other scripts depend on the `books` array and
 * render functions defined here.
 */

/* ── State ── */
let books = [];         // In-memory copy of all books from the server
let currentBookId = null; // ID of the book currently open in the detail modal

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
    books = BOOKS_DATA.map(b => ({...b})); // Clone server data so we can mutate freely
    renderShelf(books, true);
    bindEvents();
});

/* ── Rendering ── */
const BOOKS_PER_SHELF = 12;

// Splits books into rows of BOOKS_PER_SHELF and builds the shelf DOM.
// Each row gets its own wooden shelf surface and shadow.
function renderShelf(booksToRender, animate) {
    const container = document.getElementById('shelf-container');
    const empty = document.getElementById('empty-state');
    container.innerHTML = '';

    if (booksToRender.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    for (let i = 0; i < booksToRender.length; i += BOOKS_PER_SHELF) {
        const chunk = booksToRender.slice(i, i + BOOKS_PER_SHELF);
        const section = document.createElement('div');
        section.className = 'shelf-section';

        const row = document.createElement('div');
        row.className = 'shelf-row';

        chunk.forEach((book, j) => {
            const spine = createSpine(book);
            if (animate) {
                spine.classList.add('book-spine--enter');
                spine.style.animationDelay = `${(i + j) * 40}ms`;
            }
            row.appendChild(spine);
        });

        const surface = document.createElement('div');
        surface.className = 'shelf-surface';
        const shadow = document.createElement('div');
        shadow.className = 'shelf-shadow';

        section.appendChild(row);
        section.appendChild(surface);
        section.appendChild(shadow);
        container.appendChild(section);
    }
}

// Creates a single book spine element. Width and height scale with page count.
// Spine color comes from the dominant color extracted from the book's cover.
function createSpine(book) {
    const spine = document.createElement('div');
    spine.className = 'book-spine';
    spine.dataset.bookId = book.id;
    spine.dataset.genre = normalizeGenre(book.genre);

    const pages = book.pages || 250;
    const width = Math.max(28, Math.min(58, Math.round(pages / 6)));
    const height = 200 + Math.min(40, Math.round(pages / 20));
    const tilt = (Math.random() - 0.5) * 3; // Slight random lean for a natural look
    spine.style.width = `${width}px`;
    spine.style.setProperty('--tilt', `${tilt}deg`);
    spine.style.transform = `rotate(${tilt}deg)`;
    spine.style.height = `${height}px`;
    spine.draggable = true; // Enables drag-to-reorder (see drag.js)

    const color = book.spine_color || '#8B7355';
    spine.style.backgroundColor = color;

    const textColor = getTextColor(color);

    const title = document.createElement('span');
    title.className = 'book-spine__title';
    title.textContent = book.title;
    title.style.color = textColor;
    spine.appendChild(title);

    // Only show author on wider spines to avoid text overflow
    if (width > 34) {
        const author = document.createElement('span');
        author.className = 'book-spine__author';
        author.textContent = book.author.split(',')[0];
        author.style.color = textColor;
        spine.appendChild(author);
    }

    const tooltip = createTooltip(book);
    spine.appendChild(tooltip);

    spine.addEventListener('click', () => openBookDetail(book.id));

    return spine;
}

// Builds the hover tooltip showing title, author, genre pill, and star rating.
function createTooltip(book) {
    const tip = document.createElement('div');
    tip.className = 'spine-tooltip';

    const meta = [];
    if (book.year) meta.push(book.year);
    if (book.pages) meta.push(`${book.pages} pages`);

    // Render stars with half-star support
    let rating;
    if (book.rating) {
        const full = Math.floor(book.rating);
        const hasHalf = book.rating % 1 !== 0;
        const empty = 5 - full - (hasHalf ? 1 : 0);
        rating = '<span class="spine-tooltip__stars">' + '★'.repeat(full) + (hasHalf ? '⯪' : '') + '☆'.repeat(empty) + '</span>';
    } else {
        rating = '<span class="spine-tooltip__unrated">Not rated</span>';
    }

    tip.innerHTML = `
        <div class="spine-tooltip__title">${escapeHtml(book.title)}</div>
        <div class="spine-tooltip__author">${escapeHtml(book.author)}</div>
        ${meta.length ? `<div class="spine-tooltip__meta">${meta.join(' &middot; ')}</div>` : ''}
        ${book.genre ? `<div class="spine-tooltip__genre">${escapeHtml(book.genre)}</div>` : ''}
        <div class="spine-tooltip__rating">${rating}</div>
    `;
    return tip;
}

// Rebuilds a single spine's tooltip after data changes (rating, genre edit, etc.)
// without re-rendering the entire shelf.
function refreshSpineTooltip(bookId) {
    const book = books.find(b => b.id === bookId);
    const spine = document.querySelector(`.book-spine[data-book-id="${bookId}"]`);
    if (!book || !spine) return;
    const old = spine.querySelector('.spine-tooltip');
    if (old) old.remove();
    spine.appendChild(createTooltip(book));
}

// Updates the "X Volumes" counter in the header.
function updateVolumeCount() {
    document.getElementById('volume-count').textContent = books.length;
}

/* ── Events ── */
// Wires up all click handlers, keyboard shortcuts, and form listeners.
function bindEvents() {
    // Modal open/close
    document.getElementById('add-book-btn').addEventListener('click', openAddModal);
    document.getElementById('add-modal-close').addEventListener('click', closeAddModal);
    document.getElementById('detail-modal-close').addEventListener('click', closeDetailModal);

    // Close modals by clicking the overlay backdrop
    document.getElementById('add-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeAddModal();
    });
    document.getElementById('detail-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeDetailModal();
    });

    // Auto-fill today's date when status changes to "reading" or "finished"
    document.getElementById('detail-status').addEventListener('change', (e) => {
        const today = new Date().toISOString().split('T')[0];
        if (e.target.value === 'reading' && !document.getElementById('detail-date-started').value) {
            document.getElementById('detail-date-started').value = today;
        }
        if (e.target.value === 'finished' && !document.getElementById('detail-date-finished').value) {
            document.getElementById('detail-date-finished').value = today;
        }
    });

    // Debounced search as user types in the add-book modal
    document.getElementById('api-search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => searchGoogleBooks(e.target.value), 350);
    });

    // Add-book modal step navigation and star ratings
    document.getElementById('add-back-btn').addEventListener('click', () => showAddStep('search'));
    document.getElementById('add-confirm-btn').addEventListener('click', () => addBook());
    document.getElementById('manual-entry-btn').addEventListener('click', () => openManualEntry());
    document.getElementById('manual-back-btn').addEventListener('click', () => showAddStep('search'));
    document.getElementById('manual-confirm-btn').addEventListener('click', () => addManualBook());
    buildAddStarElements();
    buildStarElements();

    // Quotes
    document.getElementById('quote-add-btn').addEventListener('click', addQuote);
    document.getElementById('quote-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addQuote();
    });

    document.getElementById('delete-book-btn').addEventListener('click', deleteBook);

    // Escape key closes any open modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAddModal();
            closeDetailModal();
        }
    });
}
