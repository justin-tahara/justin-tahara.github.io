// ===== Navigation Functionality =====
const nav = document.getElementById('nav');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

// Scroll effect for navigation
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Mobile menu toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ===== Smooth Scroll with Offset =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');

            // Stagger animations for child elements
            if (entry.target.classList.contains('achievements')) {
                const cards = entry.target.querySelectorAll('.achievement-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('animate');
                    }, index * 150);
                });
            }

            if (entry.target.classList.contains('timeline')) {
                const items = entry.target.querySelectorAll('.timeline-item');
                items.forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('animate');
                    }, index * 200);
                });
            }

            if (entry.target.classList.contains('hobbies-grid')) {
                const cards = entry.target.querySelectorAll('.hobby-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('animate');
                    }, index * 200);
                });
            }

            if (entry.target.classList.contains('contact-methods')) {
                const cards = entry.target.querySelectorAll('.contact-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('animate');
                    }, index * 150);
                });
            }
        }
    });
}, observerOptions);

// Observe elements for animation
const animateOnScroll = document.querySelectorAll('.section-title, .about-text, .skills-container, .achievements, .timeline, .hobbies-grid, .contact-methods');
animateOnScroll.forEach(el => observer.observe(el));

// ===== Parallax Effect for Hero Background =====
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroBackground = document.querySelector('.hero-background');
    if (heroBackground) {
        heroBackground.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// ===== Cursor Trail Effect (Clouds) =====
let cursorCloudTrail = [];
const cloudTrailLength = 6;

document.addEventListener('mousemove', (e) => {
    if (window.innerWidth > 968) { // Only on desktop
        const cloud = document.createElement('div');
        const size = 22 + Math.random() * 10;
        const tilt = (Math.random() - 0.5) * 16;

        cloud.className = 'cursor-trail cloud';
        cloud.textContent = '☁️';
        cloud.style.cssText = `
            position: fixed;
            font-size: ${size}px;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.9;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            transform: translate(-50%, -50%) rotate(${tilt}deg);
            transition: opacity 0.9s ease, transform 0.9s ease;
            filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12));
        `;

        document.body.appendChild(cloud);
        cursorCloudTrail.push(cloud);

        // Drift upward and fade so the trail feels airy
        requestAnimationFrame(() => {
            cloud.style.opacity = '0';
            cloud.style.transform = `translate(-50%, -65%) rotate(${tilt * 1.5}deg) scale(1.05)`;
        });

        if (cursorCloudTrail.length > cloudTrailLength) {
            const oldCloud = cursorCloudTrail.shift();
            oldCloud.style.opacity = '0';
            setTimeout(() => oldCloud.remove(), 500);
        }

        setTimeout(() => cloud.remove(), 900);
    }
});

// ===== Skill Items Interactive Shuffle =====
const skillItems = document.querySelectorAll('.skill-item');
skillItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateX(5px) scale(1.05)';
    });

    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateX(0) scale(1)';
    });
});

// ===== Timeline Items Reveal Animation =====
const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach((item, index) => {
    item.style.transitionDelay = `${index * 0.1}s`;
});

// ===== Contact Cards Tilt Effect =====
const contactCards = document.querySelectorAll('.contact-card');
contactCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// ===== Achievement Cards Hover Animation =====
const achievementCards = document.querySelectorAll('.achievement-card');
achievementCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) rotate(2deg)';
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) rotate(0)';
    });
});

// ===== Active Section Highlighting in Nav =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ===== Lazy Loading for Images =====
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });

    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
}

// ===== Performance: Debounce Scroll Events =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== Add Smooth Reveal on Page Load =====
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// ===== Console Easter Egg =====
console.log('%c👋 Hey there!', 'font-size: 20px; font-weight: bold; color: #667eea;');
console.log('%cLooking at the code? I like your style! 😎', 'font-size: 14px; color: #764ba2;');
console.log('%cFeel free to reach out: justintahara@gmail.com', 'font-size: 12px; color: #4a5568;');
