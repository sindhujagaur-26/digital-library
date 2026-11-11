from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()


class Book(db.Model):
    __tablename__ = 'books'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Text, nullable=False)
    author = db.Column(db.Text, nullable=False)
    year = db.Column(db.Integer)
    genre = db.Column(db.Text)
    pages = db.Column(db.Integer)
    cover_url = db.Column(db.Text)
    spine_color = db.Column(db.Text)
    isbn = db.Column(db.Text)
    description = db.Column(db.Text)
    rating = db.Column(db.Float)
    status = db.Column(db.Text, nullable=False, default='want_to_read')
    notes = db.Column(db.Text)
    date_added = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    date_started = db.Column(db.Date)
    date_finished = db.Column(db.Date)
    position = db.Column(db.Integer, nullable=False, default=0)

    quotes = db.relationship('Quote', backref='book', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'author': self.author,
            'year': self.year,
            'genre': self.genre,
            'pages': self.pages,
            'cover_url': self.cover_url,
            'spine_color': self.spine_color,
            'isbn': self.isbn,
            'description': self.description,
            'rating': self.rating,
            'status': self.status,
            'notes': self.notes,
            'date_added': self.date_added.isoformat() if self.date_added else None,
            'date_started': self.date_started.isoformat() if self.date_started else None,
            'date_finished': self.date_finished.isoformat() if self.date_finished else None,
            'position': self.position,
            'quotes': [q.to_dict() for q in self.quotes],
        }


class Quote(db.Model):
    __tablename__ = 'quotes'

    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    page_number = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'text': self.text,
            'page_number': self.page_number,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
