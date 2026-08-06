// Copyright (c) 2026 Quantum Nimbus Tech. All Rights Reserved.

window.tailwind = window.tailwind || {};
window.tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                nimbusBase:   '#FFFFFF',
                nimbusSurface:'#F8FAFC',
                nimbusBorder: '#E2E8F0',
                nimbusText:   '#334155',
                accentBlue:   '#0284C7',
                accentRed:    '#ef4444',
                accentGreen:  '#047857',
                accentGreenHover: '#065F46',
            },
            fontFamily: {
                sans:    ['Inter', 'sans-serif'],
                heading: ['Outfit', 'sans-serif'],
            }
        }
    }
};

(function() {
    const savedTheme = localStorage.getItem('nimbus_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('nimbus_theme', isDark ? 'dark' : 'light');
}
window.toggleTheme = toggleTheme;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function(e) {
            const href = this.getAttribute("href");
            if (href && href.startsWith('#') && href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: "smooth" });
                }
            }
        });
    });

    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    }
});


