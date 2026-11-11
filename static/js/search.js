/*
 * search.js — Handles genre chip filtering, text search, and status filtering.
 * All three filters combine with AND logic: a book must match all active filters.
 */

let activeGenre = 'all';    // Currently selected genre chip
let activeStatus = 'all';   // Status filter set from the side panel
let searchQuery = '';        // Text typed in the search bar

const STATUS_LABELS = {
    reading: 'Currently Reading',
    want_to_read: 'To Be Read',
    finished: 'Completed',
    abandoned: "Didn't Finish",
};

document.addEventListener('DOMContentLoaded', () => {
    // Genre chip click handlers
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelector('.filter-chip.active').classList.remove('active');
            chip.classList.add('active');
            activeGenre = chip.dataset.genre;
            applyFilters();
        });
    });

    // Live search as user types
    document.getElementById('search-input').addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        applyFilters();
    });

    // Clear button on the filter banner
    document.getElementById('filter-banner-clear').addEventListener('click', () => {
        clearStatusFilter();
    });
});

// Called from panel.js when a status heading is clicked.
function setStatusFilter(status) {
    activeStatus = status;
    applyFilters();
    updateFilterBanner();
}

// Resets to showing all books.
function clearStatusFilter() {
    activeStatus = 'all';
    applyFilters();
    updateFilterBanner();
}

// Shows or hides the small chip above the shelf indicating which status filter is active.
function updateFilterBanner() {
    const banner = document.getElementById('filter-banner');
    if (activeStatus !== 'all') {
        document.getElementById('filter-banner-label').textContent = STATUS_LABELS[activeStatus] || activeStatus;
        banner.classList.add('active');
    } else {
        banner.classList.remove('active');
    }
}

// Filters the books array and re-renders the shelf.
// Combines status filter + genre filter + text search.
function applyFilters() {
    const filtered = books.filter(book => {
        // Status filter (from side panel)
        if (activeStatus !== 'all' && book.status !== activeStatus) return false;

        // Genre filter (from chips) — fiction includes its subgenres, nonfiction includes self-help
        if (activeGenre !== 'all') {
            const bookGenre = normalizeGenre(book.genre);
            const fictionSubgenres = ['romance', 'sci-fi', 'fantasy', 'mystery'];
            const match = bookGenre === activeGenre
                || (activeGenre === 'fiction' && fictionSubgenres.includes(bookGenre))
                || (activeGenre === 'nonfiction' && bookGenre === 'self-help');
            if (!match) return false;
        }

        // Text search across title, author, and genre
        if (searchQuery) {
            const haystack = `${book.title} ${book.author} ${book.genre || ''}`.toLowerCase();
            if (!haystack.includes(searchQuery)) return false;
        }

        return true;
    });

    renderShelf(filtered, false);
}
