// Cookie Consent Banner - LGPD Compliant
(function() {
    'use strict';
    
    const COOKIE_NAME = 'jean-tech-cookies-consent';
    const COOKIE_EXPIRY_DAYS = 365;
    
    // Check if consent was already given
    function hasConsent() {
        return document.cookie
            .split('; ')
            .find(row => row.startsWith(COOKIE_NAME + '='))
            ?.split('=')[1] === 'accepted';
    }
    
    // Set consent cookie
    function setConsent(value) {
        const date = new Date();
        date.setTime(date.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
        document.cookie = `${COOKIE_NAME}=${value}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
    }
    
    // Create cookie banner
    function createCookieBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-banner-content">
                <div class="cookie-text">
                    <p>🍪 Este site utiliza cookies para melhorar sua experiência de navegação e analisar o uso do site. Ao continuar navegando, você concorda com nossa <a href="#politica-cookies" class="cookie-link">Política de Cookies</a> e com o processamento de dados conforme a LGPD.</p>
                </div>
                <div class="cookie-buttons">
                    <button id="cookie-accept" class="cookie-btn cookie-accept">Aceitar</button>
                    <button id="cookie-reject" class="cookie-btn cookie-reject">Recusar</button>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #cookie-consent-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: var(--bg-primary, #ffffff);
                border-top: 3px solid var(--primary-green, #2d5a27);
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                padding: 1rem;
                animation: slideUp 0.3s ease-out;
            }
            
            @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
            
            .cookie-banner-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                gap: 1rem;
                flex-wrap: wrap;
            }
            
            .cookie-text {
                flex: 1;
                min-width: 300px;
            }
            
            .cookie-text p {
                margin: 0;
                font-size: 0.9rem;
                line-height: 1.4;
                color: var(--text-primary, #343a40);
            }
            
            .cookie-link {
                color: var(--primary-green, #2d5a27);
                text-decoration: underline;
            }
            
            .cookie-link:hover {
                color: var(--secondary-green, #4a7c59);
            }
            
            .cookie-buttons {
                display: flex;
                gap: 0.5rem;
                flex-shrink: 0;
            }
            
            .cookie-btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                font-size: 0.9rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 80px;
            }
            
            .cookie-accept {
                background: var(--primary-green, #2d5a27);
                color: white;
            }
            
            .cookie-accept:hover {
                background: var(--secondary-green, #4a7c59);
                transform: translateY(-1px);
            }
            
            .cookie-reject {
                background: transparent;
                color: var(--text-secondary, #6c757d);
                border: 1px solid var(--border-color, #dee2e6);
            }
            
            .cookie-reject:hover {
                background: var(--bg-secondary, #f8f9fa);
                border-color: var(--text-secondary, #6c757d);
            }
            
            @media (max-width: 768px) {
                .cookie-banner-content {
                    flex-direction: column;
                    align-items: stretch;
                    text-align: center;
                }
                
                .cookie-buttons {
                    justify-content: center;
                    margin-top: 0.5rem;
                }
            }
            
            /* Dark mode */
            @media (prefers-color-scheme: dark) {
                #cookie-consent-banner {
                    background: var(--bg-primary, #1a1a1a);
                    border-top-color: var(--primary-green, #4a7c59);
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(banner);
        
        // Add event listeners
        document.getElementById('cookie-accept').addEventListener('click', function() {
            setConsent('accepted');
            removeBanner();
            // Initialize analytics after consent
            if (typeof window.initAnalytics === 'function') {
                window.initAnalytics();
            }
        });
        
        document.getElementById('cookie-reject').addEventListener('click', function() {
            setConsent('rejected');
            removeBanner();
        });
    }
    
    // Remove banner
    function removeBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.style.animation = 'slideDown 0.3s ease-out';
            setTimeout(() => banner.remove(), 300);
        }
    }
    
    // Initialize
    function init() {
        if (!hasConsent() && !document.getElementById('cookie-consent-banner')) {
            // Show banner after a short delay to avoid blocking initial render
            setTimeout(createCookieBanner, 1000);
        } else if (hasConsent() && getCookieValue() === 'accepted') {
            // Initialize analytics if consent was previously given
            if (typeof window.initAnalytics === 'function') {
                window.initAnalytics();
            }
        }
    }
    
    // Get cookie value
    function getCookieValue() {
        return document.cookie
            .split('; ')
            .find(row => row.startsWith(COOKIE_NAME + '='))
            ?.split('=')[1];
    }
    
    // Expose for external use
    window.cookieConsent = {
        hasConsent: () => getCookieValue() === 'accepted',
        showBanner: createCookieBanner,
        reset: () => {
            setConsent('');
            location.reload();
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Add slide down animation
    const slideDownStyle = document.createElement('style');
    slideDownStyle.textContent = `
        @keyframes slideDown {
            from { transform: translateY(0); }
            to { transform: translateY(100%); }
        }
    `;
    document.head.appendChild(slideDownStyle);
    
})();
