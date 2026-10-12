import 'dotenv/config';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { regions, stateGroups, categories, slugify, seedArticles } from './data.js';
const path = process.env.DATABASE_PATH || './data/entre-brasil.sqlite';
mkdirSync(dirname(path), { recursive: true });
export const db = new Database(path);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
 CREATE TABLE IF NOT EXISTS regions(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,slug TEXT UNIQUE NOT NULL,description TEXT DEFAULT '',image TEXT DEFAULT '',color TEXT DEFAULT '');
 CREATE TABLE IF NOT EXISTS states(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,region TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,slug TEXT UNIQUE NOT NULL);
 CREATE TABLE IF NOT EXISTS articles(id INTEGER PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,summary TEXT DEFAULT '',content TEXT DEFAULT '',image TEXT DEFAULT '',category TEXT NOT NULL,region TEXT NOT NULL,state TEXT DEFAULT '',city TEXT DEFAULT '',published_at TEXT NOT NULL,source TEXT DEFAULT '',source_url TEXT DEFAULT '',status TEXT DEFAULT 'draft',featured INTEGER DEFAULT 0,relevance INTEGER DEFAULT 50,views INTEGER DEFAULT 0,is_demo INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE UNIQUE INDEX IF NOT EXISTS unique_source_url ON articles(source_url) WHERE source_url != '';
 CREATE INDEX IF NOT EXISTS article_region ON articles(region,status,published_at);
 CREATE INDEX IF NOT EXISTS article_category ON articles(category,status);
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL,role TEXT DEFAULT 'reader');
 CREATE TABLE IF NOT EXISTS favorites(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,PRIMARY KEY(user_id,article_id));
 CREATE TABLE IF NOT EXISTS newsletter(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,consented_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY,applied_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
if (!db.prepare('SELECT 1 FROM migrations WHERE version=1').get()) {
  db.transaction(() => {
    for (const r of regions)
      db.prepare(
        'INSERT OR IGNORE INTO regions(name,slug,description,image,color) VALUES(@name,@slug,@description,@image,@color)',
      ).run(r);
    for (const [region, states] of Object.entries(stateGroups))
      for (const name of states)
        db.prepare('INSERT OR IGNORE INTO states(name,region) VALUES(?,?)').run(name, region);
    for (const name of categories)
      db.prepare('INSERT OR IGNORE INTO categories(name,slug) VALUES(?,?)').run(
        name,
        slugify(name),
      );
    const keys = Object.keys(seedArticles[0]);
    const q = db.prepare(
      `INSERT OR IGNORE INTO articles(${keys.join(',')}) VALUES(${keys.map((k) => '@' + k).join(',')})`,
    );
    for (const a of seedArticles) q.run(a);
    db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').run(
      'tagline',
      'O Brasil de perto. A informação por inteiro.',
    );
    db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').run(
      'site_name',
      'Entre Brasil',
    );
    db.prepare('INSERT INTO migrations(version) VALUES(1)').run();
  })();
}
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const exists = db
    .prepare('SELECT id FROM users WHERE email=?')
    .get(process.env.ADMIN_EMAIL.toLowerCase());
  if (!exists) {
    if (process.env.ADMIN_PASSWORD.length < 12)
      throw new Error('ADMIN_PASSWORD deve ter ao menos 12 caracteres.');
    db.prepare('INSERT INTO users(email,password,name,role) VALUES(?,?,?,?)').run(
      process.env.ADMIN_EMAIL.toLowerCase(),
      bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12),
      'Editor Entre Brasil',
      'admin',
    );
  }
}
