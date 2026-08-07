// ==========================================
// QUANTUM NIMBUS UNIVERSAL ANIMATIONS SYSTEM
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Intersection Observer for Scroll Reveals
    const revealElements = document.querySelectorAll(
        '.reveal-on-scroll, .reveal-left-on-scroll, .reveal-right-on-scroll, .reveal-scale-on-scroll, .feature-card-reveal, .card-reveal'
    );

    if (revealElements.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -40px 0px',
            threshold: 0.1
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const parent = entry.target.parentElement;
                    let delay = 0;
                    if (parent && parent.hasAttribute('data-stagger')) {
                        const siblings = Array.from(parent.children);
                        const index = siblings.indexOf(entry.target);
                        if (index > -1) {
                            delay = index * 100;
                        }
                    }

                    setTimeout(() => {
                        entry.target.classList.add('is-revealed');
                        entry.target.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                        entry.target.classList.remove('opacity-0', 'translate-y-8', 'translate-y-6', 'scale-95');
                    }, delay);

                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach((el) => {
            revealObserver.observe(el);
        });
    }

    // 2. Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});
