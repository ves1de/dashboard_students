const express = require('express');
const dayjs = require('dayjs');
const { getDb } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const db = getDb();

// List events (all roles can view)
router.get('/', (req, res) => {
	const rows = db
		.prepare(
			`SELECT e.*, s.dayOfWeek, s.startTime, s.endTime, s.subject, s.groupName
			 FROM events e LEFT JOIN schedules s ON s.id = e.scheduleId
			 ORDER BY e.date, e.startTime`
		)
		.all();
	res.json(rows);
});

// Create event (admin only)
router.post('/create', requireRole('admin'), (req, res) => {
	const { title, description, date, startTime, endTime, scheduleId, groupName } = req.body;
	if (!title || !date || !startTime || !endTime) {
		return res.status(400).send('Заполните обязательные поля');
	}
	db.prepare(
		`INSERT INTO events (title, description, date, startTime, endTime, scheduleId, groupName)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(
		title,
		description || null,
		dayjs(date).format('YYYY-MM-DD'),
		startTime,
		endTime,
		scheduleId ? Number(scheduleId) : null,
		groupName || null
	);
	res.redirect('/dashboard');
});

// Update event (admin only)
router.post('/:id/update', requireRole('admin'), (req, res) => {
	const { id } = req.params;
	const { title, description, date, startTime, endTime, scheduleId, groupName } = req.body;
	const row = db.prepare('SELECT * FROM events WHERE id = ?').get(Number(id));
	if (!row) return res.status(404).send('Не найдено');
	db.prepare(
		`UPDATE events SET title = ?, description = ?, date = ?, startTime = ?, endTime = ?, scheduleId = ?, groupName = ? WHERE id = ?`
	).run(
		title || row.title,
		description !== undefined ? description : row.description,
		date ? dayjs(date).format('YYYY-MM-DD') : row.date,
		startTime || row.startTime,
		endTime || row.endTime,
		scheduleId ? Number(scheduleId) : null,
		groupName || null,
		Number(id)
	);
	res.redirect('/dashboard');
});

// Delete event (admin only)
router.post('/:id/delete', requireRole('admin'), (req, res) => {
	const { id } = req.params;
	db.prepare('DELETE FROM events WHERE id = ?').run(Number(id));
	res.redirect('/dashboard');
});

module.exports = router;
