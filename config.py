import os

class Config:
    BASEDIR = os.path.abspath(os.path.dirname(__file__))

    # If DATABASE_URL is set (Render/production), use PostgreSQL
    # Otherwise fall back to local SQLite
    _db_url = os.environ.get('DATABASE_URL', '')
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = _db_url or 'sqlite:///' + os.path.join(BASEDIR, 'library.db')

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
