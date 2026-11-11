/*
 * stats.js — Reading stats dashboard (/stats page).
 */

const WARM = [
    '#c8a870', '#8a6840', '#d4a030', '#a0522d', '#b8860b',
    '#6b4423', '#cd853f', '#daa520', '#8b7355', '#d2691e',
    '#bc8f8f', '#c4a882', '#967444', '#a0785a', '#e8b84b',
];

let monthlyChart = null;
let genreChart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    document.getElementById('year-select').addEventListener('change', () => loadStats());
});

async function loadStats() {
    const year = document.getElementById('year-select').value;
    const url = year ? `/api/stats?year=${year}` : '/api/stats';

    const resp = await fetch(url);
    const data = await resp.json();

    const select = document.getElementById('year-select');
    if (select.options.length <= 1 && data.available_years.length > 0) {
        data.available_years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            select.appendChild(opt);
        });
    }

    document.getElementById('stat-total').textContent = data.total_books;
    document.getElementById('stat-finished').textContent = data.total_finished;
    document.getElementById('stat-pages').textContent = data.total_pages.toLocaleString();

    if (monthlyChart) { monthlyChart.destroy(); monthlyChart = null; }
    if (genreChart) { genreChart.destroy(); genreChart = null; }

    renderMonthlyChart(data.books_per_month, data.month_books || {});
    renderGenreChart(data.genre_counts, data.genre_books || {});
    renderWrapped(data.wrapped);
}

function renderMonthlyChart(months, monthBooks) {
    const keys = Object.keys(months).sort();
    const emptyEl = document.getElementById('monthly-empty');
    const canvas = document.getElementById('chart-monthly');

    if (keys.length === 0) {
        emptyEl.style.display = 'block';
        canvas.style.display = 'none';
        return;
    }
    emptyEl.style.display = 'none';
    canvas.style.display = '';

    const labels = keys.map(k => {
        const [y, m] = k.split('-');
        return new Date(y, m - 1).toLocaleString('default', {month: 'short', year: '2-digit'});
    });

    const bookTitles = keys.map(k => monthBooks[k] || []);

    monthlyChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Books finished',
                data: keys.map(k => months[k]),
                backgroundColor: 'rgba(200, 168, 112, 0.5)',
                borderColor: '#c8a870',
                borderWidth: 2,
                borderRadius: 6,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {display: false},
                tooltip: {
                    callbacks: {
                        afterBody(items) {
                            const titles = bookTitles[items[0].dataIndex];
                            if (!titles || titles.length === 0) return '';
                            return titles.map(t => '  · ' + t);
                        },
                    },
                },
            },
            scales: {
                y: {beginAtZero: true, ticks: {stepSize: 1, color: '#b8a888'}, grid: {color: 'rgba(200,168,112,0.1)'}},
                x: {ticks: {color: '#b8a888'}, grid: {display: false}},
            },
        },
    });
}

function renderGenreChart(genres, genreBooks) {
    const entries = Object.entries(genres).sort((a, b) => b[1] - a[1]);
    const emptyEl = document.getElementById('genre-empty');
    const canvas = document.getElementById('chart-genre');

    if (entries.length === 0) {
        emptyEl.style.display = 'block';
        canvas.style.display = 'none';
        return;
    }
    emptyEl.style.display = 'none';
    canvas.style.display = '';

    const bookTitles = entries.map(e => genreBooks[e[0]] || []);

    genreChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: entries.map(e => e[0]),
            datasets: [{
                data: entries.map(e => e[1]),
                backgroundColor: entries.map((_, i) => WARM[i % WARM.length]),
                borderColor: 'transparent',
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {color: '#8a7a60', font: {family: "'Playfair Display', serif", style: 'italic', size: 12}},
                },
                tooltip: {
                    callbacks: {
                        afterBody(items) {
                            const titles = bookTitles[items[0].dataIndex];
                            if (!titles || titles.length === 0) return '';
                            return titles.map(t => '  · ' + t);
                        },
                    },
                },
            },
        },
    });
}

function renderWrapped(w) {
    const el = document.getElementById('wrapped');
    if (!w.total_finished) {
        el.style.display = 'none';
        return;
    }
    el.style.display = 'block';

    document.getElementById('wrapped-genre').textContent = w.top_genre || '--';
    document.getElementById('wrapped-longest').textContent = w.longest
        ? `${w.longest.title} (${w.longest.pages}p)`
        : '--';
    document.getElementById('wrapped-quoted').textContent = w.most_quoted
        ? `${w.most_quoted.title} (${w.most_quoted.count} quotes)`
        : '--';
    document.getElementById('wrapped-pages').textContent = w.total_pages.toLocaleString();
}
