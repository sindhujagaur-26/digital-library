# Digital Library — Personal Archive

A personal bookshelf web app where you search for a book, it auto-fetches details from Open Library, and displays your collection as visual book spines on a shelf.

![Stack](https://img.shields.io/badge/Flask-Jinja2-blue) ![DB](https://img.shields.io/badge/SQLite-lightgrey) ![Style](https://img.shields.io/badge/Vanilla_CSS%2FJS-gold)

## Features

**Shelf & Books**
- Visual book spines with colors extracted from cover art (dominant color via PIL)
- Spine width scales with page count, height varies slightly — each book looks unique
- Multi-row shelves that wrap automatically (12 books per row)
- Drag-and-drop reorder with server-side persistence
- Dark mode with localStorage persistence

**Adding Books**
- Search by title/author via Open Library API
- Foreign title detection — auto-fetches English edition for non-Latin or mismatched titles
- Two-step add flow: search → set status/rating/notes before adding
- Manual entry form for books not found in Open Library
- Duplicate detection (warns if book is already on shelf)

**Book Details**
- Half-star ratings (0.5 increments via click-position detection)
- Editable genre, reading status, start/finish dates, notes
- Favorite lines/quotes collection with page numbers

**Organization**
- Genre filter chips (Fiction, Nonfiction, Sci-Fi, Mystery, Fantasy, Romance, Self-Help)
- Side panel with reading status groups (Currently Reading, TBR, Completed, Didn't Finish)
- Status filter banner — compact pill showing active filter
- Text search across titles and authors

**Reading Stats Dashboard**
- Year-wise filtering for all stats
- Summary cards: total books, finished, pages read
- Books Per Month bar chart with book-title tooltips on hover
- Genre Breakdown doughnut chart with book-title tooltips on hover
- Library Wrapped section: top genre, longest book, most quoted, total pages

## Tech Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Backend   | Flask + Flask-SQLAlchemy      |
| Database  | SQLite                        |
| Frontend  | Jinja2 + Vanilla CSS/JS       |
| Charts    | Chart.js                      |
| Book Data | Open Library API              |
| Colors    | Pillow (dominant color from covers) |

## Setup

```bash
# Clone and enter the project
cd digital-library

# Create a virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the app
python3 app.py
```

The app runs at **http://localhost:5001**. The SQLite database (`library.db`) is created automatically on first run.

## Project Structure

```
digital-library/
├── app.py                  # Flask routes and API endpoints
├── models.py               # Book and Quote database models
├── config.py               # App configuration
├── requirements.txt        # Python dependencies
├── library.db              # SQLite database (auto-created)
├── utils/
│   ├── google_books.py     # Open Library search + foreign title handling
│   └── color_extract.py    # Dominant color extraction from cover images
├── templates/
│   ├── base.html           # Base template with shared head/styles
│   ├── index.html          # Main shelf page
│   └── stats.html          # Reading stats dashboard
└── static/
    ├── css/
    │   └── style.css       # All styles including dark mode
    └── js/
        ├── helpers.js      # Shared utilities (genre normalization, escaping, toasts)
        ├── shelf.js        # Shelf rendering and spine creation
        ├── modal.js        # Add-book and book-detail modals
        ├── drag.js         # Drag-and-drop reorder
        ├── panel.js        # Side panel (reading status groups)
        ├── search.js       # Genre/status/text filtering
        └── stats.js        # Stats dashboard charts and year filter
```

## API Endpoints

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/search?q=`                  | Search Open Library      |
| POST   | `/api/books`                      | Add a book               |
| GET    | `/api/books/:id`                  | Get book details         |
| PUT    | `/api/books/:id`                  | Update book              |
| DELETE | `/api/books/:id`                  | Delete book              |
| PUT    | `/api/books/reorder`              | Save shelf order         |
| POST   | `/api/books/:id/quotes`           | Add a quote              |
| DELETE | `/api/quotes/:id`                 | Delete a quote           |
| GET    | `/api/stats?year=`                | Reading statistics       |
