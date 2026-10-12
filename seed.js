import { db } from './db.js';
console.log('Migrações e conteúdo inicial verificados.');
console.log(`${db.prepare('SELECT COUNT(*) n FROM articles').get().n} matérias no banco.`);
db.close();
