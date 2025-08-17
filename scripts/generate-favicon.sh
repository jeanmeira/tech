#!/bin/bash

# Script para gerar favicon em diferentes formatos e tamanhos
# Requer ImageMagick (sudo apt install imagemagick)

echo "🎨 Gerando favicon..."

# Diretório de saída
mkdir -p src/assets/favicon

# Gerar PNG em diferentes tamanhos do SVG
convert src/favicon.svg -resize 16x16 src/assets/favicon/favicon-16x16.png
convert src/favicon.svg -resize 32x32 src/assets/favicon/favicon-32x32.png
convert src/favicon.svg -resize 48x48 src/assets/favicon/favicon-48x48.png
convert src/favicon.svg -resize 64x64 src/assets/favicon/favicon-64x64.png
convert src/favicon.svg -resize 128x128 src/assets/favicon/favicon-128x128.png
convert src/favicon.svg -resize 256x256 src/assets/favicon/favicon-256x256.png

# Gerar arquivo ICO com múltiplos tamanhos
convert src/assets/favicon/favicon-16x16.png src/assets/favicon/favicon-32x32.png src/assets/favicon/favicon-48x48.png src/favicon.ico

# Copiar favicon.svg para assets
cp src/favicon.svg src/assets/favicon/favicon.svg

echo "✅ Favicon gerado com sucesso!"
echo "📁 Arquivos criados:"
echo "   - src/favicon.ico (multi-size)"
echo "   - src/assets/favicon/favicon-*.png (16x16 até 256x256)"
echo "   - src/assets/favicon/favicon.svg"
