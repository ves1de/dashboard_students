const express = require('express');
const dayjs = require('dayjs');
const { getDb } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const db = getDb();

function scheduleGroupMatches(scheduleId, groupName) {
	const row = db.prepare('SELECT groupName FROM schedules WHERE id = ?').get(scheduleId);
	return row && row.groupName === groupName;
}

// List assignments (teacher sees own, admin sees all, student denied)
router.get('/', (req, res) => {
	const user = req.session.user;
	if (user.role === 'teacher') {
		const rows = db
			.prepare(
				`SELECT a.*, COALESCE(a.subjectText, s.subject) AS displaySubject,
				        s.dayOfWeek, s.startTime, s.endTime, s.groupName
				 FROM assignments a JOIN schedules s ON s.id = a.scheduleId
				 WHERE a.createdByUserId = ?
				 ORDER BY a.dueDate`
			)
			.all(user.id);
		return res.json(rows);
	}
	if (user.role === 'admin') {
		const rows = db
			.prepare(
				`SELECT a.*, COALESCE(a.subjectText, s.subject) AS displaySubject,
				        s.dayOfWeek, s.startTime, s.endTime, s.groupName
				 FROM assignments a JOIN schedules s ON s.id = a.scheduleId
				 ORDER BY a.dueDate`
			)
			.all();
		return res.json(rows);
	}
	return res.status(403).json({ error: 'Forbidden' });
});

// Create assignment (teacher only)
router.post('/create', requireRole('teacher'), (req, res) => {
	const user = req.session.user;
	const scheduleId = Number(req.body.scheduleId);
	const groupName = (req.body.groupName || '').trim();
	const subjectText = (req.body.subjectText || '').trim();
	const homework = (req.body.homework || '').trim();
	const dueDate = (req.body.dueDate || '').trim();
	if (!scheduleId || !groupName || !subjectText || !homework || !dueDate) {
		return res.status(400).send('Заполните все поля');
	}
	if (!/^\d{4}$/.test(groupName)) {
		return res.status(400).send('Группа должна быть в формате 4 цифры (например, 3011)');
	}
	if (!scheduleGroupMatches(Number(scheduleId), groupName)) {
		return res.status(400).send('Выбранная пара не соответствует указанной группе');
	}
	db.prepare(
		`INSERT INTO assignments (scheduleId, homework, dueDate, createdByUserId, subjectText)
		 VALUES (?, ?, ?, ?, ?)`
	).run(Number(scheduleId), homework, dayjs(dueDate).toISOString(), user.id, subjectText);
	res.redirect('/dashboard');
});

// Update assignment (teacher only, author-only)
router.post('/:id/update', requireRole('teacher'), (req, res) => {
	const user = req.session.user;
	const { id } = req.params;
	const { homework, dueDate, extendedDueDate, extendedPenalty, subjectText } = req.body;
	const row = db
		.prepare(`SELECT * FROM assignments WHERE id = ?`)
		.get(Number(id));
	if (!row) return res.status(404).send('Не найдено');
	if (row.createdByUserId !== user.id) return res.status(403).send('Можно редактировать только свои ДЗ');
	db.prepare(
		`UPDATE assignments SET homework = ?, dueDate = ?, extendedDueDate = ?, extendedPenalty = ?, subjectText = ? WHERE id = ?`
	).run(
		homework || row.homework,
		dueDate ? dayjs(dueDate).toISOString() : row.dueDate,
		extendedDueDate ? dayjs(extendedDueDate).toISOString() : null,
		extendedPenalty ? Number(extendedPenalty) : null,
		subjectText || row.subjectText,
		Number(id)
	);
	res.redirect('/dashboard');
});

// Delete assignment (teacher only, author-only)
router.post('/:id/delete', requireRole('teacher'), (req, res) => {
	const user = req.session.user;
	const { id } = req.params;
	const row = db.prepare(`SELECT * FROM assignments WHERE id = ?`).get(Number(id));
	if (!row) return res.status(404).send('Не найдено');
	if (row.createdByUserId !== user.id) return res.status(403).send('Можно удалять только свои ДЗ');
	db.prepare('DELETE FROM assignments WHERE id = ?').run(Number(id));
	res.redirect('/dashboard');
});

module.exports = router;
