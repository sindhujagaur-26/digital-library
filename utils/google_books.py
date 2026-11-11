"""
Open Library search utility.
Searches for books and returns normalized results with English titles and covers.
Uses ISBN-based lookups to get the correct English edition title when the
primary title is in a foreign language.
"""

import re
import requests

SEARCH_URL = 'https://openlibrary.org/search.json'
ISBN_URL = 'https://openlibrary.org/isbn/{}.json'


def _pick_english_isbn(isbns):
    """Prefer ISBN-13s starting with 978-0 or 978-1 (English-language editions)."""
    english_13 = [i for i in isbns if len(i) == 13 and (i.startswith('9780') or i.startswith('9781'))]
    if english_13:
        return english_13[0]
    english_10 = [i for i in isbns if len(i) == 10 and i[0] in ('0', '1')]
    if english_10:
        return english_10[0]
    return isbns[0] if isbns else None


def _looks_foreign(title, query):
    """Check if the title likely isn't English.
    True if it has non-Latin chars OR none of the significant query words appear in it."""
    # Non-Latin script (CJK, Cyrillic, Arabic, etc.)
    if re.search(r'[Ѐ-ӿ؀-ۿ　-鿿가-힯]', title):
        return True
    # If none of the significant query words appear in the title, probably foreign
    query_words = {w for w in query.lower().split() if len(w) > 2}
    title_lower = title.lower()
    return bool(query_words) and not any(w in title_lower for w in query_words)


def _fetch_english_title(isbn):
    """Look up the English edition title via the ISBN editions API."""
    try:
        resp = requests.get(ISBN_URL.format(isbn), timeout=5)
        if resp.ok:
            return resp.json().get('title')
    except requests.RequestException:
        pass
    return None


def search_books(query, max_results=10):
    try:
        resp = requests.get(
            SEARCH_URL,
            params={
                'q': query,
                'limit': max_results,
                'fields': 'title,author_name,first_publish_year,subject,number_of_pages_median,isbn,cover_i,key',
                'language': 'eng',
            },
            timeout=10,
        )
        resp.raise_for_status()
    except requests.RequestException:
        return []

    results = []
    for doc in resp.json().get('docs', []):
        isbns = doc.get('isbn', [])
        isbn = _pick_english_isbn(isbns)

        cover_url = ''
        if isbn:
            cover_url = f'https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg'
        elif doc.get('cover_i'):
            cover_url = f'https://covers.openlibrary.org/b/id/{doc["cover_i"]}-L.jpg'

        title = doc.get('title', 'Unknown')

        # If the title looks foreign, fetch the English edition title from ISBN lookup
        if isbn and _looks_foreign(title, query):
            eng_title = _fetch_english_title(isbn)
            if eng_title:
                title = eng_title

        subjects = doc.get('subject', [])
        genre = subjects[0] if subjects else None

        results.append({
            'title': title,
            'author': ', '.join(doc.get('author_name', ['Unknown'])),
            'year': doc.get('first_publish_year'),
            'genre': genre,
            'pages': doc.get('number_of_pages_median'),
            'cover_url': cover_url,
            'isbn': isbn,
            'description': '',
        })

    return results
