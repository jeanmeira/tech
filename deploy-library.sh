#!/bin/bash

# Deploy Library Script
# Executa build, criptografia e deploy da biblioteca para GitHub Pages

set -e  # Exit on error

echo "🚀 Iniciando deploy da biblioteca..."
echo ""

# Verificar se .library-config existe
if [ ! -f ".library-config" ]; then
    echo "❌ Erro: .library-config não encontrado"
    echo "   Execute: cp .library-config.example .library-config"
    echo "   E configure a senha"
    exit 1
fi

# Verificar se books-meta.yml existe
if [ ! -f "content/library/books-meta.yml" ]; then
    echo "❌ Erro: content/library/books-meta.yml não encontrado"
    echo "   Execute: cp content/library/books-meta.example.yml content/library/books-meta.yml"
    echo "   E adicione os livros reais"
    exit 1
fi

# Source password from config
source .library-config

# Step 1: Build
echo "📦 Step 1/4: Building site..."
cd build
npm run build
cd ..
echo "✅ Build completed"
echo ""

# Step 2: Encrypt
echo "🔐 Step 2/4: Encrypting library data..."
echo "$LIBRARY_PASSWORD" | npm run encrypt-books-data
echo "✅ Encryption completed"
echo ""

# Step 3: Git add
echo "📝 Step 3/4: Staging files..."
git add dist/library/books-data.enc dist/library/index.html
echo "✅ Files staged"
echo ""

# Step 4: Commit (optional message)
COMMIT_MSG="${1:-build: atualiza biblioteca}"
echo "💾 Step 4/4: Committing..."
if git diff --cached --quiet; then
    echo "⚠️  No changes to commit"
else
    git commit -m "$COMMIT_MSG"
    echo "✅ Committed: $COMMIT_MSG"
fi
echo ""

# Ask for push
echo "🚀 Ready to push to GitHub?"
read -p "   Push now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    echo "✅ Pushed to GitHub!"
    echo ""
    echo "🌐 Aguarde ~1 minuto e acesse:"
    echo "   https://jeanmeira.github.io/tech/library/"
else
    echo "⏸️  Push cancelado"
    echo "   Execute manualmente: git push origin main"
fi

echo ""
echo "✅ Deploy process completed!"
