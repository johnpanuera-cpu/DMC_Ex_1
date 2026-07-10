const TASKS_URL = '/api/tasks';
const CATEGORIES_URL = '/api/categories';

const MEMBERS = [
  { id: 'mama', name: 'Mamá', initials: 'M', color: 'oklch(0.55 0.15 25)' },
  { id: 'papa', name: 'Papá', initials: 'P', color: 'oklch(0.55 0.14 250)' },
  { id: 'ana',  name: 'Ana',  initials: 'A', color: 'oklch(0.55 0.14 140)' },
  { id: 'leo',  name: 'Leo',  initials: 'L', color: 'oklch(0.6 0.15 80)' },
];

const MONTH_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const PRIORITY_LABEL = { high: 'Alta', medium: 'Media', low: 'Baja' };

let categories = [];
let filters = { status: 'all', priority: '', category: '', assignee: '' };
let newAssignee = '';

// DOM refs
const taskList     = document.getElementById('task-list');
const titleInput   = document.getElementById('title');
const descInput    = document.getElementById('description');
const categorySelect = document.getElementById('category_id');
const prioritySelect = document.getElementById('priority');
const dueDateInput = document.getElementById('due_date');
const addBtn       = document.getElementById('add-btn');
const statPending  = document.getElementById('stat-pending');
const statDone     = document.getElementById('stat-done');
const filterPriority  = document.getElementById('filter-priority');
const filterCategory  = document.getElementById('filter-category');
const filterAssignee  = document.getElementById('filter-assignee');
const memberPicksEl   = document.getElementById('member-picks');

// ── Theme switcher ───────────────────────────────────
document.getElementById('theme-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn || !btn.dataset.theme) return;
  document.querySelectorAll('#theme-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.documentElement.dataset.theme = btn.dataset.theme;
});

// ── Member picks ─────────────────────────────────────
function renderMemberPicks() {
  memberPicksEl.innerHTML = '';
  for (const m of MEMBERS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'member-pick-btn' + (newAssignee === m.id ? ' selected' : '');
    btn.style.background = m.color;
    btn.title = m.name;
    btn.textContent = m.initials;
    btn.addEventListener('click', () => {
      newAssignee = newAssignee === m.id ? '' : m.id;
      renderMemberPicks();
    });
    memberPicksEl.appendChild(btn);
  }
}

// ── Categories ───────────────────────────────────────
async function loadCategories() {
  const res = await fetch(CATEGORIES_URL);
  categories = await res.json();

  const catOpts = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  categorySelect.innerHTML = '<option value="">Sin categoría</option>' + catOpts;
  filterCategory.innerHTML = '<option value="">Categoría</option>' + catOpts;

  const assigneeOpts = MEMBERS.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
  filterAssignee.innerHTML = '<option value="">Asignado a</option>' + assigneeOpts;
}

// ── Tasks ────────────────────────────────────────────
async function fetchTasks() {
  const res = await fetch(TASKS_URL);
  const tasks = await res.json();
  renderStats(tasks);
  renderTasks(tasks);
}

function applyFilters(tasks) {
  return tasks.filter(t => {
    if (filters.status === 'pending' && t.completed) return false;
    if (filters.status === 'done' && !t.completed) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.category && t.category_id !== parseInt(filters.category)) return false;
    if (filters.assignee && t.assignee !== filters.assignee) return false;
    return true;
  });
}

function renderStats(tasks) {
  const pending = tasks.filter(t => !t.completed).length;
  const done = tasks.length - pending;
  statPending.textContent = `${pending} pendiente${pending !== 1 ? 's' : ''}`;
  statDone.textContent = `${done} completada${done !== 1 ? 's' : ''}`;
}

function renderTasks(tasks) {
  const filtered = applyFilters(tasks);
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.textContent = tasks.length === 0
      ? '¡No hay tareas todavía! Agrega una arriba.'
      : 'No hay tareas con estos filtros.';
    taskList.appendChild(div);
    return;
  }

  for (const task of filtered) {
    taskList.appendChild(renderTaskCard(task));
  }
}

function formatDue(dateStr) {
  if (!dateStr) return '';
  const dt = new Date(dateStr + 'T00:00:00');
  if (isNaN(dt.getTime())) return '';
  return `${dt.getDate()} ${MONTH_ABBR[dt.getMonth()]}`;
}

function renderTaskCard(task) {
  const member = MEMBERS.find(m => m.id === task.assignee) || null;
  const dueLabel = formatDue(task.due_date);
  const priorityLabel = PRIORITY_LABEL[task.priority] || 'Media';

  const div = document.createElement('div');
  div.className = `task-card priority-${task.priority}`;

  const avatarHtml = member
    ? `<div class="assignee-avatar" style="background:${member.color}" title="${escapeHtml(member.name)}">${member.initials}</div>`
    : '';

  const chipsHtml = [
    task.category_name ? `<span class="chip-tag">${escapeHtml(task.category_name)}</span>` : '',
    dueLabel           ? `<span class="chip-tag">${dueLabel}</span>` : '',
  ].filter(Boolean).join('');

  div.innerHTML = `
    <button class="task-checkbox${task.completed ? ' checked' : ''}"
      data-action="toggle" data-id="${task.id}" data-completed="${task.completed ? 1 : 0}"
      type="button">${task.completed ? '✓' : ''}</button>
    ${avatarHtml}
    <div class="task-content">
      <div class="task-header">
        <span class="task-title${task.completed ? ' done-title' : ''}">${escapeHtml(task.title)}</span>
        <span class="priority-badge">${priorityLabel}</span>
      </div>
      ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
      ${chipsHtml ? `<div class="task-chips">${chipsHtml}</div>` : ''}
    </div>
    <button class="delete-btn" data-action="delete" data-id="${task.id}" type="button">×</button>
  `;

  return div;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Agregar tarea ────────────────────────────────────
async function addTask() {
  const title = titleInput.value.trim();
  if (!title) return;

  addBtn.disabled = true;
  addBtn.textContent = 'Agregando...';

  try {
    await fetch(TASKS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: descInput.value.trim(),
        priority:    prioritySelect.value,
        due_date:    dueDateInput.value || null,
        category_id: categorySelect.value || null,
        assignee:    newAssignee,
      }),
    });

    titleInput.value  = '';
    descInput.value   = '';
    dueDateInput.value = '';
    newAssignee = '';
    renderMemberPicks();
    await fetchTasks();
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = 'Agregar tarea';
  }
}

addBtn.addEventListener('click', addTask);
titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

// ── Eventos en la lista ──────────────────────────────
taskList.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id, completed } = btn.dataset;

  if (action === 'toggle') {
    await fetch(`${TASKS_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: completed === '0' }),
    });
    await fetchTasks();
  }

  if (action === 'delete') {
    await fetch(`${TASKS_URL}/${id}`, { method: 'DELETE' });
    await fetchTasks();
  }
});

// ── Filtros ──────────────────────────────────────────
document.getElementById('filter-status').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('#filter-status .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filters.status = btn.dataset.value;
  fetchTasks();
});

filterPriority.addEventListener('change', () => { filters.priority = filterPriority.value; fetchTasks(); });
filterCategory.addEventListener('change', () => { filters.category = filterCategory.value; fetchTasks(); });
filterAssignee.addEventListener('change', () => { filters.assignee = filterAssignee.value; fetchTasks(); });

// ── Init ─────────────────────────────────────────────
(async function init() {
  renderMemberPicks();
  await loadCategories();
  await fetchTasks();
})();
