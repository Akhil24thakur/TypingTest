# Typing Practice for Competitive Exams

A professional typing practice website designed for competitive exams where candidates type from printed material (books/paper) rather than on-screen text.

## Features

- **Print-Like Practice**: Reference text disappears before the test starts — type from your physical book or printed paper
- **Real Exam Simulation**: 3-2-1 countdown, live WPM tracking, pause/resume support
- **Detailed Analytics**: Gross WPM, Net WPM, Accuracy %, character-level diff comparison
- **Error Highlighting**: Color-coded diff view (green=correct, red=wrong, orange=missing, blue=extra)
- **Test History**: Complete history with statistics, weekly/monthly improvement tracking
- **Themes**: Light, Dark, and Professional Blue modes
- **Export Results**: PDF, CSV, JSON formats
- **Keyboard Shortcuts**: Ctrl+Enter (Finish), Esc (Pause), F11 (Full Screen)
- **Data Security**: Autosave progress, refresh warning, accidental leave prevention

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6)
- **Backend**: Node.js, Express.js
- **Database**: SQLite (via better-sqlite3)
- **Templating**: EJS

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Setup

```bash
# Navigate to the project directory
cd typing-practice

# Install dependencies
npm install

# Start the server
npm start
```

The app will be available at `http://localhost:3000`.

## Usage

1. **Home**: Click "Start New Typing Test"
2. **Input**: Paste the text from your printed material into the textarea
3. **Countdown**: 3-2-1-Go countdown before the test begins
4. **Type**: The reference text disappears — type looking at your printed material
5. **Finish**: Click Finish or press Ctrl+Enter when done
6. **Results**: View detailed metrics, diff comparison, and performance rating
7. **History**: Track progress, view statistics, retake or delete tests

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + Enter | Finish Test |
| Esc | Pause / Resume |
| F11 | Full Screen |

## Timer Modes

- Unlimited
- 5 min
- 10 min
- 15 min
- 30 min
- Custom

## Project Structure

```
typing-practice/
├── server.js              # Express server entry point
├── package.json
├── README.md
├── database/
│   └── typing.db          # SQLite database (auto-created)
├── models/
│   ├── db.js              # Database connection & setup
│   └── TypingTest.js      # Test data model
├── controllers/
│   ├── comparisonEngine.js # Text comparison & metrics engine
│   └── typingController.js # Request handlers
├── routes/
│   └── typingRoutes.js    # Express routes
├── views/
│   ├── index.ejs          # Home page
│   ├── input.ejs          # Text input page
│   ├── typing.ejs         # Typing screen
│   ├── result.ejs         # Results dashboard
│   └── history.ejs        # History & statistics
├── public/
│   ├── css/
│   │   └── styles.css     # Complete stylesheet
│   └── js/
│       └── main.js        # Client-side application logic
└── images/
```

## License

MIT
