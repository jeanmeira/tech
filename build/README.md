# Build do Site

Este diretório contém os scripts de construção para o site.

## Como usar

### Instalação
```bash
cd build
npm install
```

### Build completo
```bash
npm run build
```

### Limpeza
```bash
npm run clean
```

## Estrutura

- `build.js` - Script principal de construção
- `package.json` - Dependências e scripts

## Funcionalidades

- ✅ Parse de metadados YAML
- ✅ Conversão Markdown para HTML
- ✅ Templates com Mustache
- ✅ Otimização de imagens
- ✅ Minificação CSS/JS
- ✅ Geração de sitemap
- ✅ SEO otimizado
- ✅ Schema.org markup
- ✅ Open Graph tags
- ✅ Geração PDF profissional
- ✅ Geração EPUB profissional
- ⏳ Geração MOBI (placeholder)

## Deploy

O deploy é automático via GitHub Actions quando há push na branch main.
