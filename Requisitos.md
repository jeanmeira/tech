# Página pessoal de tecnologia, com artigos e livros

## Objetivo Geral
- Disponibilizar conteúdo para profissionais de tecnologia
- Servir como plataforma de conhecimento com foco em arquitetura de software e liderança técnica
- Permitir leitura online e download de conteúdo em múltiplos formatos

## Tema Visual
- Layout clean, moderno, profissional, minimalista
- Cores: Verde (#2d5a27, #4a7c59) e Branco (#ffffff)
- Tipografia: Sans-serif legível (Source Sans Pro ou similar)
- Responsivo: mobile-first design
- Acessibilidade: WCAG 2.1 AA compliance

## Estrutura de Conteúdo
### Arquitetura de Pastas
```
/
├── content/          # Conteúdo fonte (Markdown + metadados)
│   ├── books/        # Livros completos
│   ├── articles/     # Artigos individuais  
│   └── images/       # Recursos visuais
├── build/            # Scripts de construção
├── dist/             # Arquivos gerados (HTML, EPUB, PDF, MOBI)
└── src/              # Código fonte da interface
```

### Metadados Obrigatórios
- **Livros**: id, type, title, subtitle, author, date, description, cover_image, structure_file, seo
- **Artigos**: id, type, title, author, date, description, content_file, featured_image, seo
- **SEO**: meta_title, meta_description, canonical_url

## Funcionalidades Principais

### 1. Navegação e Listagem
- Página inicial com resumo dos livros e artigos mais recentes
- Lista completa de livros com capas e descrições
- Lista de artigos com imagem destacada e preview

### 2. Leitura de Livros
- Visualização por capítulos individuais
- Navegação sequencial (anterior/próximo)
- Índice interativo
- Breadcrumb navigation

### 3. Leitura de Artigos
- Visualização de artigo completo em página única
- Artigos relacionados simples

### 4. Sistema de Comentários
- Integração com utterances (GitHub Issues)
- Comentários por capítulo (livros) e por artigo
- Configuração automática baseada no repositório atual

### 5. Downloads
- Geração automática de formatos: HTML, EPUB, PDF, MOBI
- Links de download visíveis em cada livro
- Metadados preservados nos arquivos gerados

## Características Técnicas

### Builder/Gerador
- Script principal: `build.js` (Node.js ou similar)
- Parse de metadados YAML + conteúdo Markdown
- Geração de HTML estático com templates
- Criação de arquivos EPUB/PDF/MOBI usando bibliotecas apropriadas
- Otimização de imagens e assets
- Geração de sitemap.xml e robots.txt
- Build incremental (apenas arquivos modificados)

### Performance e SEO
- HTML semântico com schema.org markup
- Meta tags completas baseadas nos metadados
- Open Graph e Twitter Cards
- Lazy loading de imagens
- Critical CSS inline
- Minificação de CSS/JS

### Estrutura HTML Semântica
```html
<article>
  <header>
    <h1>Título</h1>
    <meta>Autor, Data</meta>
  </header>
  <main>Conteúdo</main>
  <footer>Compartilhamento</footer>
</article>
```

### Responsividade
- Breakpoints: 320px, 768px, 1024px, 1400px
- Menu hambúrguer em mobile
- Typography scaling baseado em viewport
- Imagens responsivas com srcset

## Tecnologia
- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+
- **Build**: Node.js com bibliotecas para parse/geração
- **Dependências mínimas**: Marked.js (Markdown), js-yaml (YAML), puppeteer (PDF)
- **Deploy**: GitHub Pages com GitHub Actions para build automático
- **Código**: Limpo, modular, bem documentado, sem frameworks

## Estrutura de Deploy
### GitHub Actions Workflow
1. Trigger: push na branch main ou mudanças em /content
2. Build: executar scripts de geração
3. Deploy: publicar /dist no GitHub Pages
4. Notificação: status do build

### Organização de Arquivos Gerados
```
dist/
├── index.html                 # Página inicial
├── books/
│   ├── index.html            # Lista de livros
│   ├── [slug]/
│   │   ├── index.html        # Página do livro
│   │   ├── [capitulo].html   # Capítulos individuais
│   │   └── downloads/        # EPUB, PDF, MOBI
├── articles/
│   ├── index.html            # Lista de artigos
│   └── [slug]/index.html     # Artigos individuais
├── assets/                   # CSS, JS, imagens otimizadas
└── sitemap.xml               # Sitemap para SEO
```

## Validações e Qualidade
- Validação de metadados obrigatórios no build
- Verificação de links internos quebrados
- Otimização automática de imagens
- Minificação de assets
- Performance budget (< 100KB initial load)

## Nada deve ser feito além das especificações
- Manter simplicidade e foco nas funcionalidades essenciais
- Evitar over-engineering ou funcionalidades desnecessárias
- A IA não deve gerar arquivos temporários para descrição das mudanças. Caso criados, devem ser imediatamente removidos