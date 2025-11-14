const path = require('path');
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');

const { requireAuth } = require('./middleware/auth');

// Initialize database and seed
const { initializeDatabase } = require('./db');
initializeDatabase();

const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const scheduleRouter = require('./routes/schedule');
const assignmentsRouter = require('./routes/assignments');
const eventsRouter = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
	session({
		secret: process.env.SESSION_SECRET || 'please-change-this-secret',
		resave: false,
		saveUninitialized: false,
		cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 hours
	})
);

// Expose user to views
app.use((req, res, next) => {
	res.locals.currentUser = req.session.user || null;
	next();
});

// Routes
app.use('/', authRouter);
app.use('/dashboard', requireAuth, dashboardRouter);
app.use('/api/schedule', requireAuth, scheduleRouter);
app.use('/schedule', requireAuth, scheduleRouter);
app.use('/assignments', requireAuth, assignmentsRouter);
app.use('/events', requireAuth, eventsRouter);

// Serve hero image from project root if present
app.get('/R.jpg', (req, res) => {
	const rootImagePath = path.join(__dirname, '..', 'R.jpg');
	res.sendFile(rootImagePath, (err) => {
		if (err) {
			res.status(404).end();
		}
	});
});

// 404 fallback
app.use((req, res) => {
	res.status(404).render('not_found', { title: 'Не найдено' });
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
