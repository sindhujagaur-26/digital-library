/*
 * modal.js — Handles both the "Add Book" modal (two-step: search → details)
 * and the "Book Detail" modal (view/edit an existing book).
 * Also manages star ratings, quotes, and book deletion.
 */

/* ── Add Book Modal ── */
let searchTimeout = null;   // Debounce timer for search input
let pendingBookData = null;  // Book data from search results, waiting to be confirmed
let addRating = 0;           // Rating selected in the add-book step 2

// Opens the add-book modal and resets to the search step.
function openAddModal() {
    document.getElementById('add-modal').classList.add('open');
    showAddStep('search');
    const input = document.getElementById('api-search-input');
    input.value = '';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-loading').style.display = 'none';
    setTimeout(() => input.focus(), 100);
}

function closeAddModal() {
    document.getElementById('add-modal').classList.remove('open');
    pendingBookData = null;
    addRating = 0;
}

// Toggles between search, details, and manual entry steps.
function showAddStep(step) {
    document.getElementById('add-step-search').style.display = step === 'search' ? '' : 'none';
    document.getElementById('add-step-details').style.display = step === 'details' ? '' : 'none';
    document.getElementById('add-step-manual').style.display = step === 'manual' ? '' : 'none';
}

// Moves to step 2: shows book preview and lets user set status, rating, notes before adding.
function showAddDetails(bookData) {
    pendingBookData = bookData;
    addRating = 0;

    document.getElementById('add-preview-cover').src = bookData.cover_url || '';
    document.getElementById('add-preview-title').textContent = bookData.title;
    document.getElementById('add-preview-author').textContent = bookData.author || '';

    const meta = [];
    if (bookData.year) meta.push(bookData.year);
    if (bookData.pages) meta.push(`${bookData.pages} pages`);
    document.getElementById('add-preview-meta').textContent = meta.join(' · ');

    document.getElementById('add-status').value = 'want_to_read';
    document.getElementById('add-notes').value = '';
    renderAddStars(0);

    showAddStep('details');
}

// Creates interactive star elements for the add-book modal.
// Clicking the left half of a star = half rating (e.g. 3.5), right half = full.
function buildAddStarElements() {
    const container = document.getElementById('add-star-rating');
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        star.dataset.value = i;
        star.innerHTML = '&#9733;';
        star.addEventListener('click', (e) => {
            const rect = star.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const isHalf = clickX < rect.width / 2;
            addRating = isHalf ? i - 0.5 : i;
            renderAddStars(addRating);
        });
        container.appendChild(star);
    }
}

// Updates star visual state: filled, half (CSS gradient), or empty.
function renderAddStars(rating) {
    document.querySelectorAll('#add-star-rating .star').forEach(star => {
        const val = parseInt(star.dataset.value);
        star.classList.remove('filled', 'half');
        if (val <= rating) {
            star.classList.add('filled');
        } else if (val - 0.5 === rating) {
            star.classList.add('half');
        }
    });
}

// Searches the Open Library API via our backend proxy.
async function searchGoogleBooks(query) {
    if (!query.trim()) {
        document.getElementById('search-results').innerHTML = '';
        document.getElementById('search-loading').style.display = 'none';
        return;
    }

    document.getElementById('search-loading').style.display = 'block';
    document.getElementById('search-results').innerHTML = '';

    try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await resp.json();
        document.getElementById('search-loading').style.display = 'none';
        renderSearchResults(results);
        // Show "Can't find it?" link after search completes
        document.getElementById('manual-link').style.display = '';
    } catch {
        document.getElementById('search-loading').textContent = 'Search failed. Try again.';
        document.getElementById('manual-link').style.display = '';
    }
}

// Renders search results as clickable rows with cover, title, author, and "Add" button.
function renderSearchResults(results) {
    const container = document.getElementById('search-results');
    container.innerHTML = '';

    if (results.length === 0) {
        container.innerHTML = '<p class="search-loading">No results found.</p>';
        return;
    }

    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'search-result';

        const meta = [];
        if (result.author) meta.push(result.author);
        if (result.year) meta.push(result.year);
        if (result.pages) meta.push(`${result.pages} pages`);

        div.innerHTML = `
            <img class="search-result__cover"
                 src="${result.cover_url || ''}"
                 alt=""
                 onerror="this.style.display='none'">
            <div class="search-result__info">
                <div class="search-result__title">${escapeHtml(result.title)}</div>
                <div class="search-result__detail">${escapeHtml(meta.join(' · '))}</div>
            </div>
            <button class="search-result__add">Add</button>
        `;

        div.querySelector('.search-result__add').addEventListener('click', (e) => {
            e.stopPropagation();
            // Check for duplicates before proceeding to step 2
            const duplicate = books.find(b =>
                b.title.toLowerCase() === result.title.toLowerCase() &&
                b.author.toLowerCase() === result.author.toLowerCase()
            );
            if (duplicate) {
                showToast(`"${result.title}" is already on your shelf`);
                return;
            }
            showAddDetails(result);
        });

        container.appendChild(div);
    });
}

// Sends the book + user-entered details (status, rating, notes) to the API.
// The backend also checks for duplicates (409 response) as a safety net.
async function addBook() {
    if (!pendingBookData) return;
    const bookData = {
        ...pendingBookData,
        status: document.getElementById('add-status').value,
        notes: document.getElementById('add-notes').value.trim() || undefined,
        rating: addRating || undefined,
    };

    try {
        const resp = await fetch('/api/books', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(bookData),
        });
        if (resp.status === 409) {
            showToast(`"${bookData.title}" is already on your shelf`);
            return;
        }
        const book = await resp.json();
        books.unshift(book);
        updateVolumeCount();

        renderShelf(books, false);
        const newSpine = document.querySelector(`.book-spine[data-book-id="${book.id}"]`);
        if (newSpine) newSpine.classList.add('book-spine--new');

        document.getElementById('empty-state').style.display = 'none';
        closeAddModal();
        showToast(`"${book.title}" added to the shelf`);
    } catch {
        showToast('Failed to add book. Try again.');
    }
}

/* ── Manual Entry ── */

// Opens the manual entry form, pre-filling the title from the search input.
function openManualEntry() {
    document.getElementById('manual-title').value = document.getElementById('api-search-input').value || '';
    document.getElementById('manual-author').value = '';
    document.getElementById('manual-pages').value = '';
    document.getElementById('manual-year').value = '';
    document.getElementById('manual-genre').value = '';
    document.getElementById('manual-status').value = 'want_to_read';
    showAddStep('manual');
}

// Validates and submits the manually entered book.
async function addManualBook() {
    const title = document.getElementById('manual-title').value.trim();
    const author = document.getElementById('manual-author').value.trim();
    if (!title || !author) {
        showToast('Title and author are required');
        return;
    }

    const bookData = {
        title,
        author,
        pages: parseInt(document.getElementById('manual-pages').value) || null,
        year: parseInt(document.getElementById('manual-year').value) || null,
        genre: document.getElementById('manual-genre').value.trim() || null,
        status: document.getElementById('manual-status').value,
    };

    // Duplicate check
    const duplicate = books.find(b =>
        b.title.toLowerCase() === title.toLowerCase() &&
        b.author.toLowerCase() === author.toLowerCase()
    );
    if (duplicate) {
        showToast(`"${title}" is already on your shelf`);
        return;
    }

    try {
        const resp = await fetch('/api/books', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(bookData),
        });
        if (resp.status === 409) {
            showToast(`"${title}" is already on your shelf`);
            return;
        }
        const book = await resp.json();
        books.unshift(book);
        updateVolumeCount();

        renderShelf(books, false);
        const newSpine = document.querySelector(`.book-spine[data-book-id="${book.id}"]`);
        if (newSpine) newSpine.classList.add('book-spine--new');

        document.getElementById('empty-state').style.display = 'none';
        closeAddModal();
        showToast(`"${book.title}" added to the shelf`);
    } catch {
        showToast('Failed to add book. Try again.');
    }
}

/* ── Book Detail Modal ── */

// Opens the detail modal for a specific book, populating all fields.
function openBookDetail(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    currentBookId = bookId;

    document.getElementById('detail-cover').src = book.cover_url || '';
    document.getElementById('detail-title').textContent = book.title;
    document.getElementById('detail-author').textContent = book.author;

    const meta = [];
    if (book.year) meta.push(book.year);
    if (book.pages) meta.push(`${book.pages} pages`);
    document.getElementById('detail-meta').textContent = meta.join(' · ');

    document.getElementById('detail-genre').textContent = book.genre || '';
    document.getElementById('detail-genre-edit').value = book.genre || '';
    document.getElementById('detail-description').textContent = book.description || '';
    document.getElementById('detail-status').value = book.status || 'want_to_read';
    document.getElementById('detail-notes').value = book.notes || '';
    document.getElementById('detail-date-started').value = book.date_started || '';
    document.getElementById('detail-date-finished').value = book.date_finished || '';

    renderStars(book.rating || 0);
    renderQuotes(book.quotes || []);

    document.getElementById('detail-modal').classList.add('open');
}

// Saves any changes and closes the detail modal.
// Also refreshes the spine tooltip and side panel to reflect updates.
function closeDetailModal() {
    const closingBookId = currentBookId;
    saveCurrentBookDetails();
    document.getElementById('detail-modal').classList.remove('open');
    if (closingBookId) refreshSpineTooltip(closingBookId);
    currentBookId = null;
    updatePanel();
}

// Compares current form values to the book's data and PUTs only if something changed.
async function saveCurrentBookDetails() {
    if (!currentBookId) return;
    const book = books.find(b => b.id === currentBookId);
    if (!book) return;

    const status = document.getElementById('detail-status').value;
    const notes = document.getElementById('detail-notes').value;
    const genre = document.getElementById('detail-genre-edit').value.trim();
    const dateStarted = document.getElementById('detail-date-started').value || null;
    const dateFinished = document.getElementById('detail-date-finished').value || null;

    const changed = status !== book.status
        || notes !== (book.notes || '')
        || genre !== (book.genre || '')
        || dateStarted !== (book.date_started || null)
        || dateFinished !== (book.date_finished || null);

    if (changed) {
        try {
            const resp = await fetch(`/api/books/${currentBookId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({status, notes, genre, date_started: dateStarted, date_finished: dateFinished}),
            });
            const updated = await resp.json();
            Object.assign(book, updated);
        } catch { /* silent */ }
    }
}

// Creates interactive star elements for the detail modal (same half-star logic as add modal).
function buildStarElements() {
    const container = document.getElementById('star-rating');
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        star.dataset.value = i;
        star.innerHTML = '&#9733;';
        star.addEventListener('click', (e) => {
            const rect = star.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const isHalf = clickX < rect.width / 2;
            setRating(isHalf ? i - 0.5 : i);
        });
        container.appendChild(star);
    }
}

// Updates star display in the detail modal. Supports full, half, and empty states.
function renderStars(rating) {
    document.querySelectorAll('#star-rating .star').forEach(star => {
        const val = parseInt(star.dataset.value);
        star.classList.remove('filled', 'half');
        if (val <= rating) {
            star.classList.add('filled');
        } else if (val - 0.5 === rating) {
            star.classList.add('half');
        }
    });
}

// Renders the list of saved quotes for the current book.
function renderQuotes(quotes) {
    const list = document.getElementById('quotes-list');
    list.innerHTML = '';

    quotes.forEach(q => {
        const div = document.createElement('div');
        div.className = 'quote-item';
        div.innerHTML = `
            <span class="quote-item__text">"${escapeHtml(q.text)}"</span>
            ${q.page_number ? `<span class="quote-item__page">p.${q.page_number}</span>` : ''}
            <button class="quote-item__delete" data-quote-id="${q.id}">&times;</button>
        `;
        div.querySelector('.quote-item__delete').addEventListener('click', () => deleteQuote(q.id));
        list.appendChild(div);
    });
}

// Adds a new quote (favorite line) to the current book.
async function addQuote() {
    if (!currentBookId) return;
    const input = document.getElementById('quote-input');
    const pageInput = document.getElementById('quote-page');
    const text = input.value.trim();
    if (!text) return;

    const pageNum = pageInput.value ? parseInt(pageInput.value) : null;

    try {
        const resp = await fetch(`/api/books/${currentBookId}/quotes`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, page_number: pageNum}),
        });
        const quote = await resp.json();
        const book = books.find(b => b.id === currentBookId);
        if (book) {
            if (!book.quotes) book.quotes = [];
            book.quotes.push(quote);
            renderQuotes(book.quotes);
        }
        input.value = '';
        pageInput.value = '';
    } catch {
        showToast('Failed to save quote.');
    }
}

async function deleteQuote(quoteId) {
    try {
        await fetch(`/api/quotes/${quoteId}`, {method: 'DELETE'});
        const book = books.find(b => b.id === currentBookId);
        if (book) {
            book.quotes = (book.quotes || []).filter(q => q.id !== quoteId);
            renderQuotes(book.quotes);
        }
    } catch {
        showToast('Failed to delete quote.');
    }
}

// Sets rating, updates display, triggers pop animation, and persists to server.
async function setRating(rating) {
    if (!currentBookId) return;
    const book = books.find(b => b.id === currentBookId);
    if (!book) return;

    book.rating = rating;
    renderStars(rating);
    refreshSpineTooltip(currentBookId);

    // Pop animation on filled stars
    document.querySelectorAll('#star-rating .star').forEach(star => {
        const val = parseInt(star.dataset.value);
        if (val <= rating || val - 0.5 === rating) {
            star.classList.remove('pop');
            void star.offsetWidth; // Force reflow to restart animation
            star.classList.add('pop');
        }
    });

    try {
        await fetch(`/api/books/${currentBookId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({rating}),
        });
    } catch { /* silent */ }
}

// Deletes a book after user confirmation. Re-renders shelf to fill the gap.
async function deleteBook() {
    if (!currentBookId) return;
    const book = books.find(b => b.id === currentBookId);
    if (!book) return;

    if (!confirm(`Remove "${book.title}" from your library?`)) return;

    try {
        await fetch(`/api/books/${currentBookId}`, {method: 'DELETE'});
        books = books.filter(b => b.id !== currentBookId);
        updateVolumeCount();

        closeDetailModal();
        renderShelf(books, false);
        showToast(`"${book.title}" removed`);
    } catch {
        showToast('Failed to delete book.');
    }
}
