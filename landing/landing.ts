/**
 * landing.ts
 * Minimal TypeScript for SLNCity landing page interactions
 */

// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navbarMenu = document.getElementById('navbarMenu');

if (mobileMenuBtn && navbarMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        navbarMenu.classList.toggle('active');
    });

    // Close menu when a link is clicked
    const navLinks = navbarMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navbarMenu.classList.remove('active');
        });
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '') return;

        e.preventDefault();

        const targetElement = document.querySelector(href);
        if (targetElement) {
            const offsetTop = targetElement.offsetTop - 80; // Offset for sticky navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// CTA Button handlers (placeholder for future integration)
const ctaButtons = document.querySelectorAll('.btn-primary, .btn-outline');
ctaButtons.forEach(button => {
    button.addEventListener('click', function () {
        const buttonText = this.textContent.trim();

        // Log button click for analytics
        console.log(`Button clicked: ${buttonText}`);

        // Future: Route to booking/menu page or open modal
        if (buttonText === 'Book a Test') {
            // window.location.href = '/booking';
            alert('Booking system coming soon!');
        } else if (buttonText === 'View Test Menu' || buttonText === 'Browse Full Test Menu') {
            // window.location.href = '/tests';
            alert('Test menu will open here!');
        }
    });
});

// Intersection Observer for fade-in animations on scroll
const observerOptions: IntersectionObserverInit = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe feature cards and service cards for animation
document.querySelectorAll('.feature-card, .service-card').forEach(card => {
    card.classList.add('fade-in');
    observer.observe(card);
});

// Add fade-in class for CSS animation
const style = document.createElement('style');
style.textContent = `
    .fade-in {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }

    .fade-in.visible {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(style);

// Detect mobile viewport for responsive behavior
const isMobile = (): boolean => {
    return window.innerWidth <= 768;
};

// Handle window resize
window.addEventListener('resize', () => {
    if (!isMobile() && navbarMenu) {
        navbarMenu.classList.remove('active');
    }
});

console.log('SLNCity Diagnostics landing page loaded successfully!');
