// Copyright (c) 2026 Quantum Nimbus Tech. All Rights Reserved.

if (typeof tailwind !== 'undefined') {
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    nimbusBase:   '#0c0f17',
                    nimbusSurface:'#111827',
                    nimbusBorder: '#1e2d3d',
                    nimbusText:   '#8b9cb5',
                    accentBlue:   '#3b82f6',
                    accentRed:    '#ef4444',
                    accentGreen:  '#10b981',
                },
                fontFamily: {
                    sans:    ['Inter', 'sans-serif'],
                    heading: ['Outfit', 'sans-serif'],
                }
            }
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function(e) {
            const target = document.querySelector(this.getAttribute("href"));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: "smooth" });
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
