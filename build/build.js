const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const marked = require('marked');
const mustache = require('mustache');
// const sharp = require('sharp');
// const CleanCSS = require('clean-css');
// const { minify } = require('terser');
const PDFGenerator = require('../utils/pdf-generator');
const EPUBGenerator = require('../utils/epub-generator');

class SiteBuilder {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.contentDir = path.join(this.rootDir, 'content');
        this.srcDir = path.join(this.rootDir, 'src');
        this.distDir = path.join(this.rootDir, 'dist');
        this.templatesDir = path.join(this.srcDir, 'templates');
        this.pdfGenerator = new PDFGenerator();
        this.epubGenerator = new EPUBGenerator();
        
        // Environment-based configuration
        this.isProduction = process.env.NODE_ENV === 'production' || process.env.GITHUB_ACTIONS === 'true';
        this.baseUrl = this.isProduction ? '/tech' : '';
        this.fullBaseUrl = this.isProduction ? 'https://jeanmeira.github.io/tech' : 'http://localhost:8001';
        
        // Configure marked for better HTML output
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            headerPrefix: '',
        });
    }

    async build() {
        console.log('🚀 Starting build process...');
        
        try {
            // Clean and prepare dist directory
            await this.cleanDist();
            await this.copyAssets();
            
            // Load content data
            const books = await this.loadBooks();
            const articles = await this.loadArticles();
            
            // Generate pages
            await this.generateHomePage(books, articles);
            await this.generateBooksPages(books);
            await this.generateArticlesPages(articles);
            
            // Generate additional files
            await this.generateSitemap(books, articles);
            await this.generateRobotsTxt();
            
            console.log('✅ Build completed successfully!');
        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        } finally {
            // PDF Generator cleanup (no longer needed with PDFKit)
            console.log('PDF Generator: Cleanup complete');
        }
    }

    async cleanDist() {
        await fs.emptyDir(this.distDir);
        console.log('🧹 Cleaned dist directory');
    }

    async copyAssets() {
        // Copy CSS files
        const cssContent = await fs.readFile(path.join(this.srcDir, 'css/main.css'), 'utf8');
        const nonCriticalCssContent = await fs.readFile(path.join(this.srcDir, 'css/non-critical.css'), 'utf8');
        
        await fs.ensureDir(path.join(this.distDir, 'assets/css'));
        
        // Combine CSS files for the main.css
        const combinedCss = cssContent + '\n' + nonCriticalCssContent;
        await fs.writeFile(
            path.join(this.distDir, 'assets/css/main.css'), 
            combinedCss
        );
        
        // Copy JS without minification (simplified version)
        const jsContent = await fs.readFile(path.join(this.srcDir, 'js/main.js'), 'utf8');
        
        await fs.ensureDir(path.join(this.distDir, 'assets/js'));
        await fs.writeFile(
            path.join(this.distDir, 'assets/js/main.js'), 
            jsContent
        );
        
        // Copy images without optimization (simplified version)
        await this.copyImages();
        
        // Copy favicons
        await this.copyFavicons();
        
        // Copy book and article assets
        await this.copyContentAssets();
        
        // Copy Google Search Console verification file
        await this.copyGoogleVerification();
        
        console.log('📁 Assets copied');
    }

    async copyImages() {
        const imagesDir = path.join(this.contentDir, 'images');
        if (await fs.pathExists(imagesDir)) {
            await fs.copy(imagesDir, path.join(this.distDir, 'assets/images'));
        }
    }

    async copyFavicons() {
        // Copy favicon.png from src root as favicon.ico
        const faviconPng = path.join(this.srcDir, 'favicon.png');
        if (await fs.pathExists(faviconPng)) {
            await fs.copy(faviconPng, path.join(this.distDir, 'favicon.ico'));
        }

        // Copy favicon assets
        const faviconAssetsDir = path.join(this.srcDir, 'assets/favicon');
        if (await fs.pathExists(faviconAssetsDir)) {
            await fs.copy(faviconAssetsDir, path.join(this.distDir, 'assets/favicon'));
        }

        // Also copy favicon.png to assets/favicon
        if (await fs.pathExists(faviconPng)) {
            await fs.ensureDir(path.join(this.distDir, 'assets/favicon'));
            await fs.copy(faviconPng, path.join(this.distDir, 'assets/favicon/favicon.png'));
        }
    }

    async copyContentAssets() {
        // Copy book assets
        const booksDir = path.join(this.contentDir, 'books');
        if (await fs.pathExists(booksDir)) {
            const bookFolders = await fs.readdir(booksDir);
            
            for (const folder of bookFolders) {
                if (folder.startsWith('_')) continue;
                
                const bookPath = path.join(booksDir, folder);
                const stat = await fs.stat(bookPath);
                
                if (stat.isDirectory()) {
                    // Only copy assets for published books
                    const metaPath = path.join(bookPath, 'meta.yml');
                    let meta = null;
                    if (await fs.pathExists(metaPath)) {
                        try {
                            meta = yaml.load(await fs.readFile(metaPath, 'utf8'));
                        } catch (e) {
                            console.warn(`Failed to read meta for book ${folder}:`, e.message || e);
                        }
                    }

                    if (!meta || meta.published !== true) {
                        // Skip copying assets for unpublished books
                        continue;
                    }

                    // Copia pasta assets se existir
                    const assetsPath = path.join(bookPath, 'assets');
                    if (await fs.pathExists(assetsPath)) {
                        const destPath = path.join(this.distDir, 'assets/books', folder, 'assets');
                        await fs.copy(assetsPath, destPath);
                    }
                    
                    // Copia arquivos de imagem diretos (capa.png, cover.png, etc.)
                    const files = await fs.readdir(bookPath);
                    for (const file of files) {
                        if (file.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
                            const srcFile = path.join(bookPath, file);
                            const destFile = path.join(this.distDir, 'assets/books', folder, file);
                            await fs.ensureDir(path.dirname(destFile));
                            await fs.copy(srcFile, destFile);
                        }
                    }
                }
            }
        }

        // Copy article assets
        const articlesDir = path.join(this.contentDir, 'articles');
        if (await fs.pathExists(articlesDir)) {
            const articleFolders = await fs.readdir(articlesDir);
            
            for (const folder of articleFolders) {
                if (folder.startsWith('_')) continue;
                
                const articlePath = path.join(articlesDir, folder);
                const stat = await fs.stat(articlePath);
                
                if (stat.isDirectory()) {
                    // Only copy assets for published articles
                    const metaPath = path.join(articlePath, 'meta.yml');
                    let meta = null;
                    if (await fs.pathExists(metaPath)) {
                        try {
                            meta = yaml.load(await fs.readFile(metaPath, 'utf8'));
                        } catch (e) {
                            console.warn(`Failed to read meta for article ${folder}:`, e.message || e);
                        }
                    }

                    if (!meta || meta.published !== true) {
                        continue; // skip unpublished article assets
                    }

                    const assetsPath = path.join(articlePath, 'assets');
                    if (await fs.pathExists(assetsPath)) {
                        const destPath = path.join(this.distDir, 'assets/articles', folder, 'assets');
                        await fs.copy(assetsPath, destPath);
                    }
                }
            }
        }
    }

    async copyGoogleVerification() {
        const googleVerificationFile = 'googlee26ca5db80bf77ae.html';
        const sourcePath = path.join(this.srcDir, googleVerificationFile);
        const destPath = path.join(this.distDir, googleVerificationFile);
        
        if (await fs.pathExists(sourcePath)) {
            await fs.copy(sourcePath, destPath);
            console.log('🔍 Google Search Console verification file copied');
        } else {
            console.log('⚠️  Google Search Console verification file not found in src/');
        }
    }

    async loadBooks() {
        const booksMetaPath = path.join(this.contentDir, 'books/_meta.yml');
        const booksMetaContent = await fs.readFile(booksMetaPath, 'utf8');
        const booksMeta = yaml.load(booksMetaContent);
        
        const books = [];
        
        for (const bookItem of booksMeta.books.items) {
            const bookDir = path.join(this.contentDir, 'books', bookItem.id);
            const metaPath = path.join(bookDir, 'meta.yml');
            const structurePath = path.join(bookDir, 'structure.yml');
            
            if (await fs.pathExists(metaPath) && await fs.pathExists(structurePath)) {
                const meta = yaml.load(await fs.readFile(metaPath, 'utf8'));
                
                // Filtra apenas livros publicados
                if (meta.published !== true) {
                    continue;
                }
                
                const structure = yaml.load(await fs.readFile(structurePath, 'utf8'));
                
                // Load chapter contents
                const chapters = [];
                for (const chapter of structure.book_structure.chapters) {
                    const chapterPath = path.join(bookDir, chapter.file);
                    if (await fs.pathExists(chapterPath)) {
                        let content = await fs.readFile(chapterPath, 'utf8');
                        
                        // Processa as referências de assets no conteúdo do capítulo
                        content = this.processContentAssets(content, 'books', bookItem.id);
                        let htmlContent = marked.parse(content);
                        
                        // Remove the first H1 tag to avoid duplication with template header
                        htmlContent = htmlContent.replace(/^<h1[^>]*>.*?<\/h1>\s*/i, '');
                        
                        chapters.push({
                            ...chapter,
                            content: htmlContent,
                            slug: this.generateSlug(chapter.title)
                        });
                    }
                }
                
                books.push({
                    ...meta,
                    ...bookItem,
                    chapters,
                    coverImage: `${this.baseUrl}/assets/images/${bookItem.id}.png`
                });
            }
        }
        
        return books;
    }

    // Processa conteúdo convertendo referências de assets para URLs corretas
    processContentAssets(content, type, id) {
        // Converte referências locais de assets para o caminho correto no site
        return content.replace(/assets\/([^"'\s)]+)/g, `${this.baseUrl}/assets/${type}/${id}/assets/$1`);
    }

    async loadArticles() {
        const articlesMetaPath = path.join(this.contentDir, 'articles/_meta.yml');
        const articlesMetaContent = await fs.readFile(articlesMetaPath, 'utf8');
        const articlesMeta = yaml.load(articlesMetaContent);
        
        const articles = [];
        
        for (const articleItem of articlesMeta.articles.items) {
            const articleDir = path.join(this.contentDir, 'articles', articleItem.id);
            const metaPath = path.join(articleDir, 'meta.yml');
            const contentPath = path.join(articleDir, 'content.md');
            
            if (await fs.pathExists(metaPath) && await fs.pathExists(contentPath)) {
                const meta = yaml.load(await fs.readFile(metaPath, 'utf8'));
                
                // Filtra apenas artigos publicados
                if (meta.published !== true) {
                    continue;
                }
                
                let content = await fs.readFile(contentPath, 'utf8');
                
                // Processa as referências de assets no conteúdo
                content = this.processContentAssets(content, 'articles', articleItem.id);
                const htmlContent = marked.parse(content);
                
                articles.push({
                    ...meta,
                    ...articleItem,
                    content: htmlContent,
                    featuredImage: `${this.baseUrl}/assets/images/${articleItem.id}.png`
                });
            }
        }
        
        return articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async generateHomePage(books, articles) {
        const baseTemplate = await this.loadTemplate('base.html');
        const homeTemplate = await this.loadTemplate('home.html');
        
        const allBooks = books.map(book => ({
            ...book,
            date: this.formatDate(book.date),
            cover_image_alt: book.cover_image_alt || `Capa do livro ${book.title}`
        }));
        
        const allArticles = articles.map(article => ({
            ...article,
            date: this.formatDate(article.date)
        }));
        
        // Render home content first
        const homeData = {
            baseUrl: this.baseUrl,
            allBooks,
            allArticles
        };
        const homeContent = mustache.render(homeTemplate, homeData);
        
        // Then render the full page
        const data = {
            meta_title: 'Jean Meira - TECH - Arquitetura de Software e Liderança Técnica',
            meta_description: 'Conteúdo técnico sobre arquitetura de software, liderança e desenvolvimento para profissionais de tecnologia',
            canonical_url: `${this.fullBaseUrl}/`,
            og_type: 'website',
            schema_type: 'WebSite',
            title: 'Jean Meira - TECH',
            description: 'Plataforma de conhecimento técnico',
            date: new Date().toISOString(),
            css_path: `${this.baseUrl}/assets/css/main.css`,
            js_path: `${this.baseUrl}/assets/js/main.js`,
            baseUrl: this.baseUrl,
            content: homeContent
        };
        
        const html = mustache.render(baseTemplate, data);
        await fs.writeFile(path.join(this.distDir, 'index.html'), html);
        
        console.log('🏠 Generated home page');
    }

    async generateBooksPages(books) {
        await fs.ensureDir(path.join(this.distDir, 'books'));
        
        // Books index page
        await this.generateBooksIndex(books);
        
        // Individual book pages
        for (const book of books) {
            await this.generateBookPage(book);
            await this.generateBookChapters(book);
        }
        
        console.log(`📚 Generated ${books.length} book pages`);
    }

    async generateBooksIndex(books) {
        const template = await this.loadTemplate('base.html');
        
        const booksContent = `
            <div class="container">
                <header class="page-header">
                    <h1>Livros</h1>
                    <p>Conteúdo completo sobre arquitetura de software e liderança técnica</p>
                </header>
                
                <div class="items-grid">
                    ${books.map(book => `
                        <article class="card">
                            <img src="${book.coverImage}" alt="${book.cover_image_alt || book.title}" class="card-image" loading="lazy">
                            <div class="card-content">
                                <h2 class="card-title">${book.title}</h2>
                                <p class="card-subtitle">${book.subtitle || ''}</p>
                                <p class="card-description">${book.description}</p>
                                <div class="card-meta">
                                    <span>${this.formatDate(book.date)}</span> • 
                                    <span>${book.chapters.length} capítulos</span>
                                </div>
                                <a href="${this.baseUrl}/books/${book.slug}/" class="nav-btn" style="display: inline-block; margin-top: 1rem;">Ler Livro</a>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </div>
        `;
        
        const data = {
            meta_title: 'Livros - Jean Meira - TECH',
            meta_description: 'Livros completos sobre arquitetura de software e liderança técnica',
            canonical_url: `${this.fullBaseUrl}/books/`,
            og_type: 'website',
            schema_type: 'WebPage',
            title: 'Livros',
            description: 'Livros completos sobre tecnologia',
            date: new Date().toISOString(),
            css_path: `${this.baseUrl}/assets/css/main.css`,
            js_path: `${this.baseUrl}/assets/js/main.js`,
            baseUrl: this.baseUrl,
            content: booksContent
        };
        
        const html = mustache.render(template, data);
        await fs.writeFile(path.join(this.distDir, 'books/index.html'), html);
    }

    async generateBookPage(book) {
        const template = await this.loadTemplate('base.html');
        const bookDir = path.join(this.distDir, 'books', book.slug);
        await fs.ensureDir(bookDir);
        
        const bookContent = `
            <div class="container">
                <nav class="breadcrumb">
                    <a href="${this.baseUrl}/">Início</a> > 
                    <a href="${this.baseUrl}/books/">Livros</a> > 
                    <span>${book.title}</span>
                </nav>
                
                <header class="book-header">
                    <img src="${book.coverImage}" alt="${book.cover_image_alt || book.title}" class="book-cover">
                    <div class="book-info">
                        <h1>${book.title}</h1>
                        ${book.subtitle ? `<p class="book-subtitle">${book.subtitle}</p>` : ''}
                        <p class="book-description">${book.description}</p>
                        
                        <div class="book-downloads">
                            <a href="${this.baseUrl}/books/${book.slug}/downloads/${book.slug}.epub" class="download-btn">Download EPUB</a>
                            <a href="${this.baseUrl}/books/${book.slug}/downloads/${book.slug}.pdf" class="download-btn">Download PDF</a>
                        </div>
                    </div>
                </header>
                
                <section class="book-chapters">
                    <h2>Capítulos</h2>
                    <ol class="chapters-list">
                        ${book.chapters.map(chapter => `
                            <li class="chapter-item">
                                <a href="${this.baseUrl}/books/${book.slug}/${chapter.slug}/" class="chapter-link">
                                    <div class="chapter-number">Capítulo ${chapter.number}</div>
                                    <div class="chapter-title">${chapter.title}</div>
                                    ${chapter.subtitle ? `<div class="chapter-subtitle">${chapter.subtitle}</div>` : ''}
                                </a>
                            </li>
                        `).join('')}
                    </ol>
                </section>
            </div>
        `;
        
        const data = {
            meta_title: book.seo.meta_title,
            meta_description: book.seo.meta_description,
            canonical_url: `${this.fullBaseUrl}${book.seo.canonical_url}`,
            og_type: 'book',
            schema_type: 'Book',
            title: book.title,
            description: book.description,
            date: book.date,
            cover_image: `${this.fullBaseUrl}${book.coverImage}`,
            css_path: `${this.baseUrl}/assets/css/main.css`,
            js_path: `${this.baseUrl}/assets/js/main.js`,
            baseUrl: this.baseUrl,
            content: bookContent
        };
        
        const html = mustache.render(template, data);
        await fs.writeFile(path.join(bookDir, 'index.html'), html);
    }

    async generateBookChapters(book) {
        const bookDir = path.join(this.distDir, 'books', book.slug);
        
        for (let i = 0; i < book.chapters.length; i++) {
            const chapter = book.chapters[i];
            const prevChapter = i > 0 ? book.chapters[i - 1] : null;
            const nextChapter = i < book.chapters.length - 1 ? book.chapters[i + 1] : null;
            
            await this.generateChapterPage(book, chapter, prevChapter, nextChapter);
        }
        
        // Generate download files (PDF, EPUB)
        await this.generateDownloads(book, book.chapters);
    }

    async generateChapterPage(book, chapter, prevChapter, nextChapter) {
        const template = await this.loadTemplate('base.html');
        const chapterDir = path.join(this.distDir, 'books', book.slug, chapter.slug);
        await fs.ensureDir(chapterDir);
        
        const chapterContent = `
            <div class="container">
                <nav class="breadcrumb">
                    <a href="${this.baseUrl}/">Início</a> > 
                    <a href="${this.baseUrl}/books/">Livros</a> > 
                    <a href="${this.baseUrl}/books/${book.slug}/">${book.title}</a> > 
                    <span>${chapter.title}</span>
                </nav>
                
                <article class="chapter-content">
                    <header class="chapter-header">
                        <div class="chapter-number">Capítulo ${chapter.number}</div>
                        <h1>${chapter.title}</h1>
                        ${chapter.subtitle ? `<p class="chapter-subtitle">${chapter.subtitle}</p>` : ''}
                    </header>
                    
                    <div class="content">
                        ${chapter.content}
                    </div>
                    
                    <nav class="chapter-nav">
                        ${prevChapter ? 
                            `<a href="${this.baseUrl}/books/${book.slug}/${prevChapter.slug}/" class="nav-btn">← ${prevChapter.title}</a>` : 
                            '<span></span>'
                        }
                        <a href="${this.baseUrl}/books/${book.slug}/" class="nav-btn">Índice</a>
                        ${nextChapter ? 
                            `<a href="${this.baseUrl}/books/${book.slug}/${nextChapter.slug}/" class="nav-btn">${nextChapter.title} →</a>` : 
                            '<span></span>'
                        }
                    </nav>
                </article>
                
                <section class="comments-section">
                    <h3>Comentários</h3>
                    <script src="https://utteranc.es/client.js"
                            repo="jeanmeira/tech"
                            issue-term="pathname"
                            theme="github-light"
                            crossorigin="anonymous"
                            async>
                    </script>
                </section>
            </div>
        `;
        
        const data = {
            meta_title: `${chapter.title} - ${book.title}`,
            meta_description: chapter.subtitle || book.description,
            canonical_url: `${this.fullBaseUrl}/books/${book.slug}/${chapter.slug}/`,
            og_type: 'article',
            schema_type: 'Article',
            title: chapter.title,
            description: chapter.subtitle || book.description,
            date: book.date,
            css_path: `${this.baseUrl}/assets/css/main.css`,
            js_path: `${this.baseUrl}/assets/js/main.js`,
            baseUrl: this.baseUrl,
            content: chapterContent
        };
        
        const html = mustache.render(template, data);
        await fs.writeFile(path.join(chapterDir, 'index.html'), html);
    }

    async generateDownloads(book, chapters) {
        const downloadsDir = path.join(this.distDir, 'books', book.slug, 'downloads');
        await fs.ensureDir(downloadsDir);
        
        console.log(`📄 Generating downloads for ${book.title}...`);
        
        try {
            // Generate PDF
            const pdfPath = path.join(downloadsDir, `${book.slug}.pdf`);
            await this.pdfGenerator.generateBookPDF(book, chapters, pdfPath);
            
            // Generate EPUB
            const epubPath = path.join(downloadsDir, `${book.slug}.epub`);
            await this.epubGenerator.generateBookEPUB(book, chapters, epubPath);
            
            console.log(`✅ Downloads generated for ${book.title}`);
        } catch (error) {
            console.error(`❌ Error generating downloads for ${book.title}:`, error.message);
            // Create fallback placeholder files
            const placeholderContent = `Download for ${book.title} - Generation failed`;
            await fs.writeFile(path.join(downloadsDir, `${book.slug}.epub`), placeholderContent);
            await fs.writeFile(path.join(downloadsDir, `${book.slug}.pdf`), placeholderContent);
        }
    }

    async generateArticlesPages(articles) {
        await fs.ensureDir(path.join(this.distDir, 'articles'));
        
        // Articles index page
        await this.generateArticlesIndex(articles);
        
        // Individual article pages
        for (const article of articles) {
            await this.generateArticlePage(article);
        }
        
        console.log(`📝 Generated ${articles.length} article pages`);
    }

    async generateArticlesIndex(articles) {
        const template = await this.loadTemplate('base.html');
        
        const articlesContent = `
            <div class="container">
                <header class="page-header">
                    <h1>Artigos</h1>
                    <p>Análises e reflexões sobre tecnologia e desenvolvimento</p>
                </header>
                
                <div class="items-grid">
                    ${articles.map(article => `
                        <article class="card">
                            <img src="${article.featuredImage}" alt="${article.title}" class="card-image" loading="lazy">
                            <div class="card-content">
                                <h2 class="card-title">${article.title}</h2>
                                <p class="card-description">${article.description}</p>
                                <div class="card-meta">
                                    <span>${this.formatDate(article.date)}</span>
                                </div>
                                <a href="${this.baseUrl}/articles/${article.slug}/" class="nav-btn" style="display: inline-block; margin-top: 1rem;">Ler Artigo</a>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </div>
        `;
        
        const data = {
            meta_title: 'Artigos - Jean Meira - TECH',
            meta_description: 'Artigos sobre arquitetura de software, tecnologia e desenvolvimento',
            canonical_url: `${this.fullBaseUrl}/articles/`,
            og_type: 'website',
            schema_type: 'WebPage',
            title: 'Artigos',
            description: 'Artigos sobre tecnologia',
            date: new Date().toISOString(),
            css_path: `${this.baseUrl}/assets/css/main.css`,
            js_path: `${this.baseUrl}/assets/js/main.js`,
            baseUrl: this.baseUrl,
            content: articlesContent
        };
        
        const html = mustache.render(template, data);
        await fs.writeFile(path.join(this.distDir, 'articles/index.html'), html);
    }

    async generateArticlePage(article) {
        const template = await this.loadTemplate('base.html');
        const articleDir = path.join(this.distDir, 'articles', article.slug);
        await fs.ensureDir(articleDir);
        
        const articleContent = `
            <div class="container">
                <nav class="breadcrumb">
                    <a href="${this.baseUrl}/">Início</a> > 
                    <a href="${this.baseUrl}/articles/">Artigos</a> > 
                    <span>${article.title}</span>
                </nav>
                
                <article class="article-content">
                    <header class="article-header">
                        <h1>${article.title}</h1>
                        <div class="article-meta">
                            <span>Por Jean Meira</span> • 
                            <span>${this.formatDate(article.date)}</span>
                        </div>
                        ${article.featuredImage ? `<img src="${article.featuredImage}" alt="${article.title}" class="article-image">` : ''}
                    </header>
                    
                    <div class="content">
                        ${article.content}
                    </div>
                </article>
                
                <section class="comments-section">
                    <h3>Comentários</h3>
                    <script src="https://utteranc.es/client.js"
                            repo="jeanmeira/tech"
                            issue-term="pathname"
                            theme="github-light"
                            crossorigin="anonymous"
                            async>
                    </script>
                </section>
            </div>
        `;
        
        const data = {
            meta_title: article.seo.meta_title,
            meta_description: article.seo.meta_description,
            canonical_url: `${this.fullBaseUrl}${article.seo.canonical_url}`,
            og_type: 'article',
            schema_type: 'Article',
            title: article.title,
            description: article.description,
            date: article.date,
            cover_image: `${this.fullBaseUrl}${article.featuredImage}`,
            css_path: `${this.baseUrl}/assets/css/main.css`,
            js_path: `${this.baseUrl}/assets/js/main.js`,
            baseUrl: this.baseUrl,
            content: articleContent
        };
        
        const html = mustache.render(template, data);
        await fs.writeFile(path.join(articleDir, 'index.html'), html);
    }

    async generateSitemap(books, articles) {
        const urls = [
            { loc: this.fullBaseUrl, priority: '1.0' },
            { loc: `${this.fullBaseUrl}/books/`, priority: '0.9' },
            { loc: `${this.fullBaseUrl}/articles/`, priority: '0.9' }
        ];
        
        // Add book URLs
        books.forEach(book => {
            urls.push({ loc: `${this.fullBaseUrl}/books/${book.slug}/`, priority: '0.8' });
            book.chapters.forEach(chapter => {
                urls.push({ loc: `${this.fullBaseUrl}/books/${book.slug}/${chapter.slug}/`, priority: '0.7' });
            });
        });
        
        // Add article URLs
        articles.forEach(article => {
            urls.push({ loc: `${this.fullBaseUrl}/articles/${article.slug}/`, priority: '0.8' });
        });
        
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
        
        await fs.writeFile(path.join(this.distDir, 'sitemap.xml'), sitemap);
        console.log('🗺️  Generated sitemap.xml');
    }

    async generateRobotsTxt() {
        const robots = `User-agent: *
Allow: /

Sitemap: ${this.fullBaseUrl}/sitemap.xml`;
        
        await fs.writeFile(path.join(this.distDir, 'robots.txt'), robots);
        console.log('🤖 Generated robots.txt');
    }

    async loadTemplate(templateName) {
        const templatePath = path.join(this.templatesDir, templateName);
        return await fs.readFile(templatePath, 'utf8');
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Run builder
if (require.main === module) {
    const builder = new SiteBuilder();
    builder.build();
}

module.exports = SiteBuilder;
