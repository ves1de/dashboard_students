const express = require('express');
const { getDb } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const db = getDb();

router.get('/', (req, res) => {
	const { groupName } = req.query;
	let rows;
	if (groupName) {
		rows = db
			.prepare(
				`SELECT * FROM schedules WHERE groupName = ? ORDER BY
				 CASE dayOfWeek WHEN 'mon' THEN 1 WHEN 'tue' THEN 2 WHEN 'wed' THEN 3 WHEN 'thu' THEN 4 WHEN 'fri' THEN 5 WHEN 'sat' THEN 6 WHEN 'sun' THEN 7 END,
				 startTime`
			)
			.all(groupName);
	} else {
		rows = db
			.prepare(
				`SELECT * FROM schedules ORDER BY
				 CASE dayOfWeek WHEN 'mon' THEN 1 WHEN 'tue' THEN 2 WHEN 'wed' THEN 3 WHEN 'thu' THEN 4 WHEN 'fri' THEN 5 WHEN 'sat' THEN 6 WHEN 'sun' THEN 7 END,
				 startTime`
			)
			.all();
	}
	res.json(rows);
});

// Create schedule row (admin only)
router.post('/create', requireRole('admin'), (req, res) => {
	const dayOfWeek = (req.body.dayOfWeek || '').trim();
	const startTime = (req.body.startTime || '').trim();
	const endTime = (req.body.endTime || '').trim();
	const subject = (req.body.subject || '').trim();
	const groupName = (req.body.groupName || '').trim();
	const room = (req.body.room || '').trim();
	const teacherName = (req.body.teacherName || '').trim();
	if (!dayOfWeek || !startTime || !endTime || !subject || !groupName) {
		return res.status(400).send('Заполните обязательные поля');
	}
	if (!/^\d{4}$/.test(groupName)) {
		return res.status(400).send('Группа должна быть в формате 4 цифры (например, 3011)');
	}
	db.prepare(
		`INSERT INTO schedules (dayOfWeek, startTime, endTime, subject, groupName, room, teacherName)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(dayOfWeek, startTime, endTime, subject, groupName, room || null, teacherName || null);
	res.redirect('/dashboard');
});

// Update schedule row (admin only)
router.post('/:id/update', requireRole('admin'), (req, res) => {
	const { id } = req.params;
	const dayOfWeek = (req.body.dayOfWeek || '').trim();
	const startTime = (req.body.startTime || '').trim();
	const endTime = (req.body.endTime || '').trim();
	const subject = (req.body.subject || '').trim();
	const groupNameRaw = req.body.groupName;
	const room = req.body.room !== undefined ? String(req.body.room).trim() : undefined;
	const teacherName = req.body.teacherName !== undefined ? String(req.body.teacherName).trim() : undefined;
	const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(Number(id));
	if (!row) return res.status(404).send('Не найдено');
	const groupName = groupNameRaw === undefined ? undefined : String(groupNameRaw).trim();
	if (groupName && !/^\d{4}$/.test(groupName)) {
		return res.status(400).send('Группа должна быть в формате 4 цифры (например, 3011)');
	}
	db.prepare(
		`UPDATE schedules SET dayOfWeek = ?, startTime = ?, endTime = ?, subject = ?, groupName = ?, room = ?, teacherName = ? WHERE id = ?`
	).run(
		dayOfWeek || row.dayOfWeek,
		startTime || row.startTime,
		endTime || row.endTime,
		subject || row.subject,
		groupName || row.groupName,
		room !== undefined ? room : row.room,
		teacherName !== undefined ? teacherName : row.teacherName,
		Number(id)
	);
	res.redirect('/dashboard');
});

// Delete schedule row (admin only)
router.post('/:id/delete', requireRole('admin'), (req, res) => {
	const { id } = req.params;
	db.prepare('DELETE FROM schedules WHERE id = ?').run(Number(id));
	res.redirect('/dashboard');
});

module.exports = router;
