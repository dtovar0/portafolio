/**
 * Base UI - Global Search
 */

let searchTimeout;
async function handleGlobalSearch(query) {
    const resultsDiv = document.getElementById('globalSearchResults');
    if (!resultsDiv) return;

    if (!query || query.length < 2) {
        resultsDiv.classList.remove('show');
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                let html = '';
                const groups = {};
                data.results.forEach(r => {
                    if (!groups[r.cat]) groups[r.cat] = [];
                    groups[r.cat].push(r);
                });

                for (const [cat, items] of Object.entries(groups)) {
                    html += `<div class="search-result-group">
                        <div class="search-result-header">${cat}</div>
                        ${items.map(item => `
                            <a href="${item.link}" class="search-result-item cat-${item.cat}">
                                <i class="fas ${item.icon}"></i>
                                <div class="result-info">
                                    <span class="result-name">${item.name}</span>
                                    ${item.sub ? `<span class="result-sub">${item.sub}</span>` : ''}
                                </div>
                            </a>
                        `).join('')}
                    </div>`;
                }
                resultsDiv.innerHTML = html;
                resultsDiv.classList.add('show');
            } else {
                resultsDiv.innerHTML = '<div class="search-no-results">No se encontraron resultados</div>';
                resultsDiv.classList.add('show');
            }
        } catch (e) { console.error(e); }
    }, 300);
}

// Close search on click outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        const el = document.getElementById('globalSearchResults');
        if (el) el.classList.remove('show');
    }
});

// Shortcut: Ctrl+K for search
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('globalSearchInput');
        if (input) input.focus();
    }
});
