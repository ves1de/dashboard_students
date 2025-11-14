(function(){
	function getStoredTheme(){
		try { return localStorage.getItem('theme') || ''; } catch(e){ return ''; }
	}
	function storeTheme(t){
		try { localStorage.setItem('theme', t); } catch(e){}
	}
	function applyTheme(t){
		var theme = (t === 'dark' || t === 'light') ? t : 'light';
		document.documentElement.setAttribute('data-theme', theme);
		storeTheme(theme);
		updateButtons(theme);
	}
	function updateButtons(theme){
		var btns = document.querySelectorAll('#themeToggle');
		btns.forEach(function(b){
			if (!b) return;
			b.textContent = theme === 'dark' ? '☀️' : '🌙';
			b.setAttribute('aria-label', theme === 'dark' ? 'Светлая тема' : 'Тёмная тема');
		});
	}
	function bind(){
		var btns = document.querySelectorAll('#themeToggle');
		btns.forEach(function(b){
			b.addEventListener('click', function(){
				var current = document.documentElement.getAttribute('data-theme') || 'light';
				applyTheme(current === 'dark' ? 'light' : 'dark');
			});
		});
	}
	function init(){
		var preferred = getStoredTheme() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
		applyTheme(preferred);
		bind();
		if (window.matchMedia) {
			try {
				window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e){
					if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
				});
			} catch(e){}
		}
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})(); 
