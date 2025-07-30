const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const marked = require('marked');
const mustache = require('mustache');
// const sharp = require('sharp');
// const CleanCSS = require('clean-css');
// const { minify } = require('terser');
const PDFGenerator = require('../utils/pdf-generator');

class SiteBuilder {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.contentDir = path.join(this.rootDir, 'content');
        this.srcDir = path.join(this.rootDir, 'src');
        this.distDir = path.join(this.rootDir, 'dist');
        this.templatesDir = path.join(this.srcDir, 'templates');
        this.pdfGenerator = new PDFGenerator();
        this.baseUrl = '/tech'; // GitHub Pages base URL
        
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
            // Clean up Puppeteer browser instance
            await this.pdfGenerator.close();
        }
    }

    async cleanDist() {
        await fs.emptyDir(this.distDir);
        console.log('🧹 Cleaned dist directory');
    }

    async copyAssets() {
        // Copy CSS without minification (simplified version)
        const cssContent = await fs.readFile(path.join(this.srcDir, 'css/main.css'), 'utf8');
        
        await fs.ensureDir(path.join(this.distDir, 'assets/css'));
        await fs.writeFile(
            path.join(this.distDir, 'assets/css/main.css'), 
            cssContent
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
        
        console.log('📁 Assets copied');
    }

    async copyImages() {
        const imagesDir = path.join(this.contentDir, 'images');
        if (await fs.pathExists(imagesDir)) {
            await fs.copy(imagesDir, path.join(this.distDir, 'assets/images'));
        }
        
        // Copy book covers without optimization (simplified version)
        const booksDir = path.join(this.contentDir, 'books');
        const bookFolders = await fs.readdir(booksDir);
        
        for (const folder of bookFolders) {
            if (folder.startsWith('_')) continue;
            
            const bookPath = path.join(booksDir, folder);
            const stat = await fs.stat(bookPath);
            
            if (stat.isDirectory()) {
                const coverFiles = ['capa.png', 'cover.png', 'capa.jpg', 'cover.jpg'];
                
                for (const coverFile of coverFiles) {
                    const coverPath = path.join(bookPath, coverFile);
                    if (await fs.pathExists(coverPath)) {
                        const outputPath = path.join(this.distDir, 'assets/covers', folder + path.extname(coverFile));
                        await fs.ensureDir(path.dirname(outputPath));
                        
                        // Simple copy without optimization
                        await fs.copy(coverPath, outputPath);
                        break;
                    }
                }
            }
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
                const structure = yaml.load(await fs.readFile(structurePath, 'utf8'));
                
                // Load chapter contents
                const chapters = [];
                for (const chapter of structure.book_structure.chapters) {
                    const chapterPath = path.join(bookDir, chapter.file);
                    if (await fs.pathExists(chapterPath)) {
                        const content = await fs.readFile(chapterPath, 'utf8');
                        const htmlContent = marked.parse(content);
                        
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
                    coverImage: `${this.baseUrl}/assets/covers/${bookItem.id}.jpg`
                });
            }
        }
        
        return books;
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
                const content = await fs.readFile(contentPath, 'utf8');
                const htmlContent = marked.parse(content);
                
                articles.push({
                    ...meta,
                    ...articleItem,
                    content: htmlContent,
                    featuredImage: meta.featured_image ? 
                        `${this.baseUrl}/assets/images/articles/${meta.featured_image.replace('assets/', '')}` : 
                        `${this.baseUrl}/assets/images/articles/default.svg`
                });
            }
        }
        
        return articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async generateHomePage(books, articles) {
        const baseTemplate = await this.loadTemplate('base.html');
        const homeTemplate = await this.loadTemplate('home.html');
        
        const recentBooks = books.slice(0, 2).map(book => ({
            ...book,
            date: this.formatDate(book.date),
            cover_image_alt: book.cover_image_alt || `Capa do livro ${book.title}`
        }));
        
        const recentArticles = articles.slice(0, 3).map(article => ({
            ...article,
            date: this.formatDate(article.date)
        }));
        
        // Render home content first
        const homeData = {
            baseUrl: this.baseUrl,
            recentBooks,
            recentArticles
        };
        const homeContent = mustache.render(homeTemplate, homeData);
        
        // Then render the full page
        const data = {
            meta_title: 'Jean Meira - Arquitetura de Software e Liderança Técnica',
            meta_description: 'Conteúdo técnico sobre arquitetura de software, liderança e desenvolvimento para profissionais de tecnologia',
            canonical_url: 'https://jeanmeira.github.io/tech/',
            og_type: 'website',
            schema_type: 'WebSite',
            title: 'Jean Meira',
            description: 'Plataforma de conhecimento técnico',
            date: new Date().toISOString(),
            css_path: `${this.baseUrl}/assets/css/main.css`,
            js_path: `${this.baseUrl}/assets/js/main.js`,
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
                                <a href="/books/${book.slug}/" class="nav-btn" style="display: inline-block; margin-top: 1rem;">Ler Livro</a>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </div>
        `;
        
        const data = {
            meta_title: 'Livros - Jean Meira',
            meta_description: 'Livros completos sobre arquitetura de software e liderança técnica',
            canonical_url: 'https://jeanmeira.github.io/tech/books/',
            og_type: 'website',
            schema_type: 'WebPage',
            title: 'Livros',
            description: 'Livros completos sobre tecnologia',
            date: new Date().toISOString(),
            css_path: '/assets/css/main.css',
            js_path: '/assets/js/main.js',
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
                    <a href="/">Início</a> > 
                    <a href="/books/">Livros</a> > 
                    <span>${book.title}</span>
                </nav>
                
                <header class="book-header">
                    <img src="${book.coverImage}" alt="${book.cover_image_alt || book.title}" class="book-cover">
                    <h1>${book.title}</h1>
                    ${book.subtitle ? `<p class="book-subtitle">${book.subtitle}</p>` : ''}
                    <p class="book-description">${book.description}</p>
                    
                    <div class="book-downloads">
                        <a href="/books/${book.slug}/downloads/${book.slug}.epub" class="download-btn">Download EPUB</a>
                        <a href="/books/${book.slug}/downloads/${book.slug}.pdf" class="download-btn">Download PDF</a>
                        <a href="/books/${book.slug}/downloads/${book.slug}.mobi" class="download-btn">Download MOBI</a>
                    </div>
                </header>
                
                <section class="book-chapters">
                    <h2>Capítulos</h2>
                    <ol class="chapters-list">
                        ${book.chapters.map(chapter => `
                            <li class="chapter-item">
                                <a href="/books/${book.slug}/${chapter.slug}/" class="chapter-link">
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
            canonical_url: `https://jeanmeira.github.io/tech${book.seo.canonical_url}`,
            og_type: 'book',
            schema_type: 'Book',
            title: book.title,
            description: book.description,
            date: book.date,
            cover_image: `https://jeanmeira.github.io/tech${book.coverImage}`,
            css_path: '/assets/css/main.css',
            js_path: '/assets/js/main.js',
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
        
        // Generate download files (PDF, EPUB, MOBI)
        await this.generateDownloads(book, book.chapters);
    }

    async generateChapterPage(book, chapter, prevChapter, nextChapter) {
        const template = await this.loadTemplate('base.html');
        const chapterDir = path.join(this.distDir, 'books', book.slug, chapter.slug);
        await fs.ensureDir(chapterDir);
        
        const chapterContent = `
            <div class="container">
                <nav class="breadcrumb">
                    <a href="/">Início</a> > 
                    <a href="/books/">Livros</a> > 
                    <a href="/books/${book.slug}/">${book.title}</a> > 
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
                            `<a href="/books/${book.slug}/${prevChapter.slug}/" class="nav-btn">← ${prevChapter.title}</a>` : 
                            '<span></span>'
                        }
                        <a href="/books/${book.slug}/" class="nav-btn">Índice</a>
                        ${nextChapter ? 
                            `<a href="/books/${book.slug}/${nextChapter.slug}/" class="nav-btn">${nextChapter.title} →</a>` : 
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
            canonical_url: `https://jeanmeira.github.io/tech/books/${book.slug}/${chapter.slug}/`,
            og_type: 'article',
            schema_type: 'Article',
            title: chapter.title,
            description: chapter.subtitle || book.description,
            date: book.date,
            css_path: '/assets/css/main.css',
            js_path: '/assets/js/main.js',
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
            
            // Generate EPUB placeholder (for now)
            const epubPlaceholder = `EPUB version of ${book.title} - Coming soon!`;
            await fs.writeFile(path.join(downloadsDir, `${book.slug}.epub`), epubPlaceholder);
            
            // Generate MOBI placeholder (for now)
            const mobiPlaceholder = `MOBI version of ${book.title} - Coming soon!`;
            await fs.writeFile(path.join(downloadsDir, `${book.slug}.mobi`), mobiPlaceholder);
            
            console.log(`✅ Downloads generated for ${book.title}`);
        } catch (error) {
            console.error(`❌ Error generating downloads for ${book.title}:`, error.message);
            // Create fallback placeholder files
            const placeholderContent = `Download for ${book.title} - Generation failed`;
            await fs.writeFile(path.join(downloadsDir, `${book.slug}.epub`), placeholderContent);
            await fs.writeFile(path.join(downloadsDir, `${book.slug}.pdf`), placeholderContent);
            await fs.writeFile(path.join(downloadsDir, `${book.slug}.mobi`), placeholderContent);
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
                                <a href="/articles/${article.slug}/" class="nav-btn" style="display: inline-block; margin-top: 1rem;">Ler Artigo</a>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </div>
        `;
        
        const data = {
            meta_title: 'Artigos - Jean Meira',
            meta_description: 'Artigos sobre arquitetura de software, tecnologia e desenvolvimento',
            canonical_url: 'https://jeanmeira.github.io/tech/articles/',
            og_type: 'website',
            schema_type: 'WebPage',
            title: 'Artigos',
            description: 'Artigos sobre tecnologia',
            date: new Date().toISOString(),
            css_path: '/assets/css/main.css',
            js_path: '/assets/js/main.js',
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
                    <a href="/">Início</a> > 
                    <a href="/articles/">Artigos</a> > 
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
            canonical_url: `https://jeanmeira.github.io/tech${article.seo.canonical_url}`,
            og_type: 'article',
            schema_type: 'Article',
            title: article.title,
            description: article.description,
            date: article.date,
            cover_image: `https://jeanmeira.github.io/tech${article.featuredImage}`,
            css_path: '/assets/css/main.css',
            js_path: '/assets/js/main.js',
            content: articleContent
        };
        
        const html = mustache.render(template, data);
        await fs.writeFile(path.join(articleDir, 'index.html'), html);
    }

    async generateSitemap(books, articles) {
        const baseUrl = 'https://jeanmeira.github.io/tech';
        const urls = [
            { loc: baseUrl, priority: '1.0' },
            { loc: `${baseUrl}/books/`, priority: '0.9' },
            { loc: `${baseUrl}/articles/`, priority: '0.9' }
        ];
        
        // Add book URLs
        books.forEach(book => {
            urls.push({ loc: `${baseUrl}/books/${book.slug}/`, priority: '0.8' });
            book.chapters.forEach(chapter => {
                urls.push({ loc: `${baseUrl}/books/${book.slug}/${chapter.slug}/`, priority: '0.7' });
            });
        });
        
        // Add article URLs
        articles.forEach(article => {
            urls.push({ loc: `${baseUrl}/articles/${article.slug}/`, priority: '0.8' });
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

Sitemap: https://jeanmeira.github.io/tech/sitemap.xml`;
        
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
