# 📚 Biblioteca Técnica - Documentação

Este diretório contém os metadados da biblioteca de livros técnicos protegida por senha.

## 🗂️ Estrutura de Arquivos

```
content/library/
├── README.md                    # Este arquivo
├── books-meta.example.yml       # Exemplo com dados fake (versionado)
└── books-meta.yml              # Dados reais dos livros (NÃO versionado)
```

## 🚀 Configuração Inicial

### 1. Criar arquivo de metadados

```bash
cd content/library
cp books-meta.example.yml books-meta.yml
```

Edite `books-meta.yml` com os dados reais dos seus livros.

### 2. Configurar senha

```bash
cd /home/jean/projects/tech
cp .library-config.example .library-config
```

Edite `.library-config` e defina a senha:
```bash
LIBRARY_PASSWORD=sua-senha-segura
```

## 📖 Estrutura de Metadados

Cada livro no `books-meta.yml` deve seguir esta estrutura:

```yaml
books:
  - title: "Nome do Livro"
    slug: "nome-do-livro"              # usado na URL
    author: "Nome do Autor"
    category: "Categoria"              # ver lista abaixo
    year: "2024"
    publisher: "Editora"
    cover: "https://url-da-capa.jpg"
    formats:
      pdf: "https://url-do-pdf.pdf"    # opcional
      epub: "https://url-do-epub.epub" # opcional
```

### Categorias Disponíveis

- Arquitetura
- Microservices
- Domain-Driven Design
- APIs
- Cloud
- Data Engineering
- Sistemas Distribuídos
- Design
- Security
- Performance
- Comunicação
- Enterprise Architecture
- Systems Thinking
- Requirements
- Desenvolvimento

## 🔐 Criptografia

### Como Funciona

1. **books-meta.yml** (privado) → contém metadados reais
2. **Build** → processa e converte para JSON
3. **Encrypt** → criptografa com CryptoJS (AES-256)
4. **books-data.enc** → arquivo criptografado versionado no Git
5. **Cliente** → descriptografa no browser com senha

### Arquivos Criptografados

- ✅ `dist/library/books-data.enc` - Versionado no Git (21KB)
- ✅ `dist/library/index.html` - Versionado no Git (30KB)
- ❌ `dist/library/books-data.json` - Temporário, não versionado
- ❌ `content/library/books-meta.yml` - Privado, não versionado

## 🛠️ Workflow de Desenvolvimento

### Build Local

```bash
# Build completo + criptografia
./build-library.sh

# Testar localmente
cd dist
python3 -m http.server 8000
# Acesse: http://localhost:8000/library/
```

### Adicionar Novo Livro

1. Edite `content/library/books-meta.yml`
2. Adicione novo livro seguindo a estrutura
3. Execute build: `./build-library.sh`
4. Commit apenas o `.enc`: 
   ```bash
   git add dist/library/books-data.enc dist/library/index.html
   git commit -m "docs: adiciona novo livro à biblioteca"
   git push
   ```

### Deploy

O GitHub Actions automaticamente:
1. Faz checkout (inclui `.enc` versionado)
2. Executa build do site
3. Deploy para GitHub Pages

**Não é necessário re-criptografar no CI/CD** - o arquivo `.enc` já está commitado.

## 🔒 Segurança

### O que NÃO é versionado (está no .gitignore):

- `content/library/books-meta.yml` - Metadados reais
- `.library-config` - Senha local
- `dist/library/books-data.json` - JSON não criptografado

### O que É versionado:

- `content/library/books-meta.example.yml` - Exemplo com dados fake
- `dist/library/books-data.enc` - Dados criptografados
- `dist/library/index.html` - Página da biblioteca
- `scripts/encrypt-library-data.js` - Script de criptografia
- `src/templates/library-content.html` - Template

### Boas Práticas

- ✅ Sempre use `./build-library.sh` para garantir consistência
- ✅ Nunca commite `books-meta.yml` com dados reais
- ✅ Mantenha `.library-config` seguro e fora do Git
- ✅ Use senhas fortes (mínimo 12 caracteres)
- ✅ Troque a senha periodicamente
- ⚠️ Se trocar a senha, re-criptografe e commite o novo `.enc`

## 📝 Scripts Disponíveis

```bash
# Build completo (recomendado)
./build-library.sh

# Apenas build (sem criptografia)
cd build && npm run build

# Apenas criptografia (requer senha)
echo "sua-senha" | npm run encrypt-books-data
```

## 🐛 Troubleshooting

### Erro: "books-meta.yml não encontrado"

```bash
cp content/library/books-meta.example.yml content/library/books-meta.yml
# Edite com dados reais
```

### Erro: "Password required"

```bash
cp .library-config.example .library-config
# Edite e defina LIBRARY_PASSWORD
```

### Biblioteca não carrega no browser

1. Verifique se `dist/library/books-data.enc` existe
2. Teste a senha localmente
3. Confira console do browser (F12)
4. Verifique se CryptoJS está carregando

### GitHub Pages não mostra biblioteca

1. Confirme que `.enc` está commitado: `git ls-files dist/library/`
2. Verifique GitHub Actions: https://github.com/jeanmeira/tech/actions
3. Limpe cache do browser (Ctrl+Shift+R)

## 📚 Mais Informações

- [README principal](../../README.md) - Documentação geral do projeto
- [Build scripts](../../build/README.md) - Sistema de build
- [Deployment](.github/workflows/deploy.yml) - GitHub Actions
