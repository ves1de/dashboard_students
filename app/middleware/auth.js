function requireAuth(req, res, next) {
	if (!req.session || !req.session.user) {
		return res.redirect('/login');
	}
	next();
}

function requireRole(...roles) {
	return (req, res, next) => {
		const user = req.session && req.session.user;
		if (!user) return res.redirect('/login');
		if (!roles.includes(user.role)) {
			return res.status(403).render('forbidden', { title: 'Доступ запрещён' });
		}
		next();
	};
}

module.exports = { requireAuth, requireRole };
