const fs = require('fs');
const path = require('path');

// Criar diretório para favicons
const faviconDir = path.join(__dirname, '..', 'src', 'assets', 'favicon');
if (!fs.existsSync(faviconDir)) {
    fs.mkdirSync(faviconDir, { recursive: true });
}

// Copiar o favicon.png original para o diretório de assets
const originalFavicon = path.join(__dirname, '..', 'src', 'favicon.png');
if (fs.existsSync(originalFavicon)) {
    // Copiar para assets/favicon
    fs.copyFileSync(originalFavicon, path.join(faviconDir, 'favicon.png'));
    
    // Também copiar para dist se existir
    const distDir = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distDir)) {
        fs.copyFileSync(originalFavicon, path.join(distDir, 'favicon.ico'));
        
        const distFaviconDir = path.join(distDir, 'assets', 'favicon');
        if (!fs.existsSync(distFaviconDir)) {
            fs.mkdirSync(distFaviconDir, { recursive: true });
        }
        fs.copyFileSync(originalFavicon, path.join(distFaviconDir, 'favicon.png'));
    }
    
    console.log('🎨 Favicon PNG atualizado com sucesso!');
    console.log('📁 Arquivos criados/atualizados:');
    console.log('   - src/assets/favicon/favicon.png');
    console.log('   - dist/favicon.ico (cópia do PNG)');
    console.log('   - dist/assets/favicon/favicon.png');
} else {
    console.error('❌ Arquivo favicon.png não encontrado em src/');
}
