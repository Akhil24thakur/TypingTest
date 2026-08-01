# ⚡ TypingTest — Python rebuild

Competitive-exam typing practice. Reference text stays **hidden** during the test (you type from your printed sheet), and your speed is scored with **Net WPM** — wrong words are deducted.

## Net WPM (the core metric)

- **Gross WPM** = (total characters typed / 5) ÷ minutes
- **Net WPM** = (total words typed − wrong words) ÷ minutes = correct words per minute
- A word is **wrong** if it does not exactly match the reference word at that position (includes extra words typed beyond the reference).
- Rating grade (A–E) is based on Net WPM.

## Features

- Signup / login / logout with hashed passwords (werkzeug), session-based auth
- Per-user test history with best / average Net WPM and overall accuracy
- Hidden-reference typing test with live **Net WPM**, Gross WPM, time and wrong-word counters
- 3-2-1-GO countdown, pause/resume, reset, draft autosave, Ctrl+Enter to finish
- Word-level breakdown (correct / wrong / missing / extra) plus LCS character diff on the result page
- Light / dark theme toggle

## Requirements

- Python 3.10+

## Run

```bash
cd flask-app
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS/Linux

.venv\Scripts\python app.py    # Windows
# .venv/bin/python app.py      # macOS/Linux
```

Open http://127.0.0.1:5000 — sign up, paste a reference passage, start typing.

The secret key is stored in `database/secret.key` (auto-generated) and the SQLite database at `database/typing.db` (auto-created). Set the `SECRET_KEY` environment variable to override.

## Project layout

```
flask-app/
  app.py            Flask routes + auth + SQLite
  compare.py        Scoring algorithm (Gross WPM, Net WPM, accuracy)
  templates/        Jinja2 pages (home, auth, input, typing, result, history)
  static/js/        typing engine (live Net WPM) + LCS diff renderer
  static/css/       theme + layout styles
  database/         typing.db + secret.key (auto-generated, gitignored)
```
