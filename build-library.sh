#!/bin/bash

# Script para build completo da biblioteca
# Executa build + criptografia em sequência

echo "🚀 Build completo da biblioteca"
echo ""

# Verificar se o arquivo de configuração existe
if [ ! -f ".library-config" ]; then
    echo "❌ Erro: Arquivo .library-config não encontrado"
    echo ""
    echo "📋 Para criar:"
    echo "   1. cp .library-config.example .library-config"
    echo "   2. Edite .library-config com sua senha"
    echo ""
    exit 1
fi

# Carregar senha do arquivo de config
source .library-config

if [ -z "$LIBRARY_PASSWORD" ]; then
    echo "❌ Erro: LIBRARY_PASSWORD não definida em .library-config"
    exit 1
fi

# 1. Build do site
echo "📦 1/2 - Building site..."
cd build && npm run build
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

cd ..

# 2. Criptografar dados
echo ""
echo "🔐 2/2 - Encrypting library data..."
echo "$LIBRARY_PASSWORD" | npm run encrypt-books-data

echo ""
echo "✅ Build completo!"
echo ""
echo "🧪 Testar:"
echo "   cd dist && python3 -m http.server 8000"
echo "   http://localhost:8000/library/"
