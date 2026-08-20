const STORE_KEY = 'orbit-tasks-v2';
const PROJECT_STORE_KEY = 'orbit-projects-v2';
const THEME_KEY = 'orbit-theme-v1';
const AUTH_STORE_KEY = 'orbit-google-user-v1';
const GOOGLE_CLIENT_ID = '505913150767-tjno26r04hh50hpbpkd73ri0so60as96.apps.googleusercontent.com';

const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 };
const priorityLabel = { urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa' };
const statusLabel = { todo: 'A fazer', doing: 'Fazendo', done: 'Feito' };
const statusColumns = [
  { id: 'todo', label: 'A fazer', color: '#7d7aff' },
  { id: 'doing', label: 'Fazendo', color: '#f5ad5c' },
  { id: 'done', label: 'Feito', color: '#4dd7a1' }
];

const today = new Date();
const pad = n => String(n).padStart(2, '0');
const toLocalISO = (date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const dateFromNow = (days, hours = 10) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hours, 0, 0, 0); return toLocalISO(d); };

const demoProjects = [
  { id: 'work', name: 'Trabalho', color: '#7c6cff' },
  { id: 'study', name: 'Estudos', color: '#46b8ff' },
  { id: 'personal', name: 'Pessoal', color: '#4dd7a1' }
];
const demoTasks = [
  { id: 'task-1', title: 'Preparar apresentação do produto', description: 'Estruturar os slides da demonstração e revisar os números do último trimestre.', projectId: 'work', priority: 'urgent', due: dateFromNow(0, 14), status: 'doing', tags: ['apresentação', 'produto'], subtasks: [{ id:'s1', title:'Revisar dados', done:true }, { id:'s2', title:'Montar narrativa', done:false }, { id:'s3', title:'Enviar para revisão', done:false }], order: 1, createdAt: Date.now() - 86400000 * 2 },
  { id: 'task-2', title: 'Estudar para prova de UX', description: 'Revisar heurísticas de Nielsen e princípios de usabilidade.', projectId: 'study', priority: 'high', due: dateFromNow(1, 9), status: 'todo', tags: ['ux'], subtasks: [{ id:'s4', title:'Ler capítulo 4', done:false }, { id:'s5', title:'Fazer exercícios', done:false }], order: 2, createdAt: Date.now() - 86400000 },
  { id: 'task-3', title: 'Organizar plano da semana', description: '', projectId: 'personal', priority: 'medium', due: dateFromNow(2, 18), status: 'todo', tags: ['planejamento'], subtasks: [], order: 3, createdAt: Date.now() - 40000000 },
  { id: 'task-4', title: 'Responder e-mails pendentes', description: 'Priorizar clientes e a solicitação de orçamento.', projectId: 'work', priority: 'medium', due: dateFromNow(0, 11), status: 'done', tags: [], subtasks: [], order: 4, createdAt: Date.now() - 172800000 },
  { id: 'task-5', title: 'Caminhada no parque', description: 'Desconectar um pouco depois do trabalho.', projectId: 'personal', priority: 'low', due: dateFromNow(3, 17), status: 'todo', tags: ['saúde'], subtasks: [], order: 5, createdAt: Date.now() - 30000000 },
  { id: 'task-6', title: 'Atualizar portfólio', description: '', projectId: 'study', priority: 'high', due: dateFromNow(-1, 16), status: 'done', tags: ['design'], subtasks: [], order: 6, createdAt: Date.now() - 300000000 }
];

function removeLegacyOrbitData() { Object.keys(localStorage).filter(key => key.startsWith('orbit-tasks-v1') || key.startsWith('orbit-projects-v1')).forEach(key => localStorage.removeItem(key)); }
removeLegacyOrbitData();
let currentUser = loadObject(AUTH_STORE_KEY);
let projects = load(PROJECT_STORE_KEY, []);
let tasks = load(STORE_KEY, []);
let state = { view: 'tasks', query: '', project: 'all', priority: 'all', completion: 'all', sort: 'order', calendarDate: new Date(), selectedColor: '#7c6cff', dragTaskId: null };

function activeStorageKey(key) { return currentUser?.sub ? `${key}:${currentUser.sub}` : `${key}:anonymous`; }
function loadObject(key) { try { const data = JSON.parse(localStorage.getItem(key)); return data && typeof data === 'object' ? data : null; } catch { return null; } }
function load(key, fallback) { try { const data = JSON.parse(localStorage.getItem(activeStorageKey(key))); return Array.isArray(data) && data.length ? data : structuredClone(fallback); } catch { return structuredClone(fallback); } }
function persist() { localStorage.setItem(activeStorageKey(STORE_KEY), JSON.stringify(tasks)); localStorage.setItem(activeStorageKey(PROJECT_STORE_KEY), JSON.stringify(projects)); }
function escapeHTML(value = '') { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function uid(prefix) { return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`; }
function getProject(id) { return projects.find(project => project.id === id) || { name: 'Sem projeto', color: '#858ba8' }; }
function isDone(task) { return task.status === 'done'; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function formatDate(dateString, short = false) {
  if (!dateString) return 'Sem prazo';
  const date = new Date(dateString);
  if (Number.isNaN(date)) return 'Sem prazo';
  const isToday = sameDay(date, new Date());
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return short ? `Hoje · ${time}` : `Hoje às ${time}`;
  if (sameDay(date, tomorrow)) return short ? `Amanhã · ${time}` : `Amanhã às ${time}`;
  return date.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }).replace('.', '') + (short ? ` · ${time}` : ` às ${time}`);
}

function dueClass(task) { if (!task.due || isDone(task)) return ''; const now = new Date(); const due = new Date(task.due); return due < now ? ' overdue' : ''; }
function todayStart() { const d = new Date(); d.setHours(0,0,0,0); return d; }

function filteredTasks() {
  let results = tasks.filter(task => {
    const haystack = [task.title, task.description, ...(task.tags || []), getProject(task.projectId).name].join(' ').toLowerCase();
    if (state.query && !haystack.includes(state.query.toLowerCase())) return false;
    if (state.project !== 'all' && task.projectId !== state.project) return false;
    if (state.priority !== 'all' && task.priority !== state.priority) return false;
    if (state.completion === 'done' && !isDone(task)) return false;
    if (state.completion === 'open' && isDone(task)) return false;
    return true;
  });
  return results.sort((a,b) => {
    if (state.sort === 'due') return (a.due || '9999').localeCompare(b.due || '9999');
    if (state.sort === 'priority') return priorityRank[a.priority] - priorityRank[b.priority];
    if (state.sort === 'created') return b.createdAt - a.createdAt;
    return a.order - b.order;
  });
}

function taskHTML(task, compact = false) {
  const project = getProject(task.projectId);
  const subtasks = task.subtasks || [];
  const subtaskText = subtasks.length ? `${subtasks.filter(s => s.done).length}/${subtasks.length} subtarefa${subtasks.length > 1 ? 's' : ''}` : '';
  if (compact) return `<article class="kanban-task" draggable="true" data-task-id="${task.id}"><h4>${escapeHTML(task.title)}</h4><div class="kanban-task-footer"><span class="tiny-project" style="--project-color:${project.color}"><i></i>${escapeHTML(project.name)}</span><span class="priority ${task.priority}">${priorityLabel[task.priority]}</span></div></article>`;
  return `<article class="task-card ${isDone(task) ? 'completed' : ''}" draggable="true" data-task-id="${task.id}">
    <span class="drag-handle" title="Arraste para reordenar">⠿</span>
    <button class="check-button ${isDone(task) ? 'checked' : ''}" data-toggle-task="${task.id}" aria-label="${isDone(task) ? 'Marcar como pendente' : 'Marcar como concluída'}"></button>
    <div class="task-main"><div class="task-title-row"><span class="task-title">${escapeHTML(task.title)}</span></div><div class="task-meta"><span class="project-meta" style="--meta-color:${project.color}">${escapeHTML(project.name)}</span>${task.due ? `<span class="due-meta${dueClass(task)}">◷ ${formatDate(task.due, true)}</span>` : ''}${subtaskText ? `<span class="subtask-meta">☑ ${subtaskText}</span>` : ''}</div></div>
    <span class="priority ${task.priority}">${priorityLabel[task.priority]}</span><div class="task-actions"><button class="task-action" data-rename-task="${task.id}" aria-label="Renomear tarefa" title="Renomear">✎</button><button class="task-action delete" data-delete-task="${task.id}" aria-label="Apagar tarefa" title="Apagar">×</button></div></article>`;
}

function renderHeader() {
  const text = new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'numeric', month:'long' }).format(new Date());
  document.querySelector('#headerDate').textContent = text.charAt(0).toUpperCase() + text.slice(1);
}
function renderProjects() {
  const nav = document.querySelector('#projectNav');
  nav.innerHTML = projects.map(project => { const count = tasks.filter(t => t.projectId === project.id && !isDone(t)).length; return `<div class="project-row ${state.project === project.id ? 'active':''}"><button class="project-link ${state.project === project.id ? 'active':''}" data-project-nav="${project.id}"><i class="project-dot" style="--project-color:${project.color}"></i><span>${escapeHTML(project.name)}</span><b>${count}</b></button><button class="project-rename" data-rename-project="${project.id}" title="Renomear ${escapeHTML(project.name)}" aria-label="Renomear projeto ${escapeHTML(project.name)}">✎</button></div>`; }).join('');
  const select = document.querySelector('#projectFilter');
  const selected = state.project;
  select.innerHTML = '<option value="all">Todos os projetos</option>' + projects.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
  select.value = projects.some(p => p.id === selected) ? selected : 'all';
  const formSelect = document.querySelector('#taskProjectInput');
  formSelect.innerHTML = projects.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
}
function renderOverview() {
  const openTasks = tasks.filter(t => !isDone(t));
  const todays = tasks.filter(t => t.due && sameDay(new Date(t.due), new Date()));
  const completedToday = tasks.filter(t => isDone(t) && t.due && sameDay(new Date(t.due), new Date())).length;
  const percentage = todays.length ? Math.round((completedToday / todays.length) * 100) : 0;
  document.querySelector('#heroProgressLabel').textContent = `${percentage}% concluído hoje`;
  document.querySelector('#heroProgressText').textContent = `${completedToday} / ${todays.length || 0}`;
  document.querySelector('#heroProgressBar').style.width = `${percentage}%`;
  document.querySelector('#overviewStats').innerHTML = `
    <article class="stat-card"><div class="stat-top"><span>PARA HOJE</span><span class="stat-icon">◷</span></div><div><strong class="stat-number">${todays.filter(t=>!isDone(t)).length}</strong><span class="stat-detail">tarefas planejadas</span></div></article>
    <article class="stat-card"><div class="stat-top"><span>EM ANDAMENTO</span><span class="stat-icon orange">↗</span></div><div><strong class="stat-number">${tasks.filter(t=>t.status==='doing').length}</strong><span class="stat-detail">tarefas em foco</span></div></article>
    <article class="stat-card"><div class="stat-top"><span>CONCLUÍDAS</span><span class="stat-icon green">✓</span></div><div><strong class="stat-number">${tasks.filter(isDone).length}</strong><span class="stat-detail">no seu universo</span></div></article>`;
}
function renderTaskList() {
  const results = filteredTasks();
  const anyFilters = state.query || state.project !== 'all' || state.priority !== 'all' || state.completion !== 'all';
  document.querySelector('#taskCount').textContent = `${results.length}`;
  document.querySelector('#taskSubtitle').textContent = results.length ? 'Mantenha o foco no que importa.' : 'Nenhuma tarefa encontrada com esses filtros.';
  document.querySelector('#clearFilters').hidden = !anyFilters;
  const list = document.querySelector('#taskList');
  list.innerHTML = results.length ? results.map(task => taskHTML(task)).join('') : `<div class="empty-state"><div class="empty-icon">✦</div><h3>Tudo limpo por aqui</h3><p>${anyFilters ? 'Tente ajustar os filtros para encontrar uma tarefa.' : 'Crie uma tarefa e comece a dar forma aos seus planos.'}</p><button class="new-task" data-open-task><span>+</span> Criar tarefa</button></div>`;
  attachTaskDrag(list, false);
}
function renderCalendar() {
  const year = state.calendarDate.getFullYear(); const month = state.calendarDate.getMonth();
  document.querySelector('#calendarMonth').textContent = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(year,month,1));
  const first = new Date(year, month, 1); const startDay = first.getDay(); const daysInMonth = new Date(year, month+1, 0).getDate(); const previousDays = new Date(year, month, 0).getDate();
  let cells = '';
  for(let i=0;i<42;i++) { const dateNum = i-startDay+1; let cellDate, muted=false; if(dateNum<=0){cellDate=new Date(year,month-1,previousDays+dateNum);muted=true}else if(dateNum>daysInMonth){cellDate=new Date(year,month+1,dateNum-daysInMonth);muted=true}else cellDate=new Date(year,month,dateNum); const cellTasks=tasks.filter(t=>t.due&&sameDay(new Date(t.due),cellDate)); const dateIso=`${cellDate.getFullYear()}-${pad(cellDate.getMonth()+1)}-${pad(cellDate.getDate())}`; const events=cellTasks.slice(0,3).map(t=>`<button class="calendar-event" data-edit-task="${t.id}" style="--event-color:${t.priority==='urgent'?'rgba(255,101,132,.25)':t.priority==='high'?'rgba(245,166,70,.23)':t.priority==='low'?'rgba(77,215,161,.2)':'rgba(124,108,255,.25)'}">${escapeHTML(t.title)}</button>`).join(''); const todayClass=sameDay(cellDate,new Date())?'today':''; cells+=`<div class="day-cell ${muted?'muted':''} ${todayClass}" data-date="${dateIso}"><span class="day-num">${cellDate.getDate()}</span>${events}${cellTasks.length>3?`<span class="calendar-more">+${cellTasks.length-3} mais</span>`:''}</div>`; }
  document.querySelector('#calendarGrid').innerHTML = cells;
}
function renderKanban() {
  document.querySelector('#kanbanBoard').innerHTML = statusColumns.map(column => { const items = tasks.filter(t => t.status === column.id).sort((a,b)=>a.order-b.order); return `<section class="kanban-column" data-column="${column.id}" style="--column-color:${column.color}"><div class="kanban-head"><div><i class="column-indicator"></i>${column.label}</div><b>${items.length}</b></div><div class="kanban-tasks">${items.map(t=>taskHTML(t,true)).join('')}</div></section>`; }).join('');
  document.querySelectorAll('.kanban-task').forEach(card => { card.addEventListener('click', () => openTaskModal(card.dataset.taskId)); card.addEventListener('dragstart', () => { state.dragTaskId = card.dataset.taskId; card.classList.add('dragging'); }); card.addEventListener('dragend', () => { state.dragTaskId = null; card.classList.remove('dragging'); }); });
  document.querySelectorAll('.kanban-column').forEach(column => { column.addEventListener('dragover', event => { event.preventDefault(); column.classList.add('drag-over'); }); column.addEventListener('dragleave', () => column.classList.remove('drag-over')); column.addEventListener('drop', () => { column.classList.remove('drag-over'); const task = tasks.find(t=>t.id===state.dragTaskId); if(task && task.status!==column.dataset.column){task.status=column.dataset.column;persist();renderAll();showToast(`Movida para “${statusLabel[task.status]}”`);} }); });
}
function renderAnalytics() {
  const completed = tasks.filter(isDone).length; const pending = tasks.length-completed; const rate = tasks.length ? Math.round(completed/tasks.length*100):0;
  document.querySelector('#analyticsCards').innerHTML = `<article class="analytics-card"><span>Tarefas concluídas</span><strong>${completed}</strong><small>↗ +${Math.max(8,completed*3)}% comparado à semana passada</small></article><article class="analytics-card"><span>Taxa de conclusão</span><strong>${rate}%</strong><small>↗ Você está no caminho certo</small></article><article class="analytics-card"><span>Ainda em aberto</span><strong>${pending}</strong><small class="muted">Foque em uma por vez</small></article>`;
  const days = [2,4,1,5,3,0,Math.max(1,Math.min(6,completed))]; const max=Math.max(...days,6);
  document.querySelector('#activityChart').innerHTML=days.map((value,index)=>`<div class="bar-group"><i class="bar ${index===6?'today':''}" data-value="${value} tarefas" style="height:${Math.max(7, value/max*100)}%"></i></div>`).join('');
}
function renderAll() { renderHeader(); renderUser(); renderProjects(); renderOverview(); renderTaskList(); renderCalendar(); renderKanban(); renderAnalytics(); document.querySelector('#settingsTheme').checked = !document.body.classList.contains('light'); }

function pageHeading(view) { const firstName = currentUser?.name?.trim().split(/\s+/)[0] || 'você'; const headings={tasks:`Bom dia, ${firstName}`,calendar:'Calendário',kanban:'Quadro Kanban',analytics:'Produtividade',settings:'Configurações'}; return `${headings[view]}${view==='tasks'?' <span>✦</span>':''}`; }
function renderUser() { const name=currentUser?.name || 'Sua conta'; const initials=name.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase(); const avatar=document.querySelector('#userAvatar'); avatar.classList.toggle('has-photo',Boolean(currentUser?.picture)); avatar.innerHTML=currentUser?.picture?`<img src="${escapeHTML(currentUser.picture)}" alt="">`:initials; document.querySelector('#userName').textContent=name; document.querySelector('#userEmail').textContent=currentUser?.email || 'Conta Google'; document.querySelector('#pageTitle').innerHTML=pageHeading(state.view); }
function setView(view) { state.view = view; document.querySelectorAll('.view').forEach(section => section.classList.toggle('active-view', section.id === `${view}View`)); document.querySelectorAll('.nav-item[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view)); document.querySelector('#pageTitle').innerHTML = pageHeading(view); window.scrollTo({top:0,behavior:'smooth'}); }
function toggleTask(id) { const task=tasks.find(t=>t.id===id); if(!task)return; task.status=isDone(task)?'todo':'done'; persist();renderAll();showToast(isDone(task)?'Tarefa concluída. Mandou bem!':'Tarefa marcada como pendente'); }
function openTaskModal(id = null, prefillDate = null) {
  const task = id ? tasks.find(t=>t.id===id) : null;
  const modal=document.querySelector('#taskModal');
  document.querySelector('#taskForm').reset(); document.querySelector('#subtasksInputs').innerHTML='';
  document.querySelector('#taskId').value=task?.id||''; document.querySelector('#taskModalEyebrow').textContent=task?'EDITAR TAREFA':'NOVA TAREFA'; document.querySelector('#taskModalTitle').textContent=task?'Ajuste os detalhes':'O que vamos conquistar?'; document.querySelector('#deleteTaskBtn').hidden=!task;
  if(task){ document.querySelector('#taskTitleInput').value=task.title; document.querySelector('#taskDescriptionInput').value=task.description||''; document.querySelector('#taskProjectInput').value=task.projectId; document.querySelector('#taskPriorityInput').value=task.priority; document.querySelector('#taskDueInput').value=task.due||''; document.querySelector('#taskStatusInput').value=task.status; document.querySelector('#taskTagsInput').value=(task.tags||[]).join(', '); (task.subtasks||[]).forEach(sub=>addSubtaskInput(sub.title,sub.done)); } else { document.querySelector('#taskProjectInput').value=state.project!=='all'?state.project:(projects[0]?.id||''); document.querySelector('#taskDueInput').value=prefillDate?`${prefillDate}T09:00`:''; }
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); setTimeout(()=>document.querySelector('#taskTitleInput').focus(),80);
}
function closeTaskModal(){document.querySelector('#taskModal').classList.remove('open');document.querySelector('#taskModal').setAttribute('aria-hidden','true');}
function addSubtaskInput(text='',done=false){const row=document.createElement('div');row.className='subtask-input-row';row.innerHTML=`<input maxlength="120" placeholder="Ex: Revisar material" value="${escapeHTML(text)}" data-subtask-done="${done}"><button type="button" class="remove-subtask" aria-label="Remover subtarefa">×</button>`;row.querySelector('.remove-subtask').addEventListener('click',()=>row.remove());document.querySelector('#subtasksInputs').append(row);}
function saveTask(event){event.preventDefault();const id=document.querySelector('#taskId').value;const task={id:id||uid('task'),title:document.querySelector('#taskTitleInput').value.trim(),description:document.querySelector('#taskDescriptionInput').value.trim(),projectId:document.querySelector('#taskProjectInput').value,priority:document.querySelector('#taskPriorityInput').value,due:document.querySelector('#taskDueInput').value,status:document.querySelector('#taskStatusInput').value,tags:document.querySelector('#taskTagsInput').value.split(',').map(v=>v.trim()).filter(Boolean),subtasks:[...document.querySelectorAll('#subtasksInputs input')].map(input=>({id:uid('sub'),title:input.value.trim(),done:input.dataset.subtaskDone==='true'})).filter(sub=>sub.title),order:tasks.length?Math.max(...tasks.map(t=>t.order))+1:1,createdAt:Date.now()};if(!task.title)return;if(id){const old=tasks.find(t=>t.id===id);task.order=old.order;task.createdAt=old.createdAt;tasks=tasks.map(t=>t.id===id?task:t);showToast('Tarefa atualizada');}else{tasks.push(task);showToast('Nova tarefa criada');}persist();closeTaskModal();renderAll();}
function openProjectModal(){state.selectedColor='#7c6cff';document.querySelector('#projectForm').reset();document.querySelectorAll('.color-choice').forEach(c=>c.classList.toggle('selected',c.dataset.color===state.selectedColor));document.querySelector('#projectModal').classList.add('open');setTimeout(()=>document.querySelector('#projectNameInput').focus(),80)}
function closeProjectModal(){document.querySelector('#projectModal').classList.remove('open')}
function saveProject(event){event.preventDefault();const name=document.querySelector('#projectNameInput').value.trim();if(!name)return;projects.push({id:uid('project'),name,color:state.selectedColor});persist();closeProjectModal();renderAll();showToast('Projeto criado com sucesso');}
function openRenameModal(id,type='task'){const entity=type==='project'?projects.find(item=>item.id===id):tasks.find(item=>item.id===id);if(!entity)return;document.querySelector('#renameTaskId').value=id;document.querySelector('#renameEntityType').value=type;document.querySelector('#renameTaskInput').value=entity.name || entity.title;document.querySelector('#renameModalEyebrow').textContent=type==='project'?'RENOMEAR PROJETO':'RENOMEAR TAREFA';document.querySelector('#renameModalTitle').textContent=type==='project'?'Dê um novo nome ao projeto':'Dê um novo nome';document.querySelector('#renameFieldLabel').textContent=type==='project'?'Nome do projeto':'Nome da tarefa';document.querySelector('#renameModal').classList.add('open');document.querySelector('#renameModal').setAttribute('aria-hidden','false');setTimeout(()=>{const input=document.querySelector('#renameTaskInput');input.focus();input.select();},80)}
function closeRenameModal(){document.querySelector('#renameModal').classList.remove('open');document.querySelector('#renameModal').setAttribute('aria-hidden','true')}
function saveRename(event){event.preventDefault();const id=document.querySelector('#renameTaskId').value;const title=document.querySelector('#renameTaskInput').value.trim();const type=document.querySelector('#renameEntityType').value;const entity=type==='project'?projects.find(item=>item.id===id):tasks.find(item=>item.id===id);if(!entity||!title)return;if(type==='project')entity.name=title;else entity.title=title;persist();closeRenameModal();renderAll();showToast(type==='project'?'Projeto renomeado':'Tarefa renomeada');}
function deleteTask(id){const task=tasks.find(item=>item.id===id);if(!task)return;if(!confirm(`Apagar “${task.title}”?`))return;tasks=tasks.filter(item=>item.id!==id);persist();closeTaskModal();closeRenameModal();renderAll();showToast('Tarefa apagada');}
function attachTaskDrag(list){list.querySelectorAll('.task-card').forEach(card=>{card.addEventListener('click',event=>{if(!event.target.closest('button'))openTaskModal(card.dataset.taskId)});card.addEventListener('dragstart',()=>{state.dragTaskId=card.dataset.taskId;card.classList.add('dragging')});card.addEventListener('dragend',()=>{state.dragTaskId=null;card.classList.remove('dragging')});});list.addEventListener('dragover',event=>event.preventDefault());list.addEventListener('drop',event=>{const targetCard=event.target.closest('.task-card');const dragged=tasks.find(t=>t.id===state.dragTaskId);const target=tasks.find(t=>t.id===targetCard?.dataset.taskId);if(!dragged||!target||dragged.id===target.id)return;const sourceOrder=dragged.order;dragged.order=target.order;target.order=sourceOrder;persist();renderAll();showToast('Ordem das tarefas atualizada');});}
function showToast(message){const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2700)}
function resetFilters(){state.query='';state.project='all';state.priority='all';state.completion='all';document.querySelector('#taskSearch').value='';document.querySelector('#priorityFilter').value='all';document.querySelector('#statusFilter').value='all';renderAll();}

function setLoginIssue(message='') { const issue=document.querySelector('#googleLoginIssue'); issue.textContent=message; issue.classList.toggle('visible',Boolean(message)); }
function showWelcome() { document.querySelector('#welcomeScreen').classList.remove('hidden'); initializeGoogleLogin(); }
function decodeGoogleCredential(credential) { const encoded=credential.split('.')[1]; if(!encoded) throw new Error('Token inválido'); const base64=encoded.replace(/-/g,'+').replace(/_/g,'/'); const padded=base64.padEnd(base64.length+(4-base64.length%4)%4,'='); const text=decodeURIComponent(atob(padded).split('').map(char=>`%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`).join('')); return JSON.parse(text); }
function receiveGoogleCredential(response) { try { const profile=decodeGoogleCredential(response.credential); const validIssuer=['https://accounts.google.com','accounts.google.com'].includes(profile.iss); if(!validIssuer || profile.aud!==GOOGLE_CLIENT_ID || !profile.sub || !profile.email || profile.email_verified!==true) throw new Error('Não foi possível validar a conta Google.'); currentUser={sub:profile.sub,name:profile.name || profile.given_name || profile.email,email:profile.email,picture:profile.picture || ''}; localStorage.setItem(AUTH_STORE_KEY,JSON.stringify(currentUser)); projects=load(PROJECT_STORE_KEY,demoProjects); tasks=load(STORE_KEY,demoTasks); state={...state,view:'tasks',query:'',project:'all',priority:'all',completion:'all'}; document.querySelector('#welcomeScreen').classList.add('hidden'); renderAll(); showToast(`Bem-vindo, ${currentUser.name.split(/\s+/)[0]}!`); } catch(error) { setLoginIssue(error.message || 'Não foi possível entrar com Google. Tente novamente.'); } }
function initializeGoogleLogin(attempt=0) { if(currentUser) return; const container=document.querySelector('#googleSignIn'); if(!container) return; if(!window.google?.accounts?.id) { if(attempt<50) setTimeout(()=>initializeGoogleLogin(attempt+1),100); else setLoginIssue('Não foi possível carregar o login Google. Verifique sua conexão e tente novamente.'); return; } setLoginIssue(''); container.innerHTML=''; window.google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:receiveGoogleCredential,auto_select:false,cancel_on_tap_outside:true}); window.google.accounts.id.renderButton(container,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'pill',logo_alignment:'left',width:308,locale:'pt-BR'}); }
function signOut() { if(!currentUser) return; window.google?.accounts?.id?.disableAutoSelect(); currentUser=null; localStorage.removeItem(AUTH_STORE_KEY); document.querySelector('#welcomeScreen').classList.remove('hidden'); renderUser(); showWelcome(); }

document.addEventListener('click', event => {
  const target = event.target.closest('[data-view],[data-project-nav],[data-toggle-task],[data-edit-task],[data-rename-task],[data-rename-project],[data-delete-task],[data-open-task],[data-close-modal],[data-close-project],[data-close-rename],[data-date]');
  if(!target) return;
  if(target.dataset.view) setView(target.dataset.view);
  if(target.dataset.projectNav){state.project=target.dataset.projectNav;setView('tasks');renderAll();}
  if(target.dataset.toggleTask){event.stopPropagation();toggleTask(target.dataset.toggleTask);}
  if(target.dataset.editTask){event.stopPropagation();openTaskModal(target.dataset.editTask);}
  if(target.dataset.renameTask){event.stopPropagation();openRenameModal(target.dataset.renameTask);}
  if(target.dataset.renameProject){event.stopPropagation();openRenameModal(target.dataset.renameProject,'project');}
  if(target.dataset.deleteTask){event.stopPropagation();deleteTask(target.dataset.deleteTask);}
  if(target.dataset.openTask)openTaskModal();
  if(target.hasAttribute('data-close-modal'))closeTaskModal();if(target.hasAttribute('data-close-project'))closeProjectModal();if(target.hasAttribute('data-close-rename'))closeRenameModal();
  if(target.dataset.date && event.target.classList.contains('day-cell'))openTaskModal(null,target.dataset.date);
});
document.querySelector('#newTaskSide').addEventListener('click',()=>openTaskModal());document.querySelector('#newTaskHeader').addEventListener('click',()=>openTaskModal());document.querySelector('#newProjectBtn').addEventListener('click',openProjectModal);document.querySelector('#taskForm').addEventListener('submit',saveTask);document.querySelector('#projectForm').addEventListener('submit',saveProject);document.querySelector('#renameForm').addEventListener('submit',saveRename);document.querySelector('#addSubtaskInput').addEventListener('click',()=>addSubtaskInput());document.querySelector('#signOut').addEventListener('click',signOut);
document.querySelector('#deleteTaskBtn').addEventListener('click',()=>deleteTask(document.querySelector('#taskId').value));
document.querySelector('#taskSearch').addEventListener('input',event=>{state.query=event.target.value;renderTaskList()});document.querySelector('#projectFilter').addEventListener('change',event=>{state.project=event.target.value;renderAll()});document.querySelector('#priorityFilter').addEventListener('change',event=>{state.priority=event.target.value;renderTaskList()});document.querySelector('#statusFilter').addEventListener('change',event=>{state.completion=event.target.value;renderTaskList()});document.querySelector('#sortTasks').addEventListener('change',event=>{state.sort=event.target.value;renderTaskList()});document.querySelector('#clearFilters').addEventListener('click',resetFilters);
document.querySelector('#prevMonth').addEventListener('click',()=>{state.calendarDate.setMonth(state.calendarDate.getMonth()-1);renderCalendar()});document.querySelector('#nextMonth').addEventListener('click',()=>{state.calendarDate.setMonth(state.calendarDate.getMonth()+1);renderCalendar()});document.querySelector('#calendarToday').addEventListener('click',()=>{state.calendarDate=new Date();renderCalendar()});
document.querySelector('#colorOptions').addEventListener('click',event=>{const choice=event.target.closest('.color-choice');if(!choice)return;state.selectedColor=choice.dataset.color;document.querySelectorAll('.color-choice').forEach(c=>c.classList.toggle('selected',c===choice));});
function setTheme(isDark){document.body.classList.toggle('light',!isDark);localStorage.setItem(THEME_KEY,isDark?'dark':'light');document.querySelector('#settingsTheme').checked=isDark;document.querySelector('#themeToggle').textContent=isDark?'☼':'◐';}document.querySelector('#themeToggle').addEventListener('click',()=>setTheme(document.body.classList.contains('light')));document.querySelector('#settingsTheme').addEventListener('change',event=>setTheme(event.target.checked));
document.querySelector('#resetDemo').addEventListener('click',()=>{if(confirm('Restaurar as tarefas e projetos de demonstração?')){tasks=structuredClone(demoTasks);projects=structuredClone(demoProjects);persist();renderAll();showToast('Dados de demonstração restaurados');}});
document.querySelectorAll('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('mousedown',event=>{if(event.target===backdrop){if(backdrop.id==='taskModal')closeTaskModal();else if(backdrop.id==='projectModal')closeProjectModal();else closeRenameModal();}}));
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='n'){event.preventDefault();openTaskModal()}if(event.key==='Escape'){closeTaskModal();closeProjectModal();closeRenameModal()}if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();setView('tasks');document.querySelector('#taskSearch').focus();}});

if(localStorage.getItem(THEME_KEY)==='light')setTheme(false);if(currentUser)document.querySelector('#welcomeScreen').classList.add('hidden');renderAll();window.addEventListener('load',()=>initializeGoogleLogin());
