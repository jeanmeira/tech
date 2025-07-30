const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const marked = require('marked');
const mustache = require('mustache');

class SiteBuilder {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.contentDir = path.join(this.rootDir, 'content');
        this.srcDir = path.join(this.rootDir, 'src');
        this.distDir = path.join(this.rootDir, 'dist');
        this.templatesDir = path.join(this.srcDir, 'templates');
        
        // Configure marked for better HTML output
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    async build() {
        console.log('🚀 Iniciando construção do site...');
        
        try {
            // Limpar e criar diretório de saída
            await fs.emptyDir(this.distDir);
            
            // Copiar assets estáticos
            await this.copyStaticAssets();
            
            // Processar conteúdo
            await this.processContent();
            
            // Gerar páginas principais
            await this.generatePages();
            
            console.log('✅ Site construído com sucesso!');
            console.log(`📁 Arquivos gerados em: ${this.distDir}`);
            
        } catch (error) {
            console.error('❌ Erro na construção:', error);
            throw error;
        }
    }

    async copyStaticAssets() {
        console.log('📄 Copiando assets...');
        
        // Copiar CSS
        const cssSource = path.join(this.srcDir, 'css');
        const cssTarget = path.join(this.distDir, 'css');
        if (await fs.pathExists(cssSource)) {
            await fs.copy(cssSource, cssTarget);
        }
        
        // Copiar JS
        const jsSource = path.join(this.srcDir, 'js');
        const jsTarget = path.join(this.distDir, 'js');
        if (await fs.pathExists(jsSource)) {
            await fs.copy(jsSource, jsTarget);
        }
        
        // Copiar imagens
        const imagesSource = path.join(this.contentDir, 'images');
        const imagesTarget = path.join(this.distDir, 'images');
        if (await fs.pathExists(imagesSource)) {
            await fs.copy(imagesSource, imagesTarget);
        }
    }

    async processContent() {
        console.log('📚 Processando conteúdo...');
        
        // Processar livros
        const booksDir = path.join(this.contentDir, 'books');
        if (await fs.pathExists(booksDir)) {
            const bookDirs = await fs.readdir(booksDir);
            for (const bookDir of bookDirs) {
                if (bookDir.startsWith('_')) continue;
                await this.processBook(bookDir);
            }
        }
        
        // Processar artigos
        const articlesDir = path.join(this.contentDir, 'articles');
        if (await fs.pathExists(articlesDir)) {
            const articleDirs = await fs.readdir(articlesDir);
            for (const articleDir of articleDirs) {
                if (articleDir.startsWith('_')) continue;
                await this.processArticle(articleDir);
            }
        }
    }

    async processBook(bookId) {
        console.log(`📖 Processando livro: ${bookId}`);
        
        const bookDir = path.join(this.contentDir, 'books', bookId);
        const metaPath = path.join(bookDir, 'meta.yml');
        
        if (!await fs.pathExists(metaPath)) {
            console.warn(`⚠️ meta.yml não encontrado para livro: ${bookId}`);
            return;
        }
        
        const meta = yaml.load(await fs.readFile(metaPath, 'utf8'));
        
        // Ler estrutura do livro
        const structurePath = path.join(bookDir, 'structure.yml');
        let structure = null;
        if (await fs.pathExists(structurePath)) {
            structure = yaml.load(await fs.readFile(structurePath, 'utf8'));
        }
        
        // Carregar capítulos
        const chapters = [];
        if (structure && structure.book_structure && structure.book_structure.chapters) {
            for (const chapter of structure.book_structure.chapters) {
                const chapterPath = path.join(bookDir, chapter.file);
                if (await fs.pathExists(chapterPath)) {
                    const content = await fs.readFile(chapterPath, 'utf8');
                    chapters.push({
                        ...chapter,
                        content: marked(content)
                    });
                }
            }
        }
        
        // Gerar página do livro
        await this.generateBookPage(meta, chapters, bookId);
    }

    async processArticle(articleId) {
        console.log(`📝 Processando artigo: ${articleId}`);
        
        const articleDir = path.join(this.contentDir, 'articles', articleId);
        const metaPath = path.join(articleDir, 'meta.yml');
        const contentPath = path.join(articleDir, 'content.md');
        
        if (!await fs.pathExists(metaPath) || !await fs.pathExists(contentPath)) {
            console.warn(`⚠️ Arquivos necessários não encontrados para artigo: ${articleId}`);
            return;
        }
        
        const meta = yaml.load(await fs.readFile(metaPath, 'utf8'));
        const content = await fs.readFile(contentPath, 'utf8');
        
        // Gerar página do artigo
        await this.generateArticlePage(meta, marked(content), articleId);
    }

    async generatePages() {
        console.log('🏠 Gerando páginas principais...');
        
        // Gerar página inicial
        await this.generateHomePage();
        
        // Gerar página de livros
        await this.generateBooksPage();
        
        // Gerar página de artigos
        await this.generateArticlesPage();
    }

    async generateHomePage() {
        const template = await this.loadTemplate('home');
        const content = {
            title: 'Tech Content Hub',
            description: 'Plataforma de conteúdo técnico sobre arquitetura de software, engenharia e tecnologia.',
            books: await this.getAllBooks(),
            articles: await this.getAllArticles()
        };
        
        const html = mustache.render(template, content);
        await fs.writeFile(path.join(this.distDir, 'index.html'), html);
    }

    async generateBooksPage() {
        const template = await this.loadTemplate('books');
        const books = await this.getAllBooks();
        
        const content = {
            title: 'Livros',
            description: 'Coleção de livros sobre arquitetura de software e tecnologia.',
            books
        };
        
        const html = mustache.render(template, content);
        await fs.ensureDir(path.join(this.distDir, 'books'));
        await fs.writeFile(path.join(this.distDir, 'books', 'index.html'), html);
    }

    async generateArticlesPage() {
        const template = await this.loadTemplate('articles');
        const articles = await this.getAllArticles();
        
        const content = {
            title: 'Artigos',
            description: 'Artigos técnicos sobre desenvolvimento de software e engenharia.',
            articles
        };
        
        const html = mustache.render(template, content);
        await fs.ensureDir(path.join(this.distDir, 'articles'));
        await fs.writeFile(path.join(this.distDir, 'articles', 'index.html'), html);
    }

    async generateBookPage(meta, chapters, bookId) {
        const template = await this.loadTemplate('book');
        
        const content = {
            ...meta,
            chapters,
            bookId
        };
        
        const html = mustache.render(template, content);
        await fs.ensureDir(path.join(this.distDir, 'books', bookId));
        await fs.writeFile(path.join(this.distDir, 'books', bookId, 'index.html'), html);
    }

    async generateArticlePage(meta, content, articleId) {
        const template = await this.loadTemplate('article');
        
        const articleContent = {
            ...meta,
            content,
            articleId
        };
        
        const html = mustache.render(template, articleContent);
        await fs.ensureDir(path.join(this.distDir, 'articles', articleId));
        await fs.writeFile(path.join(this.distDir, 'articles', articleId, 'index.html'), html);
    }

    async loadTemplate(templateName) {
        const templatePath = path.join(this.templatesDir, `${templateName}.mustache`);
        if (await fs.pathExists(templatePath)) {
            return await fs.readFile(templatePath, 'utf8');
        }
        
        // Template básico de fallback
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <link rel="stylesheet" href="/css/main.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            <a href="/books/">Livros</a>
            <a href="/articles/">Artigos</a>
        </nav>
    </header>
    
    <main>
        <h1>{{title}}</h1>
        {{{content}}}
    </main>
    
    <script src="/js/main.js"></script>
</body>
</html>`;
    }

    async getAllBooks() {
        const books = [];
        const booksDir = path.join(this.contentDir, 'books');
        
        if (await fs.pathExists(booksDir)) {
            const bookDirs = await fs.readdir(booksDir);
            for (const bookDir of bookDirs) {
                if (bookDir.startsWith('_')) continue;
                
                const metaPath = path.join(booksDir, bookDir, 'meta.yml');
                if (await fs.pathExists(metaPath)) {
                    const meta = yaml.load(await fs.readFile(metaPath, 'utf8'));
                    books.push({
                        ...meta,
                        id: bookDir,
                        url: `/books/${bookDir}/`
                    });
                }
            }
        }
        
        return books;
    }

    async getAllArticles() {
        const articles = [];
        const articlesDir = path.join(this.contentDir, 'articles');
        
        if (await fs.pathExists(articlesDir)) {
            const articleDirs = await fs.readdir(articlesDir);
            for (const articleDir of articleDirs) {
                if (articleDir.startsWith('_')) continue;
                
                const metaPath = path.join(articlesDir, articleDir, 'meta.yml');
                if (await fs.pathExists(metaPath)) {
                    const meta = yaml.load(await fs.readFile(metaPath, 'utf8'));
                    articles.push({
                        ...meta,
                        id: articleDir,
                        url: `/articles/${articleDir}/`
                    });
                }
            }
        }
        
        return articles;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const builder = new SiteBuilder();
    builder.build().catch(console.error);
}

module.exports = SiteBuilder;
