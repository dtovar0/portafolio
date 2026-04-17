/**
 * Areas Management Interactivity - Table & Selection with DB Persistence
 */

var currentPage = 1;
var rowsPerPage = 10;
var currentFilteredAreas = [];

var iconsMap = {
    'server': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>',
    'cloud': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>',
    'cpu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>',
    'database': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
    'lock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    'code': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    'terminal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',
    'monitor': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
    'activity': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
    'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    'wifi': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    'globe': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    'hard-drive': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>',
    'key': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.5-2.5"></path></svg>',
    'settings': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    'layers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
    'smartphone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
    'tablet': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
    'git-branch': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>',
    'hash': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>',
    'headphones': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>',
    'tool': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
    'git-pull-request': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>',
    'wifi-off': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    'box': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.11-1.79V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"></path><polyline points="2.32 6.16 12 11 21.68 6.16"></polyline><line x1="12" y1="22.76" x2="12" y2="11"></line></svg>',
    'folder': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    'users': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    'heart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    'trending-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
    'dollar-sign': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
    'briefcase': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    'award': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
    'mic': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>',
    'camera': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
    'map-pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    'book': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>'
};

function createPremiumEmptyState(title, text, iconClass = 'fa-network-wired') {
    return `
        <div class="premium-empty-state">
            <div class="empty-state-visual">
                <div class="empty-state-blob"></div>
                <div class="empty-state-icon-wrapper">
                    <i class="fas ${iconClass}"></i>
                </div>
            </div>
            <h2 class="empty-state-title">${title}</h2>
            <p class="empty-state-text">${text}</p>
        </div>
    `;
}

var colorsPalette = [
    'linear-gradient(135deg, #6366f1, #818cf8)', // Indigo
    'linear-gradient(135deg, #10b981, #34d399)', // Green
    'linear-gradient(135deg, #f59e0b, #fbbf24)', // Amber
    'linear-gradient(135deg, #ef4444, #f87171)', // Red
    'linear-gradient(135deg, #3b82f6, #60a5fa)', // Blue
    'linear-gradient(135deg, #8b5cf6, #a78bfa)', // Violet
    'linear-gradient(135deg, #ec4899, #f472b6)', // Pink
    'linear-gradient(135deg, #14b8a6, #5eead4)', // Teal
    'linear-gradient(135deg, #f97316, #fb923c)', // Orange
    'linear-gradient(135deg, #475569, #94a3b8)', // Slate
    'linear-gradient(135deg, #065f46, #10b981)', // Deep Teal
    'linear-gradient(135deg, #7c2d12, #ea580c)', // Rust
    'linear-gradient(135deg, #1e3a8a, #3b82f6)', // Navy
    'linear-gradient(135deg, #581c87, #9333ea)', // Indigo-Purple
    'linear-gradient(135deg, #991b1b, #ef4444)', // Deep Red
    'linear-gradient(135deg, #166534, #22c55e)', // Forest
    'linear-gradient(135deg, #115e59, #14b8a6)', // Sea Foam
    'linear-gradient(135deg, #075985, #0ea5e9)', // Ocean
    'linear-gradient(135deg, #3730a3, #6366f1)', // Dark Blue
    'linear-gradient(135deg, #6b21a8, #a855f7)', // Purple
    'linear-gradient(135deg, #9f1239, #f43f5e)', // Rose
    'linear-gradient(135deg, #854d0e, #eab308)', // Gold
    'linear-gradient(135deg, #1e293b, #475569)', // Charcoal
    'linear-gradient(135deg, #0f172a, #334155)'  // Night
];

var currentStep = 1;
var currentEditStep = 1;

window.changeAreaStep = function(mode, step) {
    const isEdit = mode === 'edit';
    const s1 = document.getElementById(isEdit ? 'editAreaStep1' : 'addAreaStep1');
    const s2 = document.getElementById(isEdit ? 'editAreaStep2' : 'addAreaStep2');
    const s3 = document.getElementById(isEdit ? 'editAreaStep3' : 'addAreaStep3');
    
    const p1 = document.getElementById(isEdit ? 'editStep1_pill' : 'addStep1_pill');
    const p2 = document.getElementById(isEdit ? 'editStep2_pill' : 'addStep2_pill');
    const p3 = document.getElementById(isEdit ? 'editStep3_pill' : 'addStep3_pill');
    
    const progress = document.getElementById(isEdit ? 'editAreaProgress' : 'addAreaProgress');
    const btnBack = document.getElementById(isEdit ? 'btnEditBack' : 'btnAddBack');
    const btnNext = document.getElementById(isEdit ? 'btnEditNext' : 'btnAddNext');
    const btnSubmit = document.getElementById(isEdit ? 'btnEditSubmit' : 'btnAddSubmit');

    // Validation
    if (step > (isEdit ? currentEditStep : currentStep)) {
        const currentStepEl = [s1, s2, s3][(isEdit ? currentEditStep : currentStep) - 1];
        if (window.validatePremiumForm && !window.validatePremiumForm(currentStepEl)) return;
    }

    if (isEdit) currentEditStep = step; else currentStep = step;

    [s1, s2, s3].forEach(s => s && s.classList.remove('active'));
    [p1, p2, p3].forEach(p => p && (p.classList.remove('active'), p.classList.remove('completed')));

    if (step === 1) {
        s1.classList.add('active');
        p1.classList.add('active');
        progress.style.width = '0%';
        btnBack.style.display = 'none';
        btnNext.style.display = 'block';
        btnSubmit.style.display = 'none';
    } else if (step === 2) {
        s2.classList.add('active');
        p1.classList.add('completed');
        p2.classList.add('active');
        progress.style.width = '50%';
        btnBack.style.display = 'block';
        btnNext.style.display = 'block';
        btnSubmit.style.display = 'none';
    } else if (step === 3) {
        s3.classList.add('active');
        p1.classList.add('completed');
        p2.classList.add('completed');
        p3.classList.add('active');
        progress.style.width = '100%';
        btnBack.style.display = 'block';
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'block';
        refreshAreaUserPicklist(mode);
    }
}

function populatePickers() {
    const addGroup = document.getElementById('addIconGroup');
    const editGroup = document.getElementById('editIconGroup');
    const addColorGroup = document.getElementById('addColorGroup');
    const editColorGroup = document.getElementById('editColorGroup');
    
    if (!addGroup || !editGroup || !addColorGroup || !editColorGroup) return;

    let addHtml = '';
    let editHtml = '';
    let first = true;

    // Icons
    for (const [key, svg] of Object.entries(iconsMap)) {
        addHtml += `
            <label>
                <input type="radio" name="icon" value="${key}" ${first ? 'checked' : ''}>
                <div class="icon-preview" title="${key}">${svg}</div>
            </label>
        `;
        editHtml += `
            <label>
                <input type="radio" name="iconEdit" value="${key}">
                <div class="icon-preview" title="${key}">${svg}</div>
            </label>
        `;
        first = false;
    }
    addGroup.innerHTML = addHtml;
    editGroup.innerHTML = editHtml;

    // Colors
    let colorAddHtml = '';
    let colorEditHtml = '';
    colorsPalette.forEach((color, idx) => {
        colorAddHtml += `<div class="color-option js-area-color-option ${idx===0?'active':''}" data-mode="add" data-color="${color}" style="background: ${color}"></div>`;
        colorEditHtml += `<div class="color-option js-area-color-option" data-mode="edit" data-color="${color}" style="background: ${color}"></div>`;
    });
    addColorGroup.innerHTML = colorAddHtml;
    editColorGroup.innerHTML = colorEditHtml;
}

function selectColor(mode, el, colorValue) {
    const group = document.getElementById(mode === 'add' ? 'addColorGroup' : 'editColorGroup');
    group.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    document.getElementById(mode === 'add' ? 'addAreaColorInput' : 'editAreaColorInput').value = colorValue;
}

function toggleAreaModal() {
    const form = document.getElementById('addAreaForm');
    if (form) form.reset();
    
    // Reset to Step 1
    changeAreaStep('add', 1);

    // Reset colors
    const addColorInput = document.getElementById('addAreaColorInput');
    if (addColorInput) {
        addColorInput.value = colorsPalette[0];
        const firstColor = document.querySelector('#addColorGroup .color-option');
        if (firstColor) {
            document.querySelectorAll('#addColorGroup .color-option').forEach(o => o.classList.remove('active'));
            firstColor.classList.add('active');
        }
    }

    openModal('areaModal');
}

function saveNewArea() {
    const form = document.getElementById('addAreaForm');
    if (window.validatePremiumForm && !window.validatePremiumForm(form)) return;

    const formData = new FormData(form);
    const status = document.getElementById('addAreaStatusToggle').checked ? 'Activo' : 'Deshabilitado';
    formData.set('status', status);
    formData.set('color', document.getElementById('addAreaColorInput').value);
    
    // Add users
    const userIds = JSON.parse(document.getElementById('selectedAreaUsersInput').value || '[]');
    formData.append('users', JSON.stringify(userIds));

    fetch('/admin/add-area', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.closeModal("areaModal");
            Toast.fire({ 
                icon: 'success', 
                title: data.message,
                customClass: {
                    popup: 'toast-save'
                }
            });
            setTimeout(() => location.reload(), 1000);
        } else {
            Toast.fire({ icon: 'error', title: 'Error', text: data.error });
        }
    });
}

function refreshAreaUserPicklist(mode, preselectedIds = null) {
    const isEdit = mode === 'edit';
    const availList = document.getElementById(isEdit ? 'editAreaUsersAvailableList' : 'addAreaUsersAvailableList');
    const selectedList = document.getElementById(isEdit ? 'editAreaUsersSelectedList' : 'addAreaUsersSelectedList');
    
    if (!availList || !selectedList) return;

    availList.innerHTML = '';
    selectedList.innerHTML = '';

    const users = window.__userData || [];
    let selectedIds = preselectedIds;
    
    // If we're mid-wizard and already have some picked, don't overwrite if not manual init
    if (selectedIds === null) {
        const input = document.getElementById(isEdit ? 'editSelectedAreaUsersInput' : 'selectedAreaUsersInput');
        selectedIds = JSON.parse(input.value || '[]');
    }

    users.forEach(user => {
        const isSelected = selectedIds.includes(user.id);
        const card = createAreaUserCard(user, isSelected, mode);
        if (isSelected) selectedList.appendChild(card);
        else availList.appendChild(card);
    });
    
    updateAreaUsersHiddenInput(mode);
}

function createAreaUserCard(user, isSelected, mode) {
    const card = document.createElement('div');
    card.className = 'picklist-card-premium' + (isSelected ? ' selected' : '');
    card.setAttribute('data-action', 'areas-toggle-user');
    card.setAttribute('data-user-name', user.name);
    card.setAttribute('data-source', isSelected ? 'selected' : 'available');
    card.setAttribute('data-mode', mode);
    
    card.innerHTML = `
        <div class="card-icon" style="background: var(--bg-hover)">
            <i class="fas fa-user"></i>
        </div>
        <div class="card-info">
            <span class="card-name">${user.name}</span>
            <span class="card-meta">${user.email}</span>
        </div>
        <div class="card-action-icon">
            <i class="fas ${isSelected ? 'fa-times' : 'fa-plus'}"></i>
        </div>
    `;
    return card;
}

function toggleAreaUser(user, source, mode) {
    const isEdit = mode === 'edit';
    const availList = document.getElementById(isEdit ? 'editAreaUsersAvailableList' : 'addAreaUsersAvailableList');
    const selectedList = document.getElementById(isEdit ? 'editAreaUsersSelectedList' : 'addAreaUsersSelectedList');
    
    const isNowSelected = source === 'available';
    
    // Remove from current
    const currentList = isNowSelected ? availList : selectedList;
    const items = Array.from(currentList.children);
    const itemToMove = items.find(el => el.querySelector('.card-name').textContent === user.name);
    if (itemToMove) itemToMove.remove();
    
    // Add to next
    const targetCard = createAreaUserCard(user, isNowSelected, mode);
    (isNowSelected ? selectedList : availList).appendChild(targetCard);
    
    updateAreaUsersHiddenInput(mode);
}

function updateAreaUsersHiddenInput(mode) {
    const isEdit = mode === 'edit';
    const selectedList = document.getElementById(isEdit ? 'editAreaUsersSelectedList' : 'addAreaUsersSelectedList');
    const input = document.getElementById(isEdit ? 'editSelectedAreaUsersInput' : 'selectedAreaUsersInput');
    
    const names = Array.from(selectedList.querySelectorAll('.card-name')).map(el => el.textContent);
    const ids = names.map(name => {
        const u = window.__userData.find(user => user.name === name);
        return u ? u.id : null;
    }).filter(id => id !== null);
    
    input.value = JSON.stringify(ids);
}

function editSelectedArea() {
    const checked = document.querySelectorAll('.area-checkbox:checked');
    if (checked.length !== 1) {
        Toast.fire({ icon: 'info', title: 'Selecciona exactamente un registro' });
        return;
    }
    const areaId = checked[0].value;
    const area = allAreasData.find(a => a.id == areaId);
    if (!area) return;

    document.getElementById('editAreaId').value = areaId;
    document.getElementById('editAreaName').value = area.name;
    document.getElementById('editAreaDescription').value = area.description || '';
    
    const statusToggle = document.getElementById('editAreaStatusToggle');
    const isActive = (area.status || 'Activo') === 'Activo';
    statusToggle.checked = isActive;
    document.getElementById('editAreaStatusText').textContent = isActive ? 'Activo' : 'Deshabilitado';
    
    // Icon
    const iconItem = document.querySelector(`#editIconGroup .icon-item[data-icon="${area.icon || 'box'}"]`);
    if (iconItem) {
        document.querySelectorAll('#editIconGroup .icon-item').forEach(i => i.classList.remove('active'));
        iconItem.classList.add('active');
    }

    // Color
    const colorInput = document.getElementById('editAreaColorInput');
    colorInput.value = area.color || colorsPalette[0];
    document.querySelectorAll('#editColorGroup .color-item').forEach(opt => {
        opt.classList.remove('active');
        if (opt.style.background === area.color) opt.classList.add('active');
    });

    // Picklist users
    refreshAreaUserPicklist('edit', area.user_ids || []);
    
    window.changeAreaStep('edit', 1);
    window.openModal('editAreaModal');
}

function saveEditedArea() {
    const form = document.getElementById('editAreaForm');
    if (window.validatePremiumForm && !window.validatePremiumForm(form)) return;

    const id = document.getElementById('editAreaId').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('editAreaName').value);
    formData.append('description', document.getElementById('editAreaDescription').value);
    formData.append('status', document.getElementById('editAreaStatusToggle').checked ? 'Activo' : 'Deshabilitado');
    
    const activeIcon = document.querySelector('#editIconGroup .icon-item.active');
    formData.append('icon', activeIcon ? activeIcon.getAttribute('data-icon') : 'box');
    formData.append('color', document.getElementById('editAreaColorInput').value);
    
    // Add users
    const userIds = JSON.parse(document.getElementById('editSelectedAreaUsersInput').value || '[]');
    formData.append('users', JSON.stringify(userIds));

    fetch(`/admin/edit-area/${id}`, {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeModal("editAreaModal");
            Toast.fire({ 
                icon: 'success', 
                title: data.message,
                customClass: {
                    popup: 'toast-save'
                }
            });
            setTimeout(() => location.reload(), 1000);
        } else {
            Toast.fire({ icon: 'error', title: 'Error', text: data.error });
        }
    });
}

function deleteSelectedAreas() {
    const checked = document.querySelectorAll('.area-checkbox:checked');
    if (checked.length === 0) return;

    Swal.fire({
        title: `¿Eliminar ${checked.length} áreas?`,
        text: "Esta acción es permanente y afectará a las plataformas vinculadas.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        animation: false
    }).then(async (result) => {
        if (result.isConfirmed) {
            const ids = Array.from(checked).map(cb => cb.value);
            let successCount = 0;
            let lastError = null;

            for (let id of ids) {
                const res = await fetch(`/admin/delete-area/${id}`, { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    successCount++;
                } else {
                    lastError = data.error || 'Error al eliminar área';
                }
            }

            if (successCount > 0) {
                Toast.fire({ 
                    icon: 'success', 
                    title: `${successCount} áreas eliminadas`,
                    customClass: {
                        popup: 'toast-delete'
                    }
                });
                setTimeout(() => location.reload(), 1000);
            }
            if (lastError) {
                Toast.fire({ icon: 'error', title: 'Error', text: lastError });
            }
        }
    });
}

function renderAreasTable() {
    const tbody = document.getElementById('areasTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = currentFilteredAreas.slice(start, end);

    if (pageData.length === 0) {
        const isSearch = document.getElementById('areaSearch')?.value.trim() !== "";
        const icon = isSearch ? 'fa-search' : 'fa-network-wired';
        const title = isSearch ? 'Sin resultados' : 'Sin Áreas de Trabajo';
        const text = isSearch ? 'No pudimos encontrar áreas que coincidan con su búsqueda.' : 'No se han definido áreas organizacionales. Crea una nueva para comenzar a agrupar plataformas.';

        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 0;">
                    ${createPremiumEmptyState(title, text, icon)}
                </td>
            </tr>
        `;
        return;
    }

    pageData.forEach(area => {
        const tr = document.createElement('tr');
        const defaultIcon = iconsMap['box'];
        const areaIcon = iconsMap[area.icon] || defaultIcon;

        tr.innerHTML = `
            <td class="col-cb">
                <input type="checkbox" class="area-checkbox" value="${area.id}" style="cursor: pointer; width: 16px; height: 16px;">
            </td>
            <td style="width: 60px;">
                <div style="width: 36px; height: 36px; background: ${area.color || '#f8fafc'}; color: ${area.color ? 'white' : 'var(--text-main)'}; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); overflow: hidden;">
                    <div style="width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
                        ${areaIcon}
                    </div>
                </div>
            </td>
            <td>
                <span style="font-weight: 600; font-size: 0.95rem;">${area.name}</span>
            </td>
            <td>
                <div style="font-size: 0.85rem; color: var(--text-muted); max-width: 350px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${area.description || '<span class="text-italic opacity-50">Sin descripción</span>'}
                </div>
            </td>
            <td>
                <span class="badge ${area.status === 'Deshabilitado' ? 'badge-danger' : 'badge-success'}">
                    <span class="status-dot"></span> ${area.status || 'Activo'}
                </span>
            </td>
            <td style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600;">
                <i class="fas fa-users" style="margin-right: 4px; font-size: 0.75rem; opacity: 0.7;"></i> ${area.users_count || 0}
            </td>
            <td style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600;">
                <i class="fas fa-layer-group" style="margin-right: 4px; font-size: 0.75rem; opacity: 0.7;"></i> ${area.platforms_count || 0}
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination();

    // Reset selection state after render
    const selectAll = document.getElementById('selectAllAreas');
    if (selectAll) selectAll.checked = false;
    updateActionButtons();
}

function renderPagination() {
    const container = document.getElementById('areasPagination');
    if (!container) return;

    const totalPages = Math.ceil(currentFilteredAreas.length / rowsPerPage);
    
    if (currentFilteredAreas.length <= rowsPerPage) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="pagination-info">
            Mostrando <span style="font-weight: 700;">${Math.min(currentFilteredAreas.length, (currentPage-1)*rowsPerPage + 1)}-${Math.min(currentFilteredAreas.length, currentPage*rowsPerPage)}</span> de <span style="font-weight: 700;">${currentFilteredAreas.length}</span> registros
        </div>
        <div class="pagination-controls">
            <button class="page-btn-modern" data-action="areas-change-page" data-offset="-1" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
            <div style="font-size: 0.85rem; color: #64748b; font-weight: 600; background: #f8fafc; padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center;">
                ${currentPage} / ${totalPages || 1}
            </div>
            <button class="page-btn-modern" data-action="areas-change-page" data-offset="1" ${currentPage >= totalPages ? 'disabled' : ''}>Siguiente</button>
        </div>
    `;
}

function changeAreaPage(offset) {
    currentPage += offset;
    renderAreasTable();
}

function updateActionButtons() {
    const checkedCount = document.querySelectorAll('.area-checkbox:checked').length;
    const btnEdit = document.getElementById('btnEditArea');
    const btnDelete = document.getElementById('btnDeleteArea');
    
    if (btnEdit) btnEdit.disabled = (checkedCount !== 1);
    if (btnDelete) btnDelete.disabled = (checkedCount === 0);
}

document.addEventListener('DOMContentLoaded', () => {
    currentFilteredAreas = [...allAreasData];
    populatePickers();
    renderAreasTable();

    const searchInput = document.getElementById('areaSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();
            currentFilteredAreas = allAreasData.filter(a => 
                a.name.toLowerCase().includes(term) || (a.description && a.description.toLowerCase().includes(term))
            );
            currentPage = 1;
            renderAreasTable();
        });
    }

    document.addEventListener('click', (event) => {
        const colorOption = event.target.closest('.js-area-color-option');
        if (colorOption) {
            return selectColor(colorOption.dataset.mode, colorOption, colorOption.dataset.color);
        }

        const trigger = event.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.getAttribute('data-action');
        if (action === 'areas-open-create-modal') return toggleAreaModal();
        if (action === 'areas-edit-selected') return editSelectedArea();
        if (action === 'areas-delete-selected') return deleteSelectedAreas();
        if (action === 'areas-close-create-modal') return window.closeModal('areaModal');
        if (action === 'areas-close-edit-modal') return window.closeModal('editAreaModal');
        if (action === 'areas-add-step-back') return window.changeAreaStep('add', currentStep - 1);
        if (action === 'areas-add-step-next') return window.changeAreaStep('add', currentStep + 1);
        if (action === 'areas-save-new') return saveNewArea();
        if (action === 'areas-edit-step-back') return window.changeAreaStep('edit', currentEditStep - 1);
        if (action === 'areas-edit-step-next') return window.changeAreaStep('edit', currentEditStep + 1);
        if (action === 'areas-save-edited') return saveEditedArea();
        if (action === 'areas-change-page') return changeAreaPage(parseInt(trigger.dataset.offset));
        if (action === 'areas-toggle-user') {
            const userName = trigger.dataset.userName;
            const user = (window.__userData || []).find(u => u.name === userName);
            if (user) return toggleAreaUser(user, trigger.dataset.source, trigger.dataset.mode);
        }

    });

    document.addEventListener('change', (event) => {
        if (event.target.classList.contains('area-checkbox')) {
            updateActionButtons();
        }
        const toggle = event.target.closest('.js-area-status-toggle');
        if (!toggle) return;

        const target = document.getElementById(toggle.dataset.targetId);
        if (!target) return;

        target.textContent = toggle.checked
            ? (toggle.dataset.onLabel || 'Activo')
            : (toggle.dataset.offLabel || 'Deshabilitado');
    });
});
