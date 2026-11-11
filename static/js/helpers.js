/*
 * helpers.js — Shared utility functions used across all other JS files.
 * Loaded first so every other script can call these freely.
 */

// Maps messy Open Library genre strings to a clean category for filtering.
// Order matters: checks specific subgenres (romance, sci-fi) before broad ones (fiction).
function normalizeGenre(genre) {
    if (!genre) return 'other';
    const g = genre.toLowerCase();
    if (g.includes('romance')) return 'romance';
    if (g.includes('science fiction') || g.includes('sci-fi')) return 'sci-fi';
    if (g.includes('fantasy')) return 'fantasy';
    if (g.includes('mystery') || g.includes('thriller') || g.includes('crime') || g.includes('suspense')) return 'mystery';
    if (g.includes('self-help') || g.includes('self help') || g.includes('personal development')) return 'self-help';
    if (g.includes('fiction') || g.includes('literary')) return 'fiction';
    if (g.includes('biography') || g.includes('history') || g.includes('business') || g.includes('science')
        || g.includes('philosophy') || g.includes('psychology') || g.includes('economics')
        || g.includes('politics') || g.includes('education') || g.includes('health')
        || g.includes('cooking') || g.includes('travel') || g.includes('true crime')) return 'nonfiction';
    return 'other';
}

// Returns white or black text color based on background luminance for readability on book spines.
function getTextColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)';
}

// Safely escapes HTML to prevent XSS when inserting user-provided text into innerHTML.
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Shows a brief notification at the bottom of the screen that auto-dismisses.
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}
