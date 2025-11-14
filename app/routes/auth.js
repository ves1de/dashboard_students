const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../db');

const router = express.Router();
const db = getDb();

// Landing page: choice login/register
router.get('/', (req, res) => {
	if (req.session.user) return res.redirect('/dashboard');
	res.render('index', { title: 'Добро пожаловать' });
});

router.get('/login', (req, res) => {
	if (req.session.user) return res.redirect('/dashboard');
	res.render('login', { title: 'Войти', error: null });
});

router.post('/login', async (req, res) => {
	const { login, password } = req.body;
	try {
		const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
		if (!user) {
			return res.status(400).render('login', { title: 'Войти', error: 'Неверный логин или пароль' });
		}
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) {
			return res.status(400).render('login', { title: 'Войти', error: 'Неверный логин или пароль' });
		}
		req.session.user = {
			id: user.id,
			role: user.role,
			fullName: user.fullName,
			groupName: user.groupName,
			subject: user.subject,
		};
		res.redirect('/dashboard');
	} catch (e) {
		console.error(e);
		res.status(500).render('login', { title: 'Войти', error: 'Ошибка сервера' });
	}
});

router.get('/register', (req, res) => {
	if (req.session.user) return res.redirect('/dashboard');
	res.render('register_choice', { title: 'Регистрация' });
});

router.get('/register/student', (req, res) => {
	res.render('register_student', { title: 'Регистрация студента', error: null });
});

router.get('/register/teacher', (req, res) => {
	res.render('register_teacher', { title: 'Регистрация преподавателя', error: null });
});

router.get('/register/admin', (req, res) => {
	res.render('register_admin', { title: 'Регистрация администратора', error: null });
});

router.post('/register/student', async (req, res) => {
	const { fullName, groupName, email, login, password } = req.body;
	if (!fullName || !groupName || !email || !login || !password) {
		return res.status(400).render('register_student', { title: 'Регистрация студента', error: 'Заполните все поля' });
	}
	try {
		const passwordHash = await bcrypt.hash(password, 10);
		db.prepare(
			`INSERT INTO users (role, fullName, email, login, passwordHash, groupName)
			 VALUES ('student', ?, ?, ?, ?, ?)`
		).run(fullName, email, login, passwordHash, groupName);
		const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
		req.session.user = {
			id: user.id,
			role: user.role,
			fullName: user.fullName,
			groupName: user.groupName,
			subject: user.subject,
		};
		res.redirect('/dashboard');
	} catch (e) {
		const errMsg = e && e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Такой логин или email уже существует' : 'Ошибка сервера';
		res.status(400).render('register_student', { title: 'Регистрация студента', error: errMsg });
	}
});

router.post('/register/teacher', async (req, res) => {
	const { fullName, subject, email, login, password, phone } = req.body;
	if (!fullName || !subject || !email || !login || !password) {
		return res.status(400).render('register_teacher', { title: 'Регистрация преподавателя', error: 'Заполните все обязательные поля' });
	}
	try {
		const passwordHash = await bcrypt.hash(password, 10);
		db.prepare(
			`INSERT INTO users (role, fullName, email, login, passwordHash, subject, phone)
			 VALUES ('teacher', ?, ?, ?, ?, ?, ?)`
		).run(fullName, email, login, passwordHash, subject, phone || null);
		const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
		req.session.user = {
			id: user.id,
			role: user.role,
			fullName: user.fullName,
			groupName: user.groupName,
			subject: user.subject,
		};
		res.redirect('/dashboard');
	} catch (e) {
		const errMsg = e && e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Такой логин или email уже существует' : 'Ошибка сервера';
		res.status(400).render('register_teacher', { title: 'Регистрация преподавателя', error: errMsg });
	}
});

router.post('/register/admin', async (req, res) => {
	const { fullName, email, login, password } = req.body;
	if (!fullName || !email || !login || !password) {
		return res.status(400).render('register_admin', { title: 'Регистрация администратора', error: 'Заполните все поля' });
	}
	try {
		const passwordHash = await bcrypt.hash(password, 10);
		db.prepare(
			`INSERT INTO users (role, fullName, email, login, passwordHash)
			 VALUES ('admin', ?, ?, ?, ?)`
		).run(fullName, email, login, passwordHash);
		const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
		req.session.user = {
			id: user.id,
			role: user.role,
			fullName: user.fullName,
			groupName: user.groupName,
			subject: user.subject,
		};
		res.redirect('/dashboard');
	} catch (e) {
		const errMsg = e && e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Такой логин или email уже существует' : 'Ошибка сервера';
		res.status(400).render('register_admin', { title: 'Регистрация администратора', error: errMsg });
	}
});

router.get('/logout', (req, res) => {
	req.session.destroy(() => {
		res.redirect('/login');
	});
});

module.exports = router;
