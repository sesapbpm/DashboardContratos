/**
 * Dashboard de Contratos SESAP-RN
 * Integração ComprasNet, Curva ABC, Gestão de Risco e Exportação de Relatórios
 */

// ==========================================
// SISTEMA DE TOAST NOTIFICATIONS ELEGANTE
// ==========================================
function showToast(message, type = 'info', title = '', duration = 4500) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.log(`[Toast ${type}]: ${title ? title + ' - ' : ''}${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    let defaultTitle = 'Informação';
    if (type === 'success') {
        iconName = 'check-circle-2';
        defaultTitle = 'Sucesso';
    } else if (type === 'warning') {
        iconName = 'alert-triangle';
        defaultTitle = 'Atenção';
    } else if (type === 'error') {
        iconName = 'alert-circle';
        defaultTitle = 'Erro';
    }

    const finalTitle = title || defaultTitle;

    toast.innerHTML = `
        <div class="toast-icon-wrapper">
            <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${finalTitle}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" title="Fechar">
            <i data-lucide="x" style="width: 14px; height: 14px;"></i>
        </button>
        <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    const closeBtn = toast.querySelector('.toast-close');
    let removeTimeout;

    const removeToast = () => {
        if (removeTimeout) clearTimeout(removeTimeout);
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            if (toast.parentElement) toast.parentElement.removeChild(toast);
        }, 300);
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', removeToast);
    }

    removeTimeout = setTimeout(removeToast, duration);
}

// Tratamento global de erros via Toasts
window.onerror = function (msg, url, lineNo, columnNo, error) {
    const cleanMsg = typeof msg === 'string' ? msg : 'Erro inesperado detectado';
    console.error('JS Error:', msg, 'em', url, 'linha:', lineNo, error);
    showToast(`${cleanMsg} (Linha ${lineNo})`, 'error', 'Erro no Dashboard');
    return false;
};

window.addEventListener('unhandledrejection', function (event) {
    console.warn('Unhandled Promise Rejection:', event.reason);
    const reasonMsg = event.reason ? (event.reason.message || event.reason) : 'Falha em operação assíncrona';
    showToast(reasonMsg, 'warning', 'Aviso de Conexão');
});

// ==========================================
// INICIALIZAÇÃO DO APLICATIVO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        const loadingSpinner = document.getElementById('loading-spinner');
        const tbody = document.getElementById('contracts-tbody');
        const kpiTotal = document.getElementById('kpi-total-contratos');
        const kpiValor = document.getElementById('kpi-valor-total');
        const kpiSaldo = document.getElementById('kpi-saldo-ativo');
        const kpiVencer = document.getElementById('kpi-vencer-30-val');
        const searchInput = document.getElementById('search-input');
        const themeToggle = document.getElementById('theme-toggle');
        const navItems = document.querySelectorAll('.nav-item');
        const btnResetFilter = document.getElementById('btn-reset-filter');

        const sectionKpis = document.getElementById('section-kpis');
        const sectionCharts = document.getElementById('section-charts');
        const sectionTable = document.getElementById('section-table');
        const sectionValores = document.getElementById('section-valores');
        const cardValorTotal = document.getElementById('card-valor-total');
        const cardSaldoAtivo = document.getElementById('card-saldo-ativo');
        const cardTotalContratos = document.getElementById('card-total-contratos');
        const cardVencer30 = document.getElementById('card-vencer-30');
        const btnBackVisao = document.getElementById('btn-back-visao');
        const btnBackVisaoTabela = document.getElementById('btn-back-visao-tabela');

        const yearFilter = document.getElementById('year-filter');
        const statusFilter = document.getElementById('status-filter');
        const tableViewTitle = document.getElementById('table-view-title');

        // Botões de Exportação
        const btnExportCsv = document.getElementById('btn-export-csv');
        const btnPrintReport = document.getElementById('btn-print-report');

        // Painel de Risco (A Vencer)
        const riskFilterPanel = document.getElementById('risk-filter-panel');
        const chipRiskAll = document.getElementById('chip-risk-all');
        const chipRiskCritico = document.getElementById('chip-risk-critico');
        const chipRiskAtencao = document.getElementById('chip-risk-atencao');
        const countRiskAll = document.getElementById('count-risk-all');
        const countRiskCritico = document.getElementById('count-risk-critico');
        const countRiskAtencao = document.getElementById('count-risk-atencao');

        // Controles de Escopo da Curva ABC
        const btnScopeAtivos = document.getElementById('btn-scope-ativos');
        const btnScopeTodos = document.getElementById('btn-scope-todos');
        const abcBaseLabel = document.getElementById('abc-base-label');
        const abcTotalAnalisado = document.getElementById('abc-total-analisado');
        const abcFornecedoresCount = document.getElementById('abc-fornecedores-count');

        let allContracts = [];
        let currentFilteredData = [];
        let statusChartInstance = null;
        let vencimentoChartInstance = null;
        let valoresChartInstance = null;

        // Estado do escopo da Curva ABC persistido no localStorage
        let abcScope = localStorage.getItem('sesap_abc_scope') || 'ativos';
        // Estado do filtro de risco na aba A Vencer ('all' | 'critico' | 'atencao')
        let currentRiskFilter = 'all';

        // ==========================================
        // SKELETON LOADING
        // ==========================================
        function renderTableSkeleton(rowCount = 5) {
            if (!tbody) return;
            tbody.innerHTML = '';
            for (let i = 0; i < rowCount; i++) {
                const tr = document.createElement('tr');
                tr.className = 'skeleton-row';
                tr.innerHTML = `
                    <td><div class="skeleton-box skeleton-line short"></div></td>
                    <td><div class="skeleton-box skeleton-line full"></div></td>
                    <td><div class="skeleton-box skeleton-line full"></div></td>
                    <td><div class="skeleton-box skeleton-line short"></div></td>
                    <td><div class="skeleton-box skeleton-line short"></div></td>
                    <td style="text-align:center;"><div class="skeleton-box skeleton-line short" style="margin:0 auto;"></div></td>
                    <td><div class="skeleton-box skeleton-line short"></div></td>
                `;
                tbody.appendChild(tr);
            }
        }

        // ==========================================
        // NAVEGAÇÃO ENTRE VISÕES
        // ==========================================
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                const updateView = () => {
                    navItems.forEach(n => n.classList.remove('active'));
                    item.classList.add('active');

                    const view = item.getAttribute('data-view');
                    if (view === 'visao-geral') {
                        if (riskFilterPanel) riskFilterPanel.style.display = 'none';
                        let needsUpdate = false;
                        if (statusFilter && statusFilter.value !== 'all') {
                            statusFilter.value = 'all';
                            needsUpdate = true;
                        }
                        if (searchInput && searchInput.value !== '') {
                            searchInput.value = '';
                            needsUpdate = true;
                        }
                        if (needsUpdate) applyFilters();

                        if (sectionKpis) sectionKpis.style.display = 'grid';
                        if (sectionCharts) sectionCharts.style.display = 'grid';
                        if (sectionTable) sectionTable.style.display = 'none';
                        if (sectionValores) sectionValores.style.display = 'none';
                    } else if (view === 'contratos') {
                        if (riskFilterPanel) riskFilterPanel.style.display = 'none';
                        if (tableViewTitle) tableViewTitle.innerText = 'Lista de Contratos';
                        currentRiskFilter = 'all';
                        if (statusFilter && statusFilter.value !== 'all') {
                            statusFilter.value = 'all';
                            applyFilters();
                        }
                        if (sectionKpis) sectionKpis.style.display = 'none';
                        if (sectionCharts) sectionCharts.style.display = 'none';
                        if (sectionTable) sectionTable.style.display = 'block';
                        if (sectionValores) sectionValores.style.display = 'none';
                    } else if (view === 'valores') {
                        if (riskFilterPanel) riskFilterPanel.style.display = 'none';
                        if (sectionKpis) sectionKpis.style.display = 'none';
                        if (sectionCharts) sectionCharts.style.display = 'none';
                        if (sectionTable) sectionTable.style.display = 'none';
                        if (sectionValores) {
                            sectionValores.style.display = 'block';
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        renderValoresChart();
                    } else if (view === 'vencer-30') {
                        if (riskFilterPanel) riskFilterPanel.style.display = 'flex';
                        if (tableViewTitle) tableViewTitle.innerText = 'Alertas e Prazos dos Contratos';
                        if (statusFilter && statusFilter.value !== 'A Vencer') {
                            statusFilter.value = 'A Vencer';
                            if (yearFilter) yearFilter.value = 'all';
                            if (searchInput) searchInput.value = '';
                        }
                        currentRiskFilter = 'all';
                        updateRiskChipsUI();
                        applyFilters();

                        if (sectionKpis) sectionKpis.style.display = 'none';
                        if (sectionCharts) sectionCharts.style.display = 'none';
                        if (sectionValores) sectionValores.style.display = 'none';
                        if (sectionTable) {
                            sectionTable.style.display = 'block';
                            sectionTable.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                };

                if (document.startViewTransition) {
                    document.startViewTransition(updateView);
                } else {
                    updateView();
                }
            });
        });

        // ==========================================
        // TEMA (CLARO / ESCURO)
        // ==========================================
        const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
        if (currentTheme) {
            document.documentElement.setAttribute('data-theme', currentTheme);
        }

        if (themeToggle) {
            const updateThemeUI = (theme) => {
                const icon = themeToggle.querySelector('i');
                const span = themeToggle.querySelector('span');
                if (theme === 'dark') {
                    if (icon) icon.setAttribute('data-lucide', 'sun');
                    if (span) span.innerText = 'Modo Claro';
                } else {
                    if (icon) icon.setAttribute('data-lucide', 'moon');
                    if (span) span.innerText = 'Modo Escuro';
                }
                if (window.lucide) lucide.createIcons();
            };

            updateThemeUI(document.documentElement.getAttribute('data-theme'));

            themeToggle.addEventListener('click', () => {
                let theme = document.documentElement.getAttribute('data-theme');
                let newTheme = theme === 'dark' ? 'light' : 'dark';

                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateThemeUI(newTheme);
                updateChartsTheme();
            });
        }

        // ==========================================
        // CLICKS NOS CARDS KPIS
        // ==========================================
        if (cardValorTotal) {
            cardValorTotal.addEventListener('click', () => {
                const navValores = document.querySelector('[data-view="valores"]');
                if (navValores) navValores.click();
            });
        }

        if (cardTotalContratos) {
            cardTotalContratos.addEventListener('click', () => {
                filterTableByStatus('all');
            });
        }

        if (cardSaldoAtivo) {
            cardSaldoAtivo.addEventListener('click', () => {
                filterTableByStatus('Ativo');
            });
        }

        if (cardVencer30) {
            cardVencer30.addEventListener('click', () => {
                const navVencer = document.querySelector('[data-view="vencer-30"]');
                if (navVencer) navVencer.click();
            });
        }

        if (btnBackVisao) {
            btnBackVisao.addEventListener('click', () => {
                const navVisao = document.querySelector('[data-view="visao-geral"]');
                if (navVisao) navVisao.click();
            });
        }

        if (btnBackVisaoTabela) {
            btnBackVisaoTabela.addEventListener('click', () => {
                const navVisao = document.querySelector('[data-view="visao-geral"]');
                if (navVisao) navVisao.click();
            });
        }

        // ==========================================
        // RESILIÊNCIA & CACHE: API COMPRASNET
        // ==========================================

        /**
         * Executa requisições com timeout e fallback em cascata por múltiplos proxies de CORS.
         * Distingue erros de timeout (AbortError) dos demais e loga cada tentativa.
         */
        async function fetchWithProxyFallback(originalUrl, timeoutMs = 6500) {
            // Lista ordenada de estratégias (Direto -> Proxy 1 -> Proxy 2 -> Proxy 3)
            const endpoints = [
                { label: 'Direto', url: originalUrl },
                { label: 'codetabs.com', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(originalUrl)}` },
                { label: 'thingproxy', url: `https://thingproxy.freeboard.io/fetch/${originalUrl}` }
            ];

            let lastError = null;

            for (const { label, url: targetUrl } of endpoints) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                try {
                    const resp = await fetch(targetUrl, {
                        signal: controller.signal,
                        headers: { 'Accept': 'application/json' }
                    });

                    clearTimeout(timeoutId);

                    if (resp.ok) {
                        const json = await resp.json();
                        return json;
                    }

                    // HTTP error (4xx / 5xx) — tenta próximo proxy
                    lastError = new Error(`HTTP ${resp.status} via ${label}`);
                    console.warn(`[ComprasNet] ${label}: HTTP ${resp.status} — tentando próximo proxy.`);

                } catch (err) {
                    clearTimeout(timeoutId);
                    lastError = err;

                    if (err.name === 'AbortError') {
                        console.warn(`[ComprasNet] ${label}: Timeout após ${timeoutMs}ms — tentando próximo proxy.`);
                    } else {
                        console.warn(`[ComprasNet] ${label}: ${err.message} — tentando próximo proxy.`);
                    }
                }
            }

            const finalError = lastError || new Error('Não foi possível obter dados da API após tentar todos os proxies');
            console.error('[ComprasNet] Todos os proxies esgotados para:', originalUrl, finalError);
            throw finalError;
        }

        /**
         * Busca faturas do contrato com suporte a sessionStorage e fallback de proxies.
         * Se notas_fiscais já estiver pré-carregado no data.js (pelo GitHub Actions), usa esses dados diretamente.
         */
        async function fetchFaturas(contrato) {
            // Dados pré-carregados pelo workflow do GitHub Actions — sem chamada à API
            if (contrato && Array.isArray(contrato.notas_fiscais)) {
                return;
            }

            if (!contrato || !contrato.links || !contrato.links.faturas) {
                contrato.notas_fiscais = [];
                return;
            }

            const cacheKey = `sesap_faturas_${contrato.id}`;
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                try {
                    contrato.notas_fiscais = JSON.parse(cached);
                    return;
                } catch (e) {
                    sessionStorage.removeItem(cacheKey);
                }
            }

            try {
                const json = await fetchWithProxyFallback(contrato.links.faturas);
                const nfs = Array.isArray(json) ? json : (json.data || json.items || []);
                contrato.notas_fiscais = nfs;
                sessionStorage.setItem(cacheKey, JSON.stringify(nfs));
            } catch (e) {
                const motivo = e.name === 'AbortError' ? 'timeout' : e.message;
                console.warn(`[Faturas] Falha ao buscar faturas do contrato ${contrato.id}: ${motivo}`);
                contrato.notas_fiscais = [];
            }
        }

        /**
         * Busca histórico e termos aditivos do contrato com sessionStorage e fallback.
         * Se aditivos já estiver pré-carregado no data.js (pelo GitHub Actions), usa esses dados diretamente.
         */
        async function fetchAditivos(contrato) {
            // Dados pré-carregados pelo workflow do GitHub Actions — sem chamada à API
            if (contrato && Array.isArray(contrato.aditivos)) {
                // Garante num_aditivos sincronizado
                contrato.num_aditivos = contrato.aditivos.length;
                return;
            }

            if (!contrato || !contrato.links || !contrato.links.historico) {
                contrato.aditivos = [];
                contrato.num_aditivos = 0;
                return;
            }

            const cacheKey = `sesap_historico_${contrato.id}`;
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                try {
                    const aditivos = JSON.parse(cached);
                    contrato.aditivos = aditivos;
                    contrato.num_aditivos = aditivos.length;
                    return;
                } catch (e) {
                    sessionStorage.removeItem(cacheKey);
                }
            }

            try {
                const json = await fetchWithProxyFallback(contrato.links.historico);
                const historico = Array.isArray(json) ? json : (json.data || json.items || []);
                const aditivos = historico.filter(ev => {
                    const tipo = (ev.tipo || ev.tipo_evento || ev.descricao || '').toLowerCase();
                    return tipo.includes('aditivo') || tipo.includes('acréscimo') || tipo.includes('prorrogacao') || tipo.includes('prorrogação');
                });
                contrato.aditivos = aditivos;
                contrato.num_aditivos = aditivos.length;
                sessionStorage.setItem(cacheKey, JSON.stringify(aditivos));
            } catch (e) {
                const motivo = e.name === 'AbortError' ? 'timeout' : e.message;
                console.warn(`[Aditivos] Falha ao buscar histórico do contrato ${contrato.id}: ${motivo}`);
                contrato.aditivos = [];
                contrato.num_aditivos = 0;
            }
        }

        /**
         * Executa tarefas assíncronas em lotes para não sobrecarregar navegadores ou proxies.
         */
        async function runWithConcurrency(tasks, concurrencyLimit = 5) {
            const results = [];
            for (let i = 0; i < tasks.length; i += concurrencyLimit) {
                const batch = tasks.slice(i, i + concurrencyLimit);
                const batchResults = await Promise.allSettled(batch.map(fn => fn()));
                results.push(...batchResults);
            }
            return results;
        }

        function getAditivoInfo(numAditivos) {
            if (numAditivos >= 5) return { classe: 'aditivo-critico', nivel: 'critico', cor: '#ef4444' };
            if (numAditivos === 4) return { classe: 'aditivo-atencao', nivel: 'atencao', cor: '#f59e0b' };
            return { classe: 'aditivo-normal', nivel: 'normal', cor: '#10b981' };
        }

        function getSaldoContrato(contrato) {
            if (!contrato) return 0;
            const valorTotal = parseCurrencyBR(contrato.valor_global);
            const nfs = contrato.notas_fiscais || [];
            const totalNFs = nfs.reduce((sum, nf) => sum + (parseFloat(nf.valor) || 0), 0);
            return valorTotal - totalNFs;
        }

        async function loadStaticData() {
            if (typeof staticData !== 'undefined' && staticData.length > 0) {
                allContracts = staticData;

                // Exibir data de atualização
                const lastUpdateSpan = document.getElementById('last-update-date');
                if (lastUpdateSpan && typeof lastUpdateDate !== 'undefined') {
                    lastUpdateSpan.innerText = lastUpdateDate;
                } else if (lastUpdateSpan) {
                    lastUpdateSpan.innerText = 'Não disponível';
                }

                populateYearDropdown(allContracts);

                // Verifica se os dados de faturas/aditivos já estão pré-carregados no data.js
                // (gerado pelo GitHub Actions — sem necessidade de chamadas à API com CORS)
                const hasPreloadedData = allContracts.length > 0 &&
                    Array.isArray(allContracts[0].notas_fiscais) &&
                    Array.isArray(allContracts[0].aditivos);

                if (hasPreloadedData) {
                    // Dados já enriquecidos — renderiza imediatamente
                    showToast('Faturas e aditivos carregados diretamente do data.js (pré-processado).', 'success', 'Dados Prontos', 3000);
                    applyFilters();
                    if (loadingSpinner) loadingSpinner.style.display = 'none';
                    return;
                }

                // Fallback: dados não estão pré-carregados — tenta buscar via API/proxy
                renderTableSkeleton(6);
                applyFilters();
                if (loadingSpinner) loadingSpinner.style.display = 'none';

                // Verifica se dados já estavam em cache de sessão
                const hasCachedFaturas = sessionStorage.getItem(`sesap_faturas_${allContracts[0]?.id}`);
                if (hasCachedFaturas) {
                    showToast('Dados de faturas carregados instantaneamente do cache local.', 'info', 'Cache Ativo', 3000);
                } else {
                    showToast(
                        'Buscando faturas e aditivos via API ComprasNet. Isso pode levar alguns segundos...',
                        'info', 'Conectando à API', 5000
                    );
                }

                // Tarefas de busca em paralelo controlado
                const fetchTasks = [];
                allContracts.forEach(c => {
                    fetchTasks.push(() => fetchFaturas(c));
                    fetchTasks.push(() => fetchAditivos(c));
                });

                try {
                    // Executa em fila controlada (6 requisições concorrentes)
                    await runWithConcurrency(fetchTasks, 6);
                    showToast('Dados da API ComprasNet carregados com sucesso.', 'success', 'API OK', 3000);
                } catch (apiErr) {
                    // runWithConcurrency usa Promise.allSettled — erros individuais já tratados por contrato.
                    // Este catch captura apenas falhas inesperadas no orquestrador.
                    const motivo = apiErr && apiErr.name === 'AbortError'
                        ? 'Timeout na conexão com a API ComprasNet.'
                        : (apiErr ? apiErr.message : 'Falha desconhecida');
                    console.error('[loadStaticData] Falha no carregamento via API:', apiErr);
                    showToast(
                        `Alguns dados podem estar incompletos. Motivo: ${motivo}`,
                        'warning', 'Atenção: Falha Parcial na API'
                    );
                }

                // Recalcula KPIs e atualiza tabelas/gráficos com faturas e aditivos carregados
                applyFilters();
            } else {
                throw new Error('A variável staticData não foi encontrada ou está vazia.');
            }
        }

        function parseCurrencyBR(valStr) {
            if (!valStr) return 0;
            return parseFloat(valStr.toString().replace(/\./g, '').replace(',', '.'));
        }

        function formatBRL(value) {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
        }

        function populateYearDropdown(data) {
            if (!yearFilter) return;
            const years = new Set();
            data.forEach(c => {
                if (c.vigencia_fim) {
                    const dateParts = c.vigencia_fim.split('-');
                    if (dateParts.length === 3) {
                        years.add(dateParts[0]);
                    }
                }
            });

            const sortedYears = Array.from(years).sort((a, b) => b - a);
            sortedYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            });
        }

        // ==========================================
        // GESTÃO DE RISCO: CONTROLES DO PAINEL
        // ==========================================
        function updateRiskChipsUI() {
            [chipRiskAll, chipRiskCritico, chipRiskAtencao].forEach(chip => {
                if (chip) chip.classList.remove('active');
            });

            if (currentRiskFilter === 'all' && chipRiskAll) chipRiskAll.classList.add('active');
            if (currentRiskFilter === 'critico' && chipRiskCritico) chipRiskCritico.classList.add('active');
            if (currentRiskFilter === 'atencao' && chipRiskAtencao) chipRiskAtencao.classList.add('active');
        }

        if (chipRiskAll) {
            chipRiskAll.addEventListener('click', () => {
                currentRiskFilter = 'all';
                updateRiskChipsUI();
                applyFilters();
            });
        }

        if (chipRiskCritico) {
            chipRiskCritico.addEventListener('click', () => {
                currentRiskFilter = 'critico';
                updateRiskChipsUI();
                applyFilters();
                showToast('Filtrando contratos com limite legal de 5 aditivos atingido.', 'warning', 'Risco Crítico');
            });
        }

        if (chipRiskAtencao) {
            chipRiskAtencao.addEventListener('click', () => {
                currentRiskFilter = 'atencao';
                updateRiskChipsUI();
                applyFilters();
            });
        }

        // ==========================================
        // ESCOPO DA CURVA ABC (ATIVOS VS TODOS)
        // ==========================================
        function setAbcScope(newScope) {
            abcScope = newScope;
            localStorage.setItem('sesap_abc_scope', newScope);

            if (btnScopeAtivos && btnScopeTodos) {
                if (newScope === 'ativos') {
                    btnScopeAtivos.classList.add('active');
                    btnScopeTodos.classList.remove('active');
                } else {
                    btnScopeTodos.classList.add('active');
                    btnScopeAtivos.classList.remove('active');
                }
            }

            renderValoresChart();
            showToast(`Base do Ranking de Impacto Financeiro alterada para: ${newScope === 'ativos' ? 'Contratos Ativos' : 'Todos os Contratos (Histórico)'}`, 'info', 'Escopo Atualizado', 3000);
        }

        if (btnScopeAtivos) {
            btnScopeAtivos.addEventListener('click', () => setAbcScope('ativos'));
        }
        if (btnScopeTodos) {
            btnScopeTodos.addEventListener('click', () => setAbcScope('todos'));
        }

        // Inicializa estado visual dos botões de escopo conforme localStorage
        if (abcScope === 'todos' && btnScopeTodos && btnScopeAtivos) {
            btnScopeTodos.classList.add('active');
            btnScopeAtivos.classList.remove('active');
        }

        // ==========================================
        // FILTROS PRINCIPAIS DO DASHBOARD
        // ==========================================
        function applyFilters() {
            const selectedYear = yearFilter ? yearFilter.value : 'all';
            const selectedStatus = statusFilter ? statusFilter.value : 'all';
            const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

            const now = new Date();

            if (btnResetFilter) {
                if (selectedYear !== 'all' || selectedStatus !== 'all' || term.length > 0 || currentRiskFilter !== 'all') {
                    btnResetFilter.style.display = 'block';
                } else {
                    btnResetFilter.style.display = 'none';
                }
            }

            // Contadores para o painel de risco
            let totalVencendo30 = 0;
            let totalCriticoAditivos = 0;
            let totalAtencaoAditivos = 0;

            allContracts.forEach(c => {
                let isVencendo = false;
                if (c.vigencia_fim) {
                    const endDate = new Date(c.vigencia_fim);
                    if (endDate >= now) {
                        const thirtyDaysFromNow = new Date();
                        thirtyDaysFromNow.setDate(now.getDate() + 30);
                        if (endDate <= thirtyDaysFromNow) {
                            isVencendo = true;
                            totalVencendo30++;
                        }
                    }
                }
                const numAd = c.num_aditivos || 0;
                if (numAd >= 5) totalCriticoAditivos++;
                if (numAd === 4) totalAtencaoAditivos++;
            });

            if (countRiskAll) countRiskAll.innerText = totalVencendo30;
            if (countRiskCritico) countRiskCritico.innerText = totalCriticoAditivos;
            if (countRiskAtencao) countRiskAtencao.innerText = totalAtencaoAditivos;

            const filtered = allContracts.filter(c => {
                let yearMatch = true;
                if (selectedYear !== 'all') {
                    if (!c.vigencia_fim || !c.vigencia_fim.startsWith(selectedYear)) {
                        yearMatch = false;
                    }
                }

                let statusMatch = true;
                let isVencido = false;
                let isVencendo = false;
                if (c.vigencia_fim) {
                    const endDate = new Date(c.vigencia_fim);
                    if (endDate < now) {
                        isVencido = true;
                    } else {
                        const thirtyDaysFromNow = new Date();
                        thirtyDaysFromNow.setDate(now.getDate() + 30);
                        if (endDate <= thirtyDaysFromNow) {
                            isVencendo = true;
                        }
                    }
                }

                if (selectedStatus === 'Ativo' && isVencido) statusMatch = false;
                if (selectedStatus === 'Vencido' && !isVencido) statusMatch = false;
                if (selectedStatus === 'A Vencer' && !isVencendo) statusMatch = false;

                // Filtro de risco específico da aba A Vencer
                let riskMatch = true;
                if (selectedStatus === 'A Vencer' || (riskFilterPanel && riskFilterPanel.style.display !== 'none')) {
                    const numAd = c.num_aditivos || 0;
                    if (currentRiskFilter === 'critico' && numAd < 5) riskMatch = false;
                    if (currentRiskFilter === 'atencao' && numAd !== 4) riskMatch = false;
                }

                let searchMatch = true;
                if (term.length > 0) {
                    const fornecedor = c.fornecedor && c.fornecedor.nome ? c.fornecedor.nome.toLowerCase() : '';
                    const obj = c.objeto ? c.objeto.toLowerCase() : '';
                    const numContrato = c.numero ? c.numero.toLowerCase() : '';
                    const cnpj = c.fornecedor && c.fornecedor.cnpj_cpf_idgener ? c.fornecedor.cnpj_cpf_idgener.toLowerCase() : '';
                    searchMatch = fornecedor.includes(term) || obj.includes(term) || numContrato.includes(term) || cnpj.includes(term);
                }

                return yearMatch && statusMatch && riskMatch && searchMatch;
            });

            processDashboardData(filtered);
        }

        if (yearFilter) yearFilter.addEventListener('change', applyFilters);
        if (statusFilter) statusFilter.addEventListener('change', applyFilters);
        if (searchInput) searchInput.addEventListener('input', applyFilters);

        if (btnResetFilter) {
            btnResetFilter.addEventListener('click', () => {
                if (yearFilter) yearFilter.value = 'all';
                if (statusFilter) statusFilter.value = 'all';
                if (searchInput) searchInput.value = '';
                currentRiskFilter = 'all';
                updateRiskChipsUI();
                applyFilters();
                showToast('Filtros restaurados para o padrão.', 'info');
            });
        }

        // ==========================================
        // PROCESSAMENTO DE DADOS DOS KPIS & GRÁFICOS
        // ==========================================
        function processDashboardData(data) {
            currentFilteredData = data;
            let totalValor = 0;
            let totalSaldoAtivos = 0;
            let vencer30Dias = 0;
            let countAtivos = 0;
            let countVencidos = 0;

            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);

            const vencimentoMap = {};

            data.forEach(contrato => {
                const val = parseCurrencyBR(contrato.valor_global);
                totalValor += val;

                let isVencido = false;

                if (contrato.vigencia_fim) {
                    const endDate = new Date(contrato.vigencia_fim);

                    if (endDate < now) {
                        isVencido = true;
                        countVencidos++;
                    } else {
                        countAtivos++;
                        if (endDate <= thirtyDaysFromNow) {
                            vencer30Dias++;
                        }
                    }

                    const monthYear = String(endDate.getMonth() + 1).padStart(2, '0') + '/' + endDate.getFullYear();
                    vencimentoMap[monthYear] = (vencimentoMap[monthYear] || 0) + 1;
                } else {
                    countAtivos++;
                }

                // Cálculo do Saldo para Contratos Ativos
                if (!isVencido) {
                    const saldo = getSaldoContrato(contrato);
                    totalSaldoAtivos += saldo;
                }
            });

            if (kpiTotal) kpiTotal.innerText = data.length;
            if (kpiValor) kpiValor.innerText = formatBRL(totalValor);
            if (kpiSaldo) kpiSaldo.innerText = formatBRL(totalSaldoAtivos);
            if (kpiVencer) kpiVencer.innerText = vencer30Dias;

            renderTable(data, now, thirtyDaysFromNow);

            const statusData = [countAtivos, countVencidos];

            const sortedVencimentos = Object.entries(vencimentoMap)
                .sort((a, b) => {
                    const [m1, y1] = a[0].split('/');
                    const [m2, y2] = b[0].split('/');
                    return new Date(y1, m1 - 1) - new Date(y2, m2 - 1);
                });

            renderCharts(statusData, sortedVencimentos);
            renderValoresChart();
        }

        // ==========================================
        // RENDERIZAÇÃO DOS DETALHES DE ADITIVOS E NOTAS
        // ==========================================
        function renderAditivosBlock(c) {
            const LIMITE = 5;
            const numAditivos = c.num_aditivos || 0;
            const adInfo = getAditivoInfo(numAditivos);
            const barPercent = Math.min((numAditivos / LIMITE) * 100, 100);
            const aditivos = c.aditivos || [];

            let tabelaContent = '';
            if (aditivos.length === 0) {
                tabelaContent = `
                    <div class="nf-empty-notice" style="margin-top:0.75rem;">
                        Nenhum termo aditivo registrado no contratos.gov para este contrato.
                    </div>
                `;
            } else {
                let rows = '';
                aditivos.forEach((ad, i) => {
                    let dt = ad.data || ad.data_evento || ad.data_publicacao || '-';
                    if (dt && dt.includes('-')) {
                        const p = dt.split('T')[0].split('-');
                        if (p.length === 3) dt = `${p[2]}/${p[1]}/${p[0]}`;
                    }
                    const tipo = ad.tipo || ad.tipo_evento || ad.descricao || `Aditivo ${i + 1}`;
                    const valor = ad.valor ? formatBRL(parseFloat(ad.valor)) : '-';
                    const obs = ad.observacao || ad.justificativa || '';
                    rows += `
                        <tr>
                            <td style="text-align:center; font-weight:700; color:var(--text-secondary);">${i + 1}º</td>
                            <td>${dt}</td>
                            <td style="font-weight:600;">${tipo}</td>
                            <td>${valor}</td>
                            <td title="${obs}" style="color:var(--text-secondary); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${obs || '-'}</td>
                        </tr>
                    `;
                });
                tabelaContent = `
                    <div class="aditivos-table-wrapper">
                        <table class="aditivos-table">
                            <thead>
                                <tr>
                                    <th style="width:3rem;">#</th>
                                    <th>Data</th>
                                    <th>Tipo de Alteração</th>
                                    <th>Valor</th>
                                    <th>Observação</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `;
            }

            const alertaTexto = adInfo.nivel === 'critico'
                ? '🔴 Limite legal de 5 aditivos atingido — Lei 14.133/21: Necessário encerramento ou novo processo licitatório.'
                : adInfo.nivel === 'atencao'
                    ? '🟡 Atenção: 4 aditivos concedidos. Apenas 1 prorrogação contratual restante.'
                    : '';

            return `
                <div class="aditivos-section">
                    <div class="aditivos-header">
                        <div class="aditivos-title">
                            <i data-lucide="file-plus-2" style="width:18px;height:18px;color:${adInfo.cor};"></i>
                            <span>Termos Aditivos (${numAditivos}/${LIMITE})</span>
                        </div>
                        <span class="aditivo-badge ${adInfo.classe}">${numAditivos}/${LIMITE} aditivos</span>
                    </div>
                    <div class="aditivos-progress-bar-wrapper">
                        <div class="aditivos-bar-track">
                            <div class="aditivos-bar-fill ${adInfo.classe}" style="width:${barPercent}%;"></div>
                        </div>
                        <span class="aditivos-bar-label" style="color:${adInfo.cor};">${numAditivos}/${LIMITE}</span>
                    </div>
                    ${alertaTexto ? `<div style="font-size:0.8rem;font-weight:600;color:${adInfo.cor};margin-bottom:0.75rem;padding:0.5rem 0.75rem;background:rgba(0,0,0,0.04);border-radius:8px;border-left:3px solid ${adInfo.cor};">${alertaTexto}</div>` : ''}
                    ${tabelaContent}
                </div>
            `;
        }

        function renderContractFinanceBlock(c) {
            const valorGlobalNum = parseCurrencyBR(c.valor_global);
            const nfs = c.notas_fiscais || [];
            const totalNFs = nfs.reduce((sum, nf) => sum + (parseFloat(nf.valor) || 0), 0);
            const saldo = valorGlobalNum - totalNFs;
            const saldoClass = saldo < 0 ? 'value-saldo-negativo' : 'value-saldo';

            let nfsTableContent = '';
            if (nfs.length === 0) {
                nfsTableContent = `
                    <div class="nf-empty-notice">
                        Nenhuma fatura registrada no contratos.gov para este contrato.
                    </div>
                `;
            } else {
                let rows = '';
                nfs.forEach(nf => {
                    let dt = nf.data_emissao || nf.dataEmissao || nf.competencia || '-';
                    if (dt && dt.includes('-')) {
                        const p = dt.split('T')[0].split('-');
                        if (p.length === 3) dt = `${p[2]}/${p[1]}/${p[0]}`;
                    }
                    const valNum = parseFloat(nf.valor) || 0;
                    const numero = nf.numero || nf.numero_nf || nf.id || '-';
                    const descricao = nf.descricao || nf.observacao || '';
                    rows += `
                        <tr>
                            <td><strong>${numero}</strong></td>
                            <td>${dt}</td>
                            <td style="font-weight: 600; color: var(--text-primary);">${formatBRL(valNum)}</td>
                            <td title="${descricao}" style="color: var(--text-secondary); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${descricao || '-'}</td>
                        </tr>
                    `;
                });

                nfsTableContent = `
                    <div class="nf-table-wrapper">
                        <table class="nf-table">
                            <thead>
                                <tr>
                                    <th>Nº da Fatura</th>
                                    <th>Data de Emissão</th>
                                    <th>Valor</th>
                                    <th>Descrição</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `;
            }

            return `
                <div class="finance-section">
                    <div class="finance-header">
                        <div class="finance-title">
                            <i data-lucide="wallet" style="width: 18px; height: 18px; color: #0ea5e9;"></i>
                            <span>Resumo Financeiro (Faturas contratos.gov)</span>
                        </div>
                    </div>
                    <div class="finance-cards-grid">
                        <div class="finance-card-item">
                            <span class="finance-card-label">Valor Total do Contrato</span>
                            <span class="finance-card-value value-contrato">${formatBRL(valorGlobalNum)}</span>
                        </div>
                        <div class="finance-card-item">
                            <span class="finance-card-label">Total Faturado</span>
                            <span class="finance-card-value value-faturado">${formatBRL(totalNFs)}</span>
                        </div>
                        <div class="finance-card-item">
                            <span class="finance-card-label">Saldo Restante</span>
                            <span class="finance-card-value ${saldoClass}">${formatBRL(saldo)}</span>
                        </div>
                    </div>
                    ${nfsTableContent}
                </div>
            `;
        }

        // ==========================================
        // RENDERIZAÇÃO DA TABELA DE CONTRATOS
        // ==========================================
        function renderTable(data, now, thirtyDaysFromNow) {
            if (!tbody) return;
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                            <i data-lucide="inbox" style="width: 36px; height: 36px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                            <p>Nenhum contrato encontrado para os filtros selecionados.</p>
                        </td>
                    </tr>
                `;
                if (window.lucide) lucide.createIcons();
                return;
            }

            data.forEach((c, index) => {
                const tr = document.createElement('tr');
                tr.classList.add('clickable-row');
                tr.setAttribute('data-id', c.id || index);

                const fornecedor = c.fornecedor ? c.fornecedor.nome : 'N/A';
                const valorGlobalNum = parseCurrencyBR(c.valor_global);
                const valor = formatBRL(valorGlobalNum);
                const valorParcela = c.valor_parcela ? formatBRL(parseCurrencyBR(c.valor_parcela)) : 'N/A';

                let dataVenc = 'N/A';
                let statusClass = 'status-ativo';
                let statusText = c.situacao || 'Ativo';

                if (c.vigencia_fim) {
                    const dateParts = c.vigencia_fim.split('-');
                    if (dateParts.length === 3) {
                        dataVenc = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];

                        const endDate = new Date(c.vigencia_fim);
                        if (endDate < now) {
                            statusText = 'Vencido';
                            statusClass = '';
                            tr.style.opacity = '0.65';
                        } else if (endDate <= thirtyDaysFromNow) {
                            statusText = 'A Vencer';
                            statusClass = 'status-vencendo';
                        }
                    }
                }

                // Aditivos
                const numAditivos = c.num_aditivos || 0;
                const adInfo = getAditivoInfo(numAditivos);

                // Destaque de Risco Crítico
                if (numAditivos >= 5) {
                    tr.classList.add('row-risk-critical');
                }

                tr.innerHTML = `
                    <td><strong>${c.numero || '-'}</strong></td>
                    <td>${fornecedor}</td>
                    <td class="obj-cell" title="${c.objeto}">${c.objeto || '-'}</td>
                    <td>${valor}</td>
                    <td>${dataVenc}</td>
                    <td style="text-align:center;">
                        <span class="aditivo-badge ${adInfo.classe}" title="${numAditivos >= 5 ? 'Limite legal atingido' : ''}">
                            ${numAditivos >= 5 ? '🚨 ' : ''}${numAditivos}/5
                        </span>
                    </td>
                    <td>
                        <div class="status-cell">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            <i data-lucide="chevron-down" class="expand-icon" style="width: 16px; height: 16px;"></i>
                        </div>
                    </td>
                `;

                const detailTr = document.createElement('tr');
                detailTr.classList.add('details-row');
                detailTr.id = `details-${c.id || index}`;
                detailTr.innerHTML = `
                    <td colspan="7">
                        <div class="details-wrapper">
                            <div class="details-container">
                                <div class="details-grid">
                                    <div class="detail-item">
                                        <span class="detail-label">Valor Total</span>
                                        <span class="detail-value">${valor}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Nº de Parcelas</span>
                                        <span class="detail-value">${c.num_parcelas || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Valor da Parcela</span>
                                        <span class="detail-value">${valorParcela}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Modalidade</span>
                                        <span class="detail-value">${c.modalidade || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">CNPJ/CPF Fornecedor</span>
                                        <span class="detail-value">${c.fornecedor ? c.fornecedor.cnpj_cpf_idgener : 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Processo</span>
                                        <span class="detail-value">${c.processo || 'N/A'}</span>
                                    </div>
                                </div>
                                ${renderAditivosBlock(c)}
                                <div class="contract-finance-container">
                                    ${renderContractFinanceBlock(c)}
                                </div>
                                <div style="padding: 1.5rem 0; display: flex; gap: 1rem; flex-wrap: wrap;">
                                    <a href="https://contratos.comprasnet.gov.br/transparencia/contratos/${c.id}" target="_blank" class="search-input" style="text-decoration: none; display: flex; align-items: center; gap: 0.5rem; width: auto; font-size: 0.85rem; padding: 0.5rem 1rem;">
                                        <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
                                        Ver no ComprasNet
                                    </a>
                                </div>
                            </div>
                        </div>
                    </td>
                `;

                tr.addEventListener('click', () => {
                    const isExpanded = detailTr.classList.contains('expanded');

                    document.querySelectorAll('.details-row.expanded').forEach(el => {
                        if (el !== detailTr) {
                            el.classList.remove('expanded');
                            el.previousElementSibling.classList.remove('expanded');
                        }
                    });

                    detailTr.classList.toggle('expanded');
                    tr.classList.toggle('expanded');
                });

                tbody.appendChild(tr);
                tbody.appendChild(detailTr);
            });

            if (window.lucide) lucide.createIcons();
        }

        function filterTableByStatus(statusVal) {
            const performTransition = () => {
                if (statusFilter) statusFilter.value = statusVal;
                if (yearFilter) yearFilter.value = 'all';
                if (searchInput) searchInput.value = '';
                currentRiskFilter = 'all';
                applyFilters();

                navItems.forEach(n => n.classList.remove('active'));
                let contBtn = document.querySelector('[data-view="contratos"]');
                if (statusVal === 'A Vencer') {
                    contBtn = document.querySelector('[data-view="vencer-30"]');
                    if (riskFilterPanel) riskFilterPanel.style.display = 'flex';
                } else {
                    if (riskFilterPanel) riskFilterPanel.style.display = 'none';
                }
                if (contBtn) contBtn.classList.add('active');

                if (sectionKpis) sectionKpis.style.display = 'none';
                if (sectionCharts) sectionCharts.style.display = 'none';
                if (sectionValores) sectionValores.style.display = 'none';
                if (sectionTable) {
                    sectionTable.style.display = 'block';
                    sectionTable.scrollIntoView({ behavior: 'smooth' });
                }
            };

            if (document.startViewTransition) {
                document.startViewTransition(performTransition);
            } else {
                performTransition();
            }
        }

        function filterTableByMonth(monthYear) {
            const performTransition = () => {
                const [mStr, yStr] = monthYear.split('/');

                const filtered = allContracts.filter(c => {
                    if (!c.vigencia_fim) return false;
                    const [y, m, d] = c.vigencia_fim.split('-');
                    return (m === mStr && y === yStr);
                });

                renderTable(filtered, new Date(), new Date());
                if (btnResetFilter) btnResetFilter.style.display = 'block';

                navItems.forEach(n => n.classList.remove('active'));
                const contBtn = document.querySelector('[data-view="contratos"]');
                if (contBtn) contBtn.classList.add('active');
                if (riskFilterPanel) riskFilterPanel.style.display = 'none';

                if (sectionKpis) sectionKpis.style.display = 'none';
                if (sectionCharts) sectionCharts.style.display = 'none';
                if (sectionValores) sectionValores.style.display = 'none';
                if (sectionTable) {
                    sectionTable.style.display = 'block';
                    sectionTable.scrollIntoView({ behavior: 'smooth' });
                }
            };

            if (document.startViewTransition) {
                document.startViewTransition(performTransition);
            } else {
                performTransition();
            }
        }

        // ==========================================
        // EXPORTAÇÃO CSV & RELATÓRIO PDF
        // ==========================================
        function exportCurrentTableToCSV() {
            const selectedStatus = statusFilter ? statusFilter.value : 'all';
            const selectedYear = yearFilter ? yearFilter.value : 'all';
            const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);

            // Base completa de contratos para aplicar filtros com precisão
            const baseList = (allContracts && allContracts.length > 0)
                ? allContracts
                : (typeof staticData !== 'undefined' ? staticData : (currentFilteredData || []));

            const dataToExport = baseList.filter(c => {
                let yearMatch = true;
                if (selectedYear !== 'all') {
                    if (!c.vigencia_fim || !c.vigencia_fim.startsWith(selectedYear)) {
                        yearMatch = false;
                    }
                }

                let isVencido = false;
                let isVencendo = false;
                if (c.vigencia_fim) {
                    const endDate = new Date(c.vigencia_fim);
                    if (endDate < now) {
                        isVencido = true;
                    } else if (endDate <= thirtyDaysFromNow) {
                        isVencendo = true;
                    }
                }

                let statusMatch = true;
                if (selectedStatus === 'Ativo' && isVencido) statusMatch = false;
                if (selectedStatus === 'Vencido' && !isVencido) statusMatch = false;
                if (selectedStatus === 'A Vencer' && !isVencendo) statusMatch = false;

                let riskMatch = true;
                if (selectedStatus === 'A Vencer' || (riskFilterPanel && riskFilterPanel.style.display !== 'none')) {
                    const numAd = c.num_aditivos || 0;
                    if (currentRiskFilter === 'critico' && numAd < 5) riskMatch = false;
                    if (currentRiskFilter === 'atencao' && numAd !== 4) riskMatch = false;
                }

                let searchMatch = true;
                if (term.length > 0) {
                    const fornecedor = c.fornecedor && c.fornecedor.nome ? c.fornecedor.nome.toLowerCase() : '';
                    const obj = c.objeto ? c.objeto.toLowerCase() : '';
                    const numContrato = c.numero ? c.numero.toLowerCase() : '';
                    const cnpj = c.fornecedor && c.fornecedor.cnpj_cpf_idgener ? c.fornecedor.cnpj_cpf_idgener.toLowerCase() : '';
                    searchMatch = fornecedor.includes(term) || obj.includes(term) || numContrato.includes(term) || cnpj.includes(term);
                }

                return yearMatch && statusMatch && riskMatch && searchMatch;
            });

            if (!dataToExport || dataToExport.length === 0) {
                showToast('Não há dados filtrados para exportar.', 'warning', 'Exportação Vazia');
                return;
            }

            try {
                const headers = [
                    'Nº Contrato',
                    'Fornecedor',
                    'CNPJ/CPF',
                    'Objeto',
                    'Modalidade',
                    'Processo',
                    'Início Vigência',
                    'Fim Vigência',
                    'Valor Global (R$)',
                    'Total Faturado (R$)',
                    'Saldo Restante (R$)',
                    'Nº Aditivos',
                    'Situação'
                ];

                const rows = dataToExport.map(c => {
                    const fornecedor = (c.fornecedor ? c.fornecedor.nome : '').replace(/"/g, '""');
                    const cnpj = (c.fornecedor ? c.fornecedor.cnpj_cpf_idgener : '').replace(/"/g, '""');
                    const objeto = (c.objeto || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
                    const valorGlobal = parseCurrencyBR(c.valor_global).toFixed(2).replace('.', ',');

                    const nfs = c.notas_fiscais || [];
                    const totalNFs = nfs.reduce((sum, nf) => sum + (parseFloat(nf.valor) || 0), 0);
                    const totalFaturado = totalNFs.toFixed(2).replace('.', ',');
                    const saldo = (parseCurrencyBR(c.valor_global) - totalNFs).toFixed(2).replace('.', ',');

                    let situacaoCalculada = 'Ativo';
                    if (c.vigencia_fim) {
                        const endDate = new Date(c.vigencia_fim);
                        if (endDate < now) {
                            situacaoCalculada = 'Vencido';
                        } else if (endDate <= thirtyDaysFromNow) {
                            situacaoCalculada = 'A Vencer';
                        } else {
                            situacaoCalculada = 'Ativo';
                        }
                    }

                    return [
                        `"${c.numero || ''}"`,
                        `"${fornecedor}"`,
                        `"${cnpj}"`,
                        `"${objeto}"`,
                        `"${c.modalidade || ''}"`,
                        `"${c.processo || ''}"`,
                        `"${c.vigencia_inicio || ''}"`,
                        `"${c.vigencia_fim || ''}"`,
                        `"${valorGlobal}"`,
                        `"${totalFaturado}"`,
                        `"${saldo}"`,
                        `"${c.num_aditivos || 0}"`,
                        `"${situacaoCalculada}"`
                    ].join(';');
                });

                // Inclui UTF-8 BOM (\uFEFF) para garantir caracteres acentuados corretos no Excel
                const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dateStr = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `contratos_sesap_rn_${dateStr}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                const statusLabel = selectedStatus === 'all' ? 'Todos os Contratos' : selectedStatus;
                showToast(`${dataToExport.length} contratos exportados com sucesso! (${statusLabel})`, 'success', 'Exportação CSV');
            } catch (err) {
                console.error('Erro na exportação CSV:', err);
                showToast('Falha ao gerar arquivo CSV.', 'error');
            }
        }

        function printOrExportPDF() {
            showToast('Preparando visualização para impressão/PDF...', 'info', 'Relatório', 2500);
            setTimeout(() => {
                window.print();
            }, 300);
        }

        if (btnExportCsv) btnExportCsv.addEventListener('click', exportCurrentTableToCSV);
        if (btnPrintReport) btnPrintReport.addEventListener('click', printOrExportPDF);

        // ==========================================
        // GRÁFICOS: CORES & CHART.JS
        // ==========================================
        function getChartColors() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            return {
                textColor: isDark ? '#f8fafc' : '#0f172a',
                gridColor: isDark ? '#334155' : '#e2e8f0',
                primaryColor: '#6366f1',
                primaryHover: '#818cf8',
                secondaryColor: '#10b981',
                secondaryHover: '#34d399',
                dangerColor: '#ef4444',
                dangerHover: '#f87171'
            };
        }

        function renderCharts(statusData, vencimentosData) {
            if (typeof Chart === 'undefined') {
                console.warn("Chart.js não carregou.");
                return;
            }

            const canvasStatus = document.getElementById('statusChart');
            const canvasVencimento = document.getElementById('vencimentoChart');

            if (!canvasStatus || !canvasVencimento) return;

            const ctxStatus = canvasStatus.getContext('2d');
            const ctxVencimento = canvasVencimento.getContext('2d');
            const colors = getChartColors();

            Chart.defaults.color = colors.textColor;
            Chart.defaults.font.family = "'Inter', sans-serif";

            if (statusChartInstance) statusChartInstance.destroy();
            if (vencimentoChartInstance) vencimentoChartInstance.destroy();

            statusChartInstance = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Ativos', 'Vencidos'],
                    datasets: [{
                        data: statusData,
                        backgroundColor: [colors.secondaryColor, colors.dangerColor],
                        hoverBackgroundColor: [colors.secondaryHover, colors.dangerHover],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    radius: '80%',
                    onClick: (e, elements) => {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const status = statusChartInstance.data.labels[index];
                            filterTableByStatus(status === 'Ativos' ? 'Ativo' : 'Vencido');
                        }
                    },
                    onHover: (event, chartElement) => {
                        if (event.native && event.native.target) {
                            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: colors.textColor }
                        }
                    }
                }
            });

            vencimentoChartInstance = new Chart(ctxVencimento, {
                type: 'line',
                data: {
                    labels: vencimentosData.map(d => d[0]),
                    datasets: [{
                        label: 'Contratos Vencendo',
                        data: vencimentosData.map(d => d[1]),
                        borderColor: colors.primaryColor,
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colors.primaryColor,
                        pointRadius: 4,
                        hitRadius: 15,
                        hoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    onClick: (e, elements) => {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const monthYear = vencimentoChartInstance.data.labels[index];
                            filterTableByMonth(monthYear);
                        }
                    },
                    onHover: (event, chartElement) => {
                        if (event.native && event.native.target) {
                            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => context.raw + ' Contrato(s)'
                            }
                        }
                    },
                    scales: {
                        y: {
                            grid: { color: colors.gridColor },
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { padding: 15 }
                        }
                    },
                    layout: {
                        padding: {
                            top: 20,
                            bottom: 20,
                            left: 15,
                            right: 15
                        }
                    }
                }
            });
        }

        // ==========================================
        // GRÁFICO: RANKING DE IMPACTO FINANCEIRO (VALORES GLOBAIS)
        // ==========================================
        function renderValoresChart(data) {
            const canvasValores = document.getElementById('valoresChart');
            if (!canvasValores || typeof Chart === 'undefined') return;

            // Utiliza sempre a base completa de contratos para garantir consistência entre as abas
            const baseContracts = (allContracts && allContracts.length > 0)
                ? allContracts
                : (typeof staticData !== 'undefined' ? staticData : (data || []));

            const now = new Date();
            const fornecedoresMap = {};
            let totalGeral = 0;
            let countContratosAnalisados = 0;

            const isScopeAtivos = (abcScope === 'ativos');

            baseContracts.forEach(c => {
                if (!c.valor_global) return;

                if (isScopeAtivos && c.vigencia_fim) {
                    const endDate = new Date(c.vigencia_fim);
                    if (endDate < now) return;
                }

                const nome = (c.fornecedor && c.fornecedor.nome) ? c.fornecedor.nome.trim() : 'Não informado';
                const val = parseCurrencyBR(c.valor_global);
                fornecedoresMap[nome] = (fornecedoresMap[nome] || 0) + val;
                totalGeral += val;
                countContratosAnalisados++;
            });

            // Atualiza resumo visual acima do gráfico
            if (abcBaseLabel) {
                abcBaseLabel.innerText = isScopeAtivos
                    ? `Contratos Ativos (${countContratosAnalisados} contratos)`
                    : `Todos os Contratos (${countContratosAnalisados} contratos)`;
            }
            if (abcTotalAnalisado) {
                abcTotalAnalisado.innerText = formatBRL(totalGeral);
            }
            if (abcFornecedoresCount) {
                abcFornecedoresCount.innerText = `${Object.keys(fornecedoresMap).length} empresas`;
            }

            const sortedFornecedores = Object.entries(fornecedoresMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15);

            if (totalGeral === 0 || sortedFornecedores.length === 0) return;

            const labels = [];
            const values = [];
            const indPercentages = [];
            const acumPercentages = [];
            const barColors = [];
            let somaAcumulada = 0;

            sortedFornecedores.forEach(([nome, val]) => {
                labels.push(nome.length > 25 ? nome.substring(0, 22) + '...' : nome);
                values.push(val);
                somaAcumulada += val;

                const pctInd = ((val / totalGeral) * 100).toFixed(1);
                const pctAcum = ((somaAcumulada / totalGeral) * 100).toFixed(1);

                indPercentages.push(pctInd);
                acumPercentages.push(pctAcum);

                // Cores das Faixas de Impacto
                if (parseFloat(pctAcum) <= 80) {
                    barColors.push('#10b981'); // Alto Impacto
                } else if (parseFloat(pctAcum) <= 95) {
                    barColors.push('#f59e0b'); // Médio Impacto
                } else {
                    barColors.push('#94a3b8'); // Baixo Impacto
                }
            });

            const ctxValores = canvasValores.getContext('2d');
            const colors = getChartColors();

            if (valoresChartInstance) valoresChartInstance.destroy();

            const scopeLabelText = isScopeAtivos ? 'Contratos Ativos' : 'Global (Todos)';

            valoresChartInstance = new Chart(ctxValores, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: `Valor ${scopeLabelText} (R$)`,
                            data: values,
                            backgroundColor: barColors,
                            borderRadius: 6,
                            yAxisID: 'y'
                        },
                        {
                            label: `% Acumulada (${scopeLabelText})`,
                            data: acumPercentages,
                            type: 'line',
                            borderColor: colors.primaryColor,
                            backgroundColor: colors.primaryColor,
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.2,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onHover: (event, chartElement) => {
                        event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                    },
                    onClick: (event, activeElements) => {
                        if (activeElements && activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const fornecedorNome = sortedFornecedores[index][0];

                            if (searchInput) {
                                searchInput.value = fornecedorNome;
                            }

                            const navContratos = document.querySelector('[data-view="contratos"]');
                            if (navContratos) {
                                navContratos.click();
                            }

                            applyFilters();

                            showToast(`Filtrando contratos do fornecedor: ${fornecedorNome}`, 'info');
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { color: colors.textColor }
                        },
                        tooltip: {
                            callbacks: {
                                title: (context) => 'Fornecedor: ' + sortedFornecedores[context[0].dataIndex][0],
                                label: (context) => {
                                    const index = context.dataIndex;
                                    const valBRL = formatBRL(values[index]);
                                    const pctInd = indPercentages[index];
                                    const pctAcum = acumPercentages[index];
                                    const baseStr = isScopeAtivos ? 'orçamento ativo' : 'orçamento global';
                                    const faixaImpacto = parseFloat(pctAcum) <= 80 ? 'Alto Impacto' : (parseFloat(pctAcum) <= 95 ? 'Médio Impacto' : 'Baixo Impacto');

                                    if (context.dataset.type === 'line') {
                                        return ` Soma Acumulada: ${pctAcum}% do ${baseStr}`;
                                    }
                                    return [
                                        ` Valor Total: ${valBRL}`,
                                        ` Fatia do Orçamento: ${pctInd}% do ${baseStr}`,
                                        ` Faixa: ${faixaImpacto}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: { color: colors.gridColor },
                            ticks: {
                                callback: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumSignificantDigits: 3 }).format(value)
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            min: 0,
                            max: 100,
                            grid: { drawOnChartArea: false },
                            ticks: {
                                callback: (value) => value + '%'
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: colors.textColor }
                        }
                    }
                }
            });
        }

        function updateChartsTheme() {
            if (allContracts.length > 0) {
                applyFilters();
            }
        }

        loadStaticData();

    } catch (e) {
        console.error('Falha de inicialização:', e);
        showToast(`Erro ao iniciar o Dashboard: ${e.message}`, 'error', 'Erro Crítico');
    }
});
