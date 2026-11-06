import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTaskNumber,
  parseTaskNumber,
  canUserEditField,
  filterTasks,
  formatAuditTimestamp,
  TaskItem,
} from './plannerLogic';

test('formatTaskNumber formats counter and month-year correctly', () => {
  const d = new Date(Date.UTC(2026, 10, 6)); // November 2026
  assert.equal(formatTaskNumber(1, d), '001/11-2026');
  assert.equal(formatTaskNumber(42, d), '042/11-2026');
  assert.equal(formatTaskNumber(999, d), '999/11-2026');
});

test('parseTaskNumber decomposes number string into parts', () => {
  const parsed = parseTaskNumber('015/11-2026');
  assert.deepEqual(parsed, { counter: 15, month: 11, year: 2026 });

  const invalid = parseTaskNumber('invalid-number');
  assert.equal(invalid, null);
});

test('canUserEditField enforces role permissions', () => {
  // Admin can edit everything
  assert.equal(canUserEditField('admin', 'status'), true);
  assert.equal(canUserEditField('admin', 'priority'), true);
  assert.equal(canUserEditField('admin', 'assignee_id'), true);
  assert.equal(canUserEditField('admin', 'title'), true);

  // Standard user can only edit status, title and description
  assert.equal(canUserEditField('user', 'status'), true);
  assert.equal(canUserEditField('user', 'title'), true);
  assert.equal(canUserEditField('user', 'description'), true);
  assert.equal(canUserEditField('user', 'priority'), false);
  assert.equal(canUserEditField('user', 'assignee_id'), false);
});

test('filterTasks correctly filters tasks by status and search query', () => {
  const sampleTasks: TaskItem[] = [
    {
      id: 1,
      number: '001/11-2026',
      title: 'Настройка роутера',
      description: 'Обновить ПО',
      status: 'in_progress',
      priority: 'high',
      assignee_id: 2,
      assignee_name: 'Иван',
      created_by_id: 1,
      created_at: '2026-11-06T10:00:00Z',
      updated_at: '2026-11-06T10:00:00Z',
    },
    {
      id: 2,
      number: '002/11-2026',
      title: 'Аудит БД',
      description: 'Проверка ключей',
      status: 'review',
      priority: 'critical',
      assignee_id: 3,
      assignee_name: 'Елена',
      created_by_id: 1,
      created_at: '2026-11-06T10:00:00Z',
      updated_at: '2026-11-06T10:00:00Z',
    },
  ];

  const inProgress = filterTasks(sampleTasks, { status: 'in_progress' });
  assert.equal(inProgress.length, 1);
  assert.equal(inProgress[0].id, 1);

  const searched = filterTasks(sampleTasks, { search: 'роутер' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, 1);

  const byNumber = filterTasks(sampleTasks, { search: '002' });
  assert.equal(byNumber.length, 1);
  assert.equal(byNumber[0].id, 2);
});

test('formatAuditTimestamp converts ISO date cleanly', () => {
  const formatted = formatAuditTimestamp('2026-11-06T12:30:45Z');
  assert.match(formatted, /\d{2}\.\d{2}\.2026 \d{2}:\d{2}:\d{2}/);
});
