#!/usr/bin/env node

/**
 * Script para criptografar os dados da biblioteca
 * Usa CryptoJS (mesma lib do browser) para garantir compatibilidade
 */

const fs = require('fs-extra');
const path = require('path');
const CryptoJS = require('crypto-js');
const readline = require('readline');
const yaml = require('js-yaml');

const BOOKS_META = path.resolve(__dirname, '../content/library/books-meta.yml');
const OUTPUT_FILE = path.resolve(__dirname, '../dist/library/books-data.enc');

function readPassword(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function encryptLibraryData() {
    console.log('🔐 Criptografando dados da biblioteca...\n');
    
    // Verificar se o arquivo de metadata existe
    if (!await fs.pathExists(BOOKS_META)) {
        console.error('❌ Erro: Arquivo content/library/books-meta.yml não encontrado');
        process.exit(1);
    }
    
    // Ler e parsear o YAML
    const yamlContent = await fs.readFile(BOOKS_META, 'utf8');
    const data = yaml.load(yamlContent);
    
    console.log(`📚 ${data.books.length} livros encontrados`);
    
    // Solicitar senha
    const password = await readPassword('\n🔑 Digite a senha para criptografar: ');
    
    if (!password || password.length < 8) {
        console.error('\n❌ Erro: Senha deve ter pelo menos 8 caracteres');
        process.exit(1);
    }
    
    // Converter para JSON e criptografar
    const jsonData = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonData, password).toString();
    
    // Salvar arquivo criptografado
    await fs.ensureDir(path.dirname(OUTPUT_FILE));
    await fs.writeFile(OUTPUT_FILE, encrypted, 'utf8');
    
    console.log('\n✅ Dados criptografados com sucesso!');
    console.log('📦 Arquivo: dist/library/books-data.enc');
    console.log(`📊 Tamanho: ${(encrypted.length / 1024).toFixed(2)} KB\n`);
    console.log('📋 Próximos passos:');
    console.log('   1. Rebuild: cd build && npm run build');
    console.log('   2. Teste: python3 -m http.server 8000 (na pasta dist)');
    console.log('   3. Acesse: http://localhost:8000/library/\n');
}

if (require.main === module) {
    encryptLibraryData().catch(error => {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    });
}

module.exports = encryptLibraryData;
