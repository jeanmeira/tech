// Non-critical JavaScript - Lazy loaded features
(function() {
    'use strict';
    
    // Advanced lazy loading for images with IntersectionObserver
    function initAdvancedLazyLoading() {
        if (!('IntersectionObserver' in window)) return;
        
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
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // Enhanced mobile navigation animations
    function initEnhancedNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (!navToggle || !navMenu) return;
        
        // Add hamburger animation
        navToggle.addEventListener('click', function() {
            const spans = navToggle.querySelectorAll('span');
            const isActive = navMenu.classList.contains('active');
            
            spans.forEach((span, index) => {
                span.style.transform = isActive 
                    ? `rotate(${index === 1 ? 0 : index === 0 ? 45 : -45}deg) translate(${index === 0 ? '5px, 5px' : index === 2 ? '5px, -5px' : '0'})`
                    : 'none';
                span.style.opacity = isActive && index === 1 ? '0' : '1';
            });
        });
    }
    
    // Analytics and tracking (non-blocking)
    function initAnalytics() {
        // Placeholder for future analytics code
        // This would load asynchronously without blocking main thread
    }
    
    // Initialize non-critical features after page load
    window.addEventListener('load', function() {
        // Use setTimeout to defer execution to next tick
        setTimeout(() => {
            initAdvancedLazyLoading();
            initEnhancedNavigation();
            initAnalytics();
        }, 100);
    });
    
})();
