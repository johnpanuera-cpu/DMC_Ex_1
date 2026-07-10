const express = require('express');
const db = require('../db');
const { notifyTelegram } = require('../services/telegram');

const router = express.Router();

const SELECT_TASKS = `
  SELECT
    t.*,
    c.name AS category_name,
    c.color AS category_color,
    (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtasks_total,
    (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.completed = 1) AS subtasks_done
  FROM tasks t
  LEFT JOIN categories c ON c.id = t.category_id
`;

function getTaskWithSubtasks(id) {
  const task = db.prepare(`${SELECT_TASKS} WHERE t.id = ?`).get(id);
  if (!task) return null;
  task.subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC, id ASC').all(id);
  return task;
}

router.get('/', (req, res) => {
  const tasks = db.prepare(`${SELECT_TASKS} ORDER BY t.completed ASC, t.due_date IS NULL, t.due_date ASC, t.id DESC`).all();
  const subtasksByTask = db.prepare('SELECT * FROM subtasks ORDER BY position ASC, id ASC').all();

  for (const task of tasks) {
    task.subtasks = subtasksByTask.filter((s) => s.task_id === task.id);
  }

  res.json(tasks);
});

router.post('/', async (req, res) => {
  const { title, description = '', priority = 'medium', due_date = null, category_id = null, assignee = '' } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, priority, due_date, category_id, assignee)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(title.trim(), description, priority, due_date, category_id, assignee);
  const task = getTaskWithSubtasks(result.lastInsertRowid);

  await notifyTelegram(`Nueva tarea creada: "${task.title}"`);

  res.status(201).json(task);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ error: 'task not found' });
  }

  const {
    title = existing.title,
    description = existing.description,
    priority = existing.priority,
    due_date = existing.due_date,
    completed = existing.completed,
    category_id = existing.category_id,
    assignee = existing.assignee,
  } = req.body;

  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, priority = ?, due_date = ?, completed = ?, category_id = ?, assignee = ?
    WHERE id = ?
  `).run(title, description, priority, due_date, completed ? 1 : 0, category_id, assignee, id);

  const updated = getTaskWithSubtasks(id);

  if (!existing.completed && updated.completed) {
    await notifyTelegram(`Tarea completada: "${updated.title}"`);
  }

  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'task not found' });
  }

  res.status(204).end();
});

router.post('/:id/subtasks', (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!task) {
    return res.status(404).json({ error: 'task not found' });
  }

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const position = db.prepare('SELECT COUNT(*) AS count FROM subtasks WHERE task_id = ?').get(id).count;
  const result = db.prepare('INSERT INTO subtasks (task_id, title, position) VALUES (?, ?, ?)').run(id, title.trim(), position);
  const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(subtask);
});

router.put('/:id/subtasks/:subtaskId', (req, res) => {
  const { id, subtaskId } = req.params;
  const existing = db.prepare('SELECT * FROM subtasks WHERE id = ? AND task_id = ?').get(subtaskId, id);

  if (!existing) {
    return res.status(404).json({ error: 'subtask not found' });
  }

  const { title = existing.title, completed = existing.completed } = req.body;

  db.prepare('UPDATE subtasks SET title = ?, completed = ? WHERE id = ?').run(title, completed ? 1 : 0, subtaskId);
  const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId);

  res.json(updated);
});

router.delete('/:id/subtasks/:subtaskId', (req, res) => {
  const { id, subtaskId } = req.params;
  const result = db.prepare('DELETE FROM subtasks WHERE id = ? AND task_id = ?').run(subtaskId, id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'subtask not found' });
  }

  res.status(204).end();
});

module.exports = router;
