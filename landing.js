document.addEventListener("DOMContentLoaded", (event) => {
    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger);

    // Only apply animations if we are not authenticated. 
    // Usually the landing page redirects before this, but just in case.
    if (localStorage.getItem('xai_logged_in') === 'true') {
        return;
    }

    // --- Navbar Blur/Solid Effect ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(10, 10, 15, 0.8)';
            navbar.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        } else {
            navbar.style.background = 'transparent';
            navbar.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        }
    });

    // --- GSAP Hero Animations ---
    const tl = gsap.timeline();

    tl.fromTo(".fade-up", 
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out" }
    );

    // --- Smooth Scrolling for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // --- On-Scroll Reveal (Features & Steps) ---
    const revealElements = document.querySelectorAll('.block-reveal, .feature-box, .sidereveal');

    revealElements.forEach((el) => {
        let startProps = { opacity: 0, y: 50 };
        if (el.classList.contains('sidereveal')) {
            startProps = { opacity: 0, x: -50 };
        }
        
        let delay = 0;
        if (el.classList.contains('delay-1')) delay = 0.15;
        if (el.classList.contains('delay-2')) delay = 0.3;
        if (el.classList.contains('delay-3')) delay = 0.45;

        gsap.fromTo(el, 
            startProps, 
            {
                opacity: 1,
                x: 0,
                y: 0,
                duration: 0.8,
                delay: delay,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: el,
                    start: "top 85%", 
                    toggleActions: "play none none none" 
                }
            }
        );
    });
});
