const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, 'todo.db'));
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6b7280'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  );
`);

// Migration: add assignee column to existing DBs
const taskCols = db.prepare('PRAGMA table_info(tasks)').all();
if (!taskCols.some(c => c.name === 'assignee')) {
  db.exec("ALTER TABLE tasks ADD COLUMN assignee TEXT NOT NULL DEFAULT ''");
}

const seedCategories = db.prepare('SELECT COUNT(*) AS count FROM categories').get();
if (seedCategories.count === 0) {
  const insert = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
  const seed = db.transaction((rows) => {
    for (const row of rows) insert.run(row.name, row.color);
  });
  seed([
    { name: 'Personal', color: '#4f46e5' },
    { name: 'Trabajo', color: '#f59e0b' },
    { name: 'Estudio', color: '#10b981' },
  ]);
}

module.exports = db;
