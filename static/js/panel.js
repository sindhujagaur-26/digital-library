/*
 * panel.js — Side panel that groups books by reading status.
 * Clicking a heading filters the main shelf to show only that status.
 * Hides the dark-mode and panel-toggle buttons while open to avoid overlap.
 */

const STATUS_MAP = {
    reading: 'reading',
    tbr: 'want_to_read',
    finished: 'finished',
    abandoned: 'abandoned',
};

function openPanel() {
    updatePanel();
    document.getElementById('side-panel').classList.add('open');
    document.getElementById('panel-overlay').classList.add('open');
    document.getElementById('dark-toggle').style.display = 'none';
    document.getElementById('panel-toggle').style.display = 'none';
}

function closePanel() {
    document.getElementById('side-panel').classList.remove('open');
    document.getElementById('panel-overlay').classList.remove('open');
    document.getElementById('dark-toggle').style.display = '';
    document.getElementById('panel-toggle').style.display = '';
}

// Updates the count next to each heading.
function updatePanel() {
    const counts = {
        reading: books.filter(b => b.status === 'reading').length,
        tbr: books.filter(b => b.status === 'want_to_read').length,
        finished: books.filter(b => b.status === 'finished').length,
        abandoned: books.filter(b => b.status === 'abandoned').length,
    };

    Object.entries(counts).forEach(([key, count]) => {
        const section = document.getElementById(`panel-${key}`);
        const heading = section.querySelector('.side-panel__heading');
        heading.textContent = heading.textContent.replace(/ \(\d+\)$/, '');
        if (count > 0) {
            heading.textContent += ` (${count})`;
        }
    });

    const clearBtn = document.getElementById('panel-clear-filter');
    if (clearBtn) clearBtn.style.display = activeStatus !== 'all' ? '' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('panel-toggle').addEventListener('click', openPanel);
    document.getElementById('panel-close').addEventListener('click', closePanel);
    document.getElementById('panel-overlay').addEventListener('click', closePanel);

    // Clicking a heading filters the shelf to that reading status.
    document.querySelectorAll('.side-panel__heading').forEach(heading => {
        heading.addEventListener('click', () => {
            const section = heading.closest('.side-panel__section');
            const key = section.id.replace('panel-', '');
            const status = STATUS_MAP[key];
            if (status) {
                setStatusFilter(status);
                closePanel();
            }
        });
    });

    document.getElementById('panel-clear-filter').addEventListener('click', () => {
        clearStatusFilter();
    });
});
