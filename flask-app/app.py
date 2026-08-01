"""TypingTest - Flask backend.

Run:  .venv\\Scripts\\python app.py   (then open http://127.0.0.1:5000)
"""

import json
import os
import secrets
import sqlite3
from datetime import datetime

from flask import (Flask, abort, flash, g, jsonify, redirect, render_template,
                   request, session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash

import compare

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'database', 'typing.db')
SECRET_FILE = os.path.join(BASE_DIR, 'database', 'secret.key')

app = Flask(__name__)
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

if os.environ.get('SECRET_KEY'):
    app.secret_key = os.environ['SECRET_KEY']
else:
    os.makedirs(os.path.dirname(SECRET_FILE), exist_ok=True)
    if not os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, 'w') as f:
            f.write(secrets.token_hex(32))
    with open(SECRET_FILE) as f:
        app.secret_key = f.read().strip()


# ---------------------------------------------------------------- database
def get_db():
    if 'db' not in g:
        os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    db.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT 'Untitled',
            original_text TEXT NOT NULL,
            typed_text TEXT NOT NULL,
            duration_seconds REAL NOT NULL,
            words_expected INTEGER NOT NULL,
            words_typed INTEGER NOT NULL,
            correct_words INTEGER NOT NULL,
            wrong_words INTEGER NOT NULL,
            missing_words INTEGER NOT NULL,
            extra_words INTEGER NOT NULL,
            gross_wpm REAL NOT NULL,
            net_wpm REAL NOT NULL,
            word_accuracy REAL NOT NULL,
            char_accuracy REAL NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_tests_user ON tests(user_id, created_at);
    ''')
    db.commit()


# ---------------------------------------------------------------- auth utils
def current_user():
    uid = session.get('user_id')
    if not uid:
        return None
    row = get_db().execute('SELECT id, username, email, created_at FROM users WHERE id = ?', (uid,)).fetchone()
    return dict(row) if row else None


def login_required(view):
    from functools import wraps

    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get('user_id'):
            flash('Please log in to continue.', 'warning')
            return redirect(url_for('login', next=request.path))
        return view(*args, **kwargs)
    return wrapped


def user_context():
    return {'user': current_user()}


# ---------------------------------------------------------------- pages
@app.route('/')
def home():
    ctx = user_context()
    if ctx['user']:
        db = get_db()
        row = db.execute(
            'SELECT COUNT(*) AS n, MAX(net_wpm) AS best, '
            'ROUND(AVG(net_wpm), 1) AS avg_net FROM tests WHERE user_id = ?',
            (ctx['user']['id'],)).fetchone()
        ctx['stats'] = {'count': row['n'], 'best_net_wpm': row['best'], 'avg_net_wpm': row['avg_net']}
    return render_template('home.html', **ctx)


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if session.get('user_id'):
        return redirect(url_for('home'))
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm', '')

        if not username or not password:
            error = 'Username and password are required.'
        elif len(password) < 6:
            error = 'Password must be at least 6 characters.'
        elif password != confirm:
            error = 'Passwords do not match.'
        else:
            db = get_db()
            exists = db.execute('SELECT id FROM users WHERE username = ? OR (email != "" AND email = ?)',
                                (username, email)).fetchone()
            if exists:
                error = 'Username or email is already taken.'
            else:
                cur = db.execute(
                    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                    (username, email, generate_password_hash(password)))
                db.commit()
                session['user_id'] = cur.lastrowid
                flash('Account created. Welcome!', 'success')
                return redirect(url_for('home'))
    return render_template('auth/signup.html', error=error)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('user_id'):
        return redirect(url_for('home'))
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        db = get_db()
        row = db.execute('SELECT * FROM users WHERE username = ? OR email = ?', (username, username)).fetchone()
        if row and check_password_hash(row['password_hash'], password):
            session['user_id'] = row['id']
            flash('Logged in.', 'success')
            nxt = request.args.get('next') or url_for('home')
            return redirect(nxt)
        error = 'Invalid username or password.'
    return render_template('auth/login.html', error=error)


@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out.', 'success')
    return redirect(url_for('home'))


@app.route('/input', methods=['GET', 'POST'])
@login_required
def input_page():
    if request.method == 'POST':
        title = request.form.get('title', '').strip() or 'Untitled'
        text = request.form.get('text', '').strip()
        if len(text) < 10:
            flash('Reference text is too short (minimum 10 characters).', 'danger')
            return render_template('input.html', title=title, text=text, **user_context())
        session['typing_reference'] = text
        session['typing_title'] = title
        return redirect(url_for('typing_page'))
    return render_template('input.html', title='', text='', **user_context())


@app.route('/typing')
@login_required
def typing_page():
    ref = session.get('typing_reference')
    if not ref:
        flash('Enter a reference passage first.', 'warning')
        return redirect(url_for('input_page'))
    return render_template('typing.html', reference=ref, title=session.get('typing_title', 'Untitled'),
                           user=current_user())


@app.route('/result/<int:test_id>')
@login_required
def result_page(test_id):
    db = get_db()
    row = db.execute('SELECT * FROM tests WHERE id = ? AND user_id = ?',
                     (test_id, session['user_id'])).fetchone()
    if not row:
        abort(404)
    data = dict(row)
    stats = compare.compute_result(data['original_text'], data['typed_text'], data['duration_seconds'])
    rating = compare.rating_for_net_wpm(data['net_wpm'])
    return render_template('result.html', test=data, stats=stats, rating=rating, user=current_user())


@app.route('/history')
@login_required
def history_page():
    db = get_db()
    rows = db.execute(
        'SELECT * FROM tests WHERE user_id = ? ORDER BY created_at DESC, id DESC',
        (session['user_id'],)).fetchall()
    tests = [dict(r) for r in rows]
    for t in tests:
        t['rating'] = compare.rating_for_net_wpm(t['net_wpm'])
    summary = None
    if tests:
        best = max(tests, key=lambda t: t['net_wpm'])
        avg = sum(t['net_wpm'] for t in tests) / len(tests)
        total_correct = sum(t['correct_words'] for t in tests)
        total_wrong = sum(t['wrong_words'] for t in tests)
        total_expected = sum(t['words_expected'] for t in tests)
        summary = {
            'count': len(tests),
            'best_net_wpm': best['net_wpm'],
            'best_id': best['id'],
            'avg_net_wpm': round(avg, 1),
            'total_correct': total_correct,
            'total_wrong': total_wrong,
            'overall_word_accuracy': round(total_correct / total_expected * 100, 1) if total_expected else 0,
        }
    return render_template('history.html', tests=tests, summary=summary, user=current_user())


# ---------------------------------------------------------------- api
@app.route('/api/tests', methods=['POST'])
@login_required
def api_save_test():
    payload = request.get_json(silent=True) or {}
    typed_text = str(payload.get('typed_text', ''))
    duration_seconds = float(payload.get('duration_seconds', 0) or 0)

    original_text = payload.get('original_text') or session.get('typing_reference')
    title = payload.get('title') or session.get('typing_title') or 'Untitled'

    if not original_text or duration_seconds <= 0:
        return jsonify({'error': 'Missing text or duration.'}), 400

    stats = compare.compute_result(original_text, typed_text, duration_seconds)

    db = get_db()
    cur = db.execute(
        '''INSERT INTO tests
           (user_id, title, original_text, typed_text, duration_seconds,
            words_expected, words_typed, correct_words, wrong_words,
            missing_words, extra_words, gross_wpm, net_wpm,
            word_accuracy, char_accuracy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (session['user_id'], title, original_text, typed_text, stats['duration_seconds'],
         stats['words_expected'], stats['words_typed'], stats['correct_words'],
         stats['wrong_words'], stats['missing_words'], stats['extra_words'],
         stats['gross_wpm'], stats['net_wpm'], stats['word_accuracy'], stats['char_accuracy']))
    db.commit()

    return jsonify({'id': cur.lastrowid, 'net_wpm': stats['net_wpm'], 'gross_wpm': stats['gross_wpm']})


@app.route('/api/tests/<int:test_id>', methods=['DELETE'])
@login_required
def api_delete_test(test_id):
    db = get_db()
    cur = db.execute('DELETE FROM tests WHERE id = ? AND user_id = ?', (test_id, session['user_id']))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({'error': 'Not found.'}), 404
    return jsonify({'ok': True})


@app.route('/api/users/<int:user_id>/export')
@login_required
def api_export(user_id):
    if user_id != session['user_id']:
        abort(403)
    db = get_db()
    rows = db.execute('SELECT * FROM tests WHERE user_id = ? ORDER BY id', (user_id,)).fetchall()
    return jsonify([dict(r) for r in rows])


with app.app_context():
    init_db()


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
