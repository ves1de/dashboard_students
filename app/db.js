const Database = require('better-sqlite3');
const dayjs = require('dayjs');

let db;

function getDb() {
	if (!db) {
		db = new Database(pathForDb());
	}
	return db;
}

function pathForDb() {
	return 'app.db';
}

function columnExists(db, tableName, columnName) {
	const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
	return rows.some((r) => r.name === columnName);
}

function ensureColumn(db, tableName, columnName, columnDef) {
	if (!columnExists(db, tableName, columnName)) {
		db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`).run();
	}
}

function initializeDatabase() {
	const db = getDb();
	// Users table
	db.prepare(
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),
			fullName TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			login TEXT NOT NULL UNIQUE,
			passwordHash TEXT NOT NULL,
			groupName TEXT DEFAULT NULL,
			subject TEXT DEFAULT NULL,
			phone TEXT DEFAULT NULL
		)`
	).run();

	// Schedules table
	db.prepare(
		`CREATE TABLE IF NOT EXISTS schedules (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			dayOfWeek TEXT NOT NULL,
			startTime TEXT NOT NULL,
			endTime TEXT NOT NULL,
			subject TEXT NOT NULL,
			groupName TEXT NOT NULL
		)`
	).run();
	// Add optional metadata
	ensureColumn(db, 'schedules', 'room', 'room TEXT DEFAULT NULL');
	ensureColumn(db, 'schedules', 'teacherName', 'teacherName TEXT DEFAULT NULL');

	// Assignments table (дз)
	db.prepare(
		`CREATE TABLE IF NOT EXISTS assignments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			scheduleId INTEGER NOT NULL,
			homework TEXT NOT NULL,
			dueDate TEXT NOT NULL,
			extendedDueDate TEXT DEFAULT NULL,
			extendedPenalty INTEGER DEFAULT NULL,
			createdByUserId INTEGER NOT NULL,
			FOREIGN KEY(scheduleId) REFERENCES schedules(id) ON DELETE CASCADE,
			FOREIGN KEY(createdByUserId) REFERENCES users(id) ON DELETE CASCADE
		)`
	).run();
	ensureColumn(db, 'assignments', 'createdAt', 'createdAt TEXT DEFAULT (CURRENT_TIMESTAMP)');
	ensureColumn(db, 'assignments', 'subjectText', 'subjectText TEXT DEFAULT NULL');

	// Events table (мероприятия)
	db.prepare(
		`CREATE TABLE IF NOT EXISTS events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT DEFAULT NULL,
			date TEXT NOT NULL,
			startTime TEXT NOT NULL,
			endTime TEXT NOT NULL,
			scheduleId INTEGER DEFAULT NULL,
			groupName TEXT DEFAULT NULL,
			FOREIGN KEY(scheduleId) REFERENCES schedules(id) ON DELETE SET NULL
		)`
	).run();
	ensureColumn(db, 'events', 'createdAt', 'createdAt TEXT DEFAULT (CURRENT_TIMESTAMP)');

	seedScheduleIfEmpty(db);
}

function seedScheduleIfEmpty(db) {
	const countRow = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
	if (countRow.count > 0) return;

	const groups = ['1011', '3011', '3051', '4051'];
	const subjects = ['Философия', 'Математика', 'Физика', 'Программирование'];
	const teacherBySubject = {
		'Философия': 'Спориш М. У.',
		'Математика': 'Иванова А. С.',
		'Физика': 'Петров Н. В.',
		'Программирование': 'Сидоров Д. К.',
	};
	const rooms = ['1-111', '2-203', '3-305', '4-407'];
	const days = ['mon', 'tue', 'wed', 'thu', 'fri'];

	const insert = db.prepare(
		`INSERT INTO schedules (dayOfWeek, startTime, endTime, subject, groupName, room, teacherName)
		 VALUES (@dayOfWeek, @startTime, @endTime, @subject, @groupName, @room, @teacherName)`
	);

	const slots = [
		{ start: '09:00', end: '10:30' },
		{ start: '10:40', end: '12:10' },
		{ start: '12:40', end: '14:10' }, // после обеда
		{ start: '14:20', end: '15:50' },
		{ start: '16:00', end: '17:30' },
		{ start: '17:40', end: '19:10' },
	];

	db.transaction(() => {
		days.forEach((dayName) => {
			groups.forEach((groupName, gi) => {
				subjects.forEach((subject, si) => {
					const slot = slots[(gi + si) % slots.length];
					insert.run({
						dayOfWeek: dayName,
						startTime: slot.start,
						endTime: slot.end,
						subject,
						groupName,
						room: rooms[(gi + si) % rooms.length],
						teacherName: teacherBySubject[subject] || null,
					});
				});
			});
		});
	}).immediate();
}

module.exports = {
	getDb,
	initializeDatabase,
};
