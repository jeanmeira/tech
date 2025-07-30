// Mobile Navigation
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger menu
            const spans = navToggle.querySelectorAll('span');
            spans.forEach((span, index) => {
                span.style.transform = navMenu.classList.contains('active') 
                    ? `rotate(${index === 1 ? 0 : index === 0 ? 45 : -45}deg) translate(${index === 0 ? '5px, 5px' : index === 2 ? '5px, -5px' : '0'})`
                    : 'none';
                span.style.opacity = navMenu.classList.contains('active') && index === 1 ? '0' : '1';
            });
        });
    }
});

// Smooth scrolling for anchor links
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});

// Lazy loading for images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Active navigation link
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkPath = new URL(link.href).pathname;
        
        if (currentPath === linkPath || 
            (currentPath.startsWith(linkPath) && linkPath !== '/')) {
            link.classList.add('active');
        }
    });
}

// Set active nav link on page load
document.addEventListener('DOMContentLoaded', setActiveNavLink);

// Reading progress indicator for chapters
function initReadingProgress() {
    const article = document.querySelector('article .content');
    if (!article) return;
    
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    progressBar.innerHTML = '<div class="reading-progress-bar"></div>';
    
    const progressStyle = document.createElement('style');
    progressStyle.textContent = `
        .reading-progress {
            position: fixed;
            top: 70px;
            left: 0;
            width: 100%;
            height: 3px;
            background: rgba(45, 90, 39, 0.1);
            z-index: 99;
        }
        .reading-progress-bar {
            height: 100%;
            background: var(--primary-green);
            width: 0%;
            transition: width 0.1s ease;
        }
    `;
    
    document.head.appendChild(progressStyle);
    document.body.appendChild(progressBar);
    
    const progressBarFill = progressBar.querySelector('.reading-progress-bar');
    
    function updateProgress() {
        const articleRect = article.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const articleHeight = article.offsetHeight;
        const articleTop = articleRect.top;
        
        const scrolled = Math.max(0, Math.min(1, 
            (windowHeight - articleTop) / (articleHeight + windowHeight)
        ));
        
        progressBarFill.style.width = `${scrolled * 100}%`;
    }
    
    window.addEventListener('scroll', updateProgress);
    updateProgress();
}

// Initialize reading progress for chapter pages
if (document.querySelector('.chapter-content')) {
    document.addEventListener('DOMContentLoaded', initReadingProgress);
}
