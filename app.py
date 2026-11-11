from datetime import datetime

from flask import Flask, render_template, request, jsonify

from config import Config
from models import db, Book, Quote
from utils.google_books import search_books
from utils.color_extract import extract_dominant_color

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    db.create_all()


@app.route('/')
def index():
    books = Book.query.order_by(Book.position.asc(), Book.date_added.desc()).all()
    return render_template('index.html', books=[b.to_dict() for b in books])


@app.route('/api/search')
def api_search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    return jsonify(search_books(query))


@app.route('/api/books', methods=['POST'])
def add_book():
    data = request.json

    existing = Book.query.filter(
        db.func.lower(Book.title) == data['title'].lower(),
        db.func.lower(Book.author) == data['author'].lower(),
    ).first()
    if existing:
        return jsonify({'error': 'Already on your shelf'}), 409

    spine_color = '#8B7355'
    if data.get('cover_url'):
        spine_color = extract_dominant_color(data['cover_url'])

    min_pos = db.session.query(db.func.min(Book.position)).scalar() or 0
    book = Book(
        title=data['title'],
        author=data['author'],
        year=data.get('year'),
        genre=data.get('genre'),
        pages=data.get('pages'),
        cover_url=data.get('cover_url'),
        spine_color=spine_color,
        isbn=data.get('isbn'),
        description=data.get('description', ''),
        status=data.get('status', 'want_to_read'),
        rating=data.get('rating'),
        notes=data.get('notes'),
        position=min_pos - 1,
    )
    db.session.add(book)
    db.session.commit()
    return jsonify(book.to_dict()), 201


@app.route('/api/books/<int:book_id>')
def get_book(book_id):
    book = db.get_or_404(Book, book_id)
    return jsonify(book.to_dict())


@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    book = db.get_or_404(Book, book_id)
    data = request.json

    for field in ('rating', 'status', 'notes', 'genre'):
        if field in data:
            setattr(book, field, data[field])

    for date_field in ('date_started', 'date_finished'):
        if date_field in data:
            val = data[date_field]
            setattr(book, date_field, datetime.strptime(val, '%Y-%m-%d').date() if val else None)

    db.session.commit()
    return jsonify(book.to_dict())


@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    book = db.get_or_404(Book, book_id)
    db.session.delete(book)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200


@app.route('/api/books/<int:book_id>/quotes', methods=['POST'])
def add_quote(book_id):
    db.get_or_404(Book, book_id)
    data = request.json
    quote = Quote(
        book_id=book_id,
        text=data['text'],
        page_number=data.get('page_number'),
    )
    db.session.add(quote)
    db.session.commit()
    return jsonify(quote.to_dict()), 201


@app.route('/api/quotes/<int:quote_id>', methods=['DELETE'])
def delete_quote(quote_id):
    quote = db.get_or_404(Quote, quote_id)
    db.session.delete(quote)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200


@app.route('/api/books/reorder', methods=['PUT'])
def reorder_books():
    order = request.json.get('order', [])
    for i, book_id in enumerate(order):
        book = db.session.get(Book, book_id)
        if book:
            book.position = i
    db.session.commit()
    return jsonify({'message': 'Reordered'}), 200


@app.route('/stats')
def stats():
    return render_template('stats.html')


GENRE_LABELS = {
    'romance': 'Romance',
    'sci-fi': 'Sci-Fi',
    'fantasy': 'Fantasy',
    'mystery': 'Mystery & Thriller',
    'self-help': 'Self-Help',
    'fiction': 'Fiction',
    'nonfiction': 'Nonfiction',
    'memoir': 'Memoir',
    'other': 'Other',
}


def _normalize_genre(raw):
    if not raw:
        return 'Other'
    g = raw.lower()
    if 'romance' in g: return 'Romance'
    if 'science fiction' in g or 'sci-fi' in g: return 'Sci-Fi'
    if 'fantasy' in g: return 'Fantasy'
    if 'mystery' in g or 'thriller' in g or 'crime' in g or 'suspense' in g: return 'Mystery & Thriller'
    if 'self-help' in g or 'self help' in g or 'personal development' in g: return 'Self-Help'
    if 'memoir' in g: return 'Memoir'
    if 'habit' in g or 'psycho' in g: return 'Self-Help'
    if 'fiction' in g or 'literary' in g or 'novel' in g or 'novella' in g: return 'Fiction'
    if any(k in g for k in ('biography', 'history', 'business', 'science',
        'philosophy', 'economics', 'politics', 'education', 'health',
        'cooking', 'travel', 'true crime')): return 'Nonfiction'
    return 'Other'


@app.route('/api/stats')
def api_stats():
    year = request.args.get('year', type=int)

    all_books = Book.query.all()
    finished = [b for b in all_books if b.status == 'finished']

    available_years = sorted({
        b.date_finished.year for b in finished if b.date_finished
    }, reverse=True)

    if year:
        finished = [b for b in finished if b.date_finished and b.date_finished.year == year]

    genre_counts = {}
    genre_books = {}
    for b in finished:
        g = _normalize_genre(b.genre)
        genre_counts[g] = genre_counts.get(g, 0) + 1
        genre_books.setdefault(g, []).append(b.title)

    months = {}
    month_books = {}
    for b in finished:
        if b.date_finished:
            key = b.date_finished.strftime('%Y-%m')
            months[key] = months.get(key, 0) + 1
            month_books.setdefault(key, []).append(b.title)

    longest = max(finished, key=lambda b: b.pages or 0) if finished else None
    top_genre = max(genre_counts, key=genre_counts.get) if genre_counts else None

    most_quoted = None
    if finished:
        quoted = [(b, len(b.quotes)) for b in finished if b.quotes]
        if quoted:
            most_quoted = max(quoted, key=lambda x: x[1])

    return jsonify({
        'total_books': len(all_books),
        'total_finished': len(finished),
        'total_pages': sum(b.pages or 0 for b in finished),
        'genre_counts': genre_counts,
        'genre_books': genre_books,
        'books_per_month': months,
        'month_books': month_books,
        'available_years': available_years,
        'wrapped': {
            'top_genre': top_genre,
            'longest': {'title': longest.title, 'pages': longest.pages} if longest else None,
            'most_quoted': {'title': most_quoted[0].title, 'count': most_quoted[1]} if most_quoted else None,
            'total_pages': sum(b.pages or 0 for b in finished),
            'total_finished': len(finished),
        },
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001)
