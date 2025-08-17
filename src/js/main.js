// Optimized main.js - Reduced main thread work
(function() {
    'use strict';
    
    // Debounce utility function
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
    
    // Efficient DOM ready
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }
    
    // Mobile Navigation - Lightweight
    ready(function() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', function() {
                navMenu.classList.toggle('active');
            });
        }
    });
    
    // Passive scroll events for better performance
    let ticking = false;
    
    // Reading progress with RAF optimization - Reduced reflow
    function initReadingProgress() {
        const article = document.querySelector('article .content');
        if (!article) return;
        
        // Create progress bar only if needed
        const progressBar = document.createElement('div');
        progressBar.className = 'reading-progress';
        progressBar.innerHTML = '<div class="reading-progress-bar"></div>';
        
        // Inline critical CSS for immediate rendering
        progressBar.style.cssText = `
            position: fixed;
            top: 70px;
            left: 0;
            width: 100%;
            height: 3px;
            background: rgba(45, 90, 39, 0.1);
            z-index: 99;
        `;
        
        const progressBarFill = progressBar.querySelector('.reading-progress-bar');
        progressBarFill.style.cssText = `
            height: 100%;
            background: var(--primary-green);
            width: 0%;
            transition: width 0.1s ease;
        `;
        
        document.body.appendChild(progressBar);
        
        // Cache DOM measurements to reduce reflow
        let articleHeight = 0;
        let windowHeight = 0;
        let resizeTimeout;
        
        function cacheLayoutMetrics() {
            articleHeight = article.offsetHeight;
            windowHeight = window.innerHeight;
        }
        
        // Initial measurement
        cacheLayoutMetrics();
        
        // Optimized scroll handler with RAF - minimal DOM reads
        function updateProgress() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    // Only read getBoundingClientRect, avoid offsetHeight in scroll
                    const articleTop = article.getBoundingClientRect().top;
                    
                    const scrolled = Math.max(0, Math.min(1, 
                        (windowHeight - articleTop) / (articleHeight + windowHeight)
                    ));
                    
                    progressBarFill.style.width = (scrolled * 100) + '%';
                    ticking = false;
                });
                ticking = true;
            }
        }
        
        // Debounced resize handler to recalculate dimensions
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(cacheLayoutMetrics, 250);
        }, { passive: true });
        
        // Debounced scroll listener
        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    }
    
    // Active navigation - Efficient implementation
    function setActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        if (navLinks.length === 0) return;
        
        for (let i = 0; i < navLinks.length; i++) {
            const link = navLinks[i];
            link.classList.remove('active');
            
            const linkPath = new URL(link.href).pathname;
            if (currentPath === linkPath || 
                (currentPath.startsWith(linkPath) && linkPath !== '/')) {
                link.classList.add('active');
                break; // Early exit optimization
            }
        }
    }
    
    // Initialize only what's needed
    ready(setActiveNavLink);
    
    // Conditional loading for chapter pages
    if (document.querySelector('.chapter-content')) {
        ready(initReadingProgress);
    }
    
    // Smooth scrolling with passive events
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'A' && e.target.hash) {
            const targetId = e.target.hash.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
    
})();
