const express = require('express');
const dayjs = require('dayjs');
const { getDb } = require('../db');

const router = express.Router();
const db = getDb();

function getMonday(d) {
	const dow = d.day(); // 0=Sun,1=Mon,...
	const delta = (dow + 6) % 7; // convert so Monday -> 0
	return d.subtract(delta, 'day').startOf('day');
}

function getScheduleByGroup(groupName) {
	return db
		.prepare(
			`SELECT * FROM schedules WHERE groupName = ? ORDER BY
			 CASE dayOfWeek WHEN 'mon' THEN 1 WHEN 'tue' THEN 2 WHEN 'wed' THEN 3 WHEN 'thu' THEN 4 WHEN 'fri' THEN 5 WHEN 'sat' THEN 6 WHEN 'sun' THEN 7 END,
			 startTime`
		)
		.all(groupName);
}

function getAllSchedule() {
	return db
		.prepare(
			`SELECT * FROM schedules ORDER BY
			 CASE dayOfWeek WHEN 'mon' THEN 1 WHEN 'tue' THEN 2 WHEN 'wed' THEN 3 WHEN 'thu' THEN 4 WHEN 'fri' THEN 5 WHEN 'sat' THEN 6 WHEN 'sun' THEN 7 END,
			 startTime`
		)
		.all();
}

router.get('/', (req, res) => {
	const user = req.session.user;
	if (!user) return res.redirect('/login');

	// Week navigation
	const amount = Math.max(1, parseInt(req.query.amount) || 1);
	const currOffset = parseInt(req.query.offset) || 0;
	let offset = currOffset;
	if (req.query.dir === 'prev') offset = currOffset - amount;
	if (req.query.dir === 'next') offset = currOffset + amount;
	const weekStart = getMonday(dayjs()).add(offset, 'week');
	const weekEnd = weekStart.add(6, 'day').endOf('day');
	const weekRangeLabel = `${weekStart.format('DD.MM')} – ${weekEnd.format('DD.MM')}`;
	const startDateStr = weekStart.format('YYYY-MM-DD');
	const endDateStr = weekEnd.format('YYYY-MM-DD');
	const startIso = weekStart.toISOString();
	const endIso = weekEnd.toISOString();

	if (user.role === 'student') {
		const schedule = getScheduleByGroup(user.groupName);
		const scheduleIds = schedule.map((s) => s.id);
		const assignments = scheduleIds.length
			? db
					.prepare(
						`SELECT a.*, COALESCE(a.subjectText, s.subject) AS displaySubject,
						        s.dayOfWeek, s.startTime, s.endTime, s.groupName, s.room, s.teacherName,
						        u.email AS teacherEmail, u.fullName AS teacherFullName
						 FROM assignments a
						 JOIN schedules s ON s.id = a.scheduleId
						 LEFT JOIN users u ON u.id = a.createdByUserId
						 WHERE a.scheduleId IN (${scheduleIds.map(() => '?').join(',')})
						   AND a.dueDate >= ? AND a.dueDate <= ?
						 ORDER BY a.dueDate`
					)
					.all(...scheduleIds, startIso, endIso)
			: [];
		const events = scheduleIds.length
			? db
					.prepare(
						`SELECT e.*, s.dayOfWeek, s.startTime, s.endTime, s.subject, s.groupName
						 FROM events e LEFT JOIN schedules s ON s.id = e.scheduleId
						 WHERE (e.scheduleId IN (${scheduleIds.map(() => '?').join(',')}) OR e.groupName IS NULL OR e.groupName = ?)
						   AND e.date >= ? AND e.date <= ?
						 ORDER BY e.date, e.startTime`
					)
					.all(...scheduleIds, user.groupName, startDateStr, endDateStr)
			: db
					.prepare(
						`SELECT e.*, s.dayOfWeek, s.startTime, s.endTime, s.subject, s.groupName
						 FROM events e LEFT JOIN schedules s ON s.id = e.scheduleId
						 WHERE (e.groupName IS NULL OR e.groupName = ?)
						   AND e.date >= ? AND e.date <= ?
						 ORDER BY e.date, e.startTime`
					)
					.all(user.groupName, startDateStr, endDateStr);
		return res.render('dashboard_student', {
			title: 'Дашборд студента',
			schedule,
			assignments,
			events,
			offset,
			amount,
			weekRangeLabel,
		});
	}

	if (user.role === 'teacher') {
		const schedule = getAllSchedule();
		const groups = [...new Set(schedule.map((s) => s.groupName))].sort();
		const myAssignments = db
			.prepare(
				`SELECT a.*, COALESCE(a.subjectText, s.subject) AS displaySubject,
				        s.dayOfWeek, s.startTime, s.endTime, s.groupName, s.room, s.teacherName,
				        u.email AS teacherEmail, u.fullName AS teacherFullName
				 FROM assignments a
				 JOIN schedules s ON s.id = a.scheduleId
				 LEFT JOIN users u ON u.id = a.createdByUserId
				 WHERE a.createdByUserId = ?
				   AND a.dueDate >= ? AND a.dueDate <= ?
				 ORDER BY a.dueDate`
			)
			.all(user.id, startIso, endIso);
		const events = db
			.prepare(
				`SELECT e.*, s.dayOfWeek, s.startTime, s.endTime, s.subject, s.groupName
				 FROM events e LEFT JOIN schedules s ON s.id = e.scheduleId
				 WHERE e.date >= ? AND e.date <= ?
				 ORDER BY e.date, e.startTime`
			)
			.all(startDateStr, endDateStr);
		return res.render('dashboard_teacher', {
			title: 'Дашборд преподавателя',
			schedule,
			groups,
			mySubject: user.subject,
			assignments: myAssignments,
			events,
			offset,
			amount,
			weekRangeLabel,
		});
	}

	if (user.role === 'admin') {
		const schedule = getAllSchedule();
		const events = db
			.prepare(
				`SELECT e.*, s.dayOfWeek, s.startTime, s.endTime, s.subject, s.groupName
				 FROM events e LEFT JOIN schedules s ON s.id = e.scheduleId
				 WHERE e.date >= ? AND e.date <= ?
				 ORDER BY e.date, e.startTime`
			)
			.all(startDateStr, endDateStr);
		return res.render('dashboard_admin', {
			title: 'Дашборд администратора',
			schedule,
			events,
			offset,
			amount,
			weekRangeLabel,
		});
	}

	res.redirect('/');
});

module.exports = router;
