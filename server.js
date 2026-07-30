const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const typingRoutes = require('./routes/typingRoutes');
const db = require('./models/db');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', typingRoutes);

db.initialize();

app.listen(PORT, () => {
  console.log(`Typing Practice Server running on http://localhost:${PORT}`);
});
