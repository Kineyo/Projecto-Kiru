/**
 * Kiru AI - Next-Gen Autonomous Sandbox & Model Studio Controller v2.0
 * Conexión WebSocket nativa (Rust / C++ Core / Quick-Test Backend)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Advertencia exacta obligatoria para el uso controlado de Sudo
    const SUDO_WARNING_EXACT =
        'Darle comandos de superusuario puede resultar en la perdida de archivos importantes, daños, y uso de comandos peligrosos. Solo debe usarse en entorno controlados y comprendiendo por completo los riesgos que puede significar';

    // Catálogo integrado de respaldo (100% offline) de https://huggingface.co/HauhauCS
    // Los modelos recomendados están colocados hasta arriba.
    const DEFAULT_HAUHAU_CATALOG = [
        {
            id: 'qwen3.5-4b-hauhau',
            name: 'Qwen 3.5 4B Uncensored (Aggressive)',
            hf_repo: 'HauhauCS/Qwen3.5-4B-Uncensored-HauhauCS-Aggressive',
            ollama_tag: 'hf.co/HauhauCS/Qwen3.5-4B-Uncensored-HauhauCS-Aggressive:Q4_K_M',
            parameters: '4B',
            quantization: 'Q4_K_M (GGUF)',
            recommended: true,
            ssd_size: '2.7 GB',
            ram_req: '6 GB RAM mínimo (8 GB rec.)',
            vram_req: '3.5 GB VRAM (o 100% CPU/iGPU)',
            cpu_req: '4 núcleos (Intel i5 / Ryzen 5 / Apple M1+)',
            target_hardware: 'Laptops estándar, Mini PCs, equipos de gama media con GPU integrada o dedicada básica (GTX 1650 / RTX 3050)',
            description: '⭐ RECOMENDADO #1 — Equilibrio ideal entre velocidad, razonamiento autónomo de consola, generación de planes técnicos y bajo consumo de memoria.',
        },
        {
            id: 'qwen3.5-2b-hauhau',
            name: 'Qwen 3.5 2B Uncensored (Aggressive)',
            hf_repo: 'HauhauCS/Qwen3.5-2B-Uncensored-HauhauCS-Aggressive',
            ollama_tag: 'hf.co/HauhauCS/Qwen3.5-2B-Uncensored-HauhauCS-Aggressive:Q4_K_M',
            parameters: '2B',
            quantization: 'Q4_K_M (GGUF)',
            recommended: true,
            ssd_size: '1.4 GB',
            ram_req: '4 GB RAM',
            vram_req: '1.8 GB VRAM (No requiere GPU dedicada)',
            cpu_req: '2 a 4 núcleos (Intel i3 / Ryzen 3 / ARM64)',
            target_hardware: 'Ultrabooks ligeras, PCs de bajos recursos, máquinas virtuales, laptops sin tarjeta gráfica dedicada',
            description: '⭐ RECOMENDADO #2 (Ultra-Ligero) — Inferencia instantánea en CPU pura. Ideal para pruebas rápidas y control autónomo de terminal con mínima huella de RAM.',
        },
        {
            id: 'qwen3.5-9b-hauhau',
            name: 'Qwen 3.5 9B Uncensored (Aggressive)',
            hf_repo: 'HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive',
            ollama_tag: 'hf.co/HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive:Q4_K_M',
            parameters: '9B',
            quantization: 'Q4_K_M (GGUF)',
            recommended: true,
            ssd_size: '5.8 GB',
            ram_req: '12 GB RAM (16 GB rec.)',
            vram_req: '6.5 GB - 8 GB VRAM',
            cpu_req: '6+ núcleos (Intel i5/i7 / Ryzen 5/7 / Apple M1/M2/M3)',
            target_hardware: 'PCs Gamer, Workstations de desarrollo y auditoría con RTX 3060 / 4060 / RX 6600 o Mac con 16 GB de memoria unificada',
            description: '⭐ RECOMENDADO #3 (Alta Precisión) — Excelente capacidad en C++20, Rust, auditoría ofensiva y planificación multi-herramienta compleja.',
        },
        {
            id: 'gemma-4-e2b-hauhau',
            name: 'Gemma 4 E2B Uncensored (Aggressive)',
            hf_repo: 'HauhauCS/Gemma-4-E2B-Uncensored-HauhauCS-Aggressive',
            ollama_tag: 'hf.co/HauhauCS/Gemma-4-E2B-Uncensored-HauhauCS-Aggressive:Q4_K_M',
            parameters: '2B (E2B)',
            quantization: 'Q4_K_M (GGUF)',
            recommended: false,
            ssd_size: '1.6 GB',
            ram_req: '4 GB RAM',
            vram_req: '2.0 GB VRAM (Funciona en CPU)',
            cpu_req: '4 núcleos x86_64 o ARM',
            target_hardware: 'Equipos portátiles de oficina, Mini PCs y entornos embebidos',
            description: 'Arquitectura Gemma 4 compacta ajustada por HauhauCS sin censura para respuestas directas y rápidas.',
        },
        {
            id: 'gemma-4-e4b-hauhau',
            name: 'Gemma 4 E4B Uncensored (Aggressive)',
            hf_repo: 'HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive',
            ollama_tag: 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M',
            parameters: '4B (E4B)',
            quantization: 'Q4_K_M (GGUF)',
            recommended: false,
            ssd_size: '2.9 GB',
            ram_req: '8 GB RAM',
            vram_req: '4.0 GB VRAM',
            cpu_req: '4 a 6 núcleos modernos',
            target_hardware: 'Laptops con 8 GB de RAM y GPUs de entrada (GTX 1650 / RTX 2060 / Apple Silicon 8GB)',
            description: 'Versión de 4B parámetros de Gemma 4 con excelente comprensión de instrucciones técnicas y scripting.',
        },
        {
            id: 'qwen3vl-8b-hauhau',
            name: 'Qwen 3 VL 8B Uncensored (Aggressive)',
            hf_repo: 'HauhauCS/Qwen3VL-8B-Uncensored-HauhauCS-Aggressive',
            ollama_tag: 'hf.co/HauhauCS/Qwen3VL-8B-Uncensored-HauhauCS-Aggressive:Q4_K_M',
            parameters: '8B',
            quantization: 'Q4_K_M (GGUF)',
            recommended: false,
            ssd_size: '5.2 GB',
            ram_req: '12 GB RAM',
            vram_req: '6.0 GB VRAM',
            cpu_req: '6 núcleos (Intel i5 / Ryzen 5)',
            target_hardware: 'Equipos de escritorio o laptops gaming con GPU dedicada de 6 GB a 8 GB VRAM',
            description: 'Modelo de 8B parámetros con gran ventana de contexto y sólida generación de código en Rust, C++ y Bash.',
        },
        {
            id: 'gemma4-12b-balanced-hauhau',
            name: 'Gemma 4 12B QAT Uncensored (Balanced)',
            hf_repo: 'HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced',
            ollama_tag: 'hf.co/HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced:Q4_K_M',
            parameters: '12B',
            quantization: 'Q4_K_M QAT (GGUF)',
            recommended: false,
            ssd_size: '7.6 GB',
            ram_req: '16 GB RAM',
            vram_req: '8 GB - 10 GB VRAM',
            cpu_req: '8 núcleos (Intel i7 / Ryzen 7)',
            target_hardware: 'Workstations y PCs con RTX 3060 12GB, RTX 4070, RX 6700 XT o Mac de 16GB/24GB',
            description: 'Entrenado con Quantization-Aware Training (QAT) para preservar máxima calidad analítica en 4 bits.',
        },
        {
            id: 'gpt-oss-20b-hauhau',
            name: 'GPT-OSS 20B Uncensored (Aggressive)',
            hf_repo: 'HauhauCS/GPT-OSS-20B-Uncensored-HauhauCS-Aggressive',
            ollama_tag: 'hf.co/HauhauCS/GPT-OSS-20B-Uncensored-HauhauCS-Aggressive:Q4_K_M',
            parameters: '20B',
            quantization: 'Q4_K_M (GGUF)',
            recommended: false,
            ssd_size: '12.5 GB',
            ram_req: '24 GB - 32 GB RAM',
            vram_req: '14 GB - 16 GB VRAM',
            cpu_req: '8+ núcleos de alto rendimiento (AVX2)',
            target_hardware: 'Estaciones de trabajo entusiastas (RTX 3090 / RTX 4080 / RTX 4090 / Mac Studio M2/M3 Max)',
            description: 'Modelo pesado de 20B parámetros para razonamiento profundo y diseño de arquitecturas completas.',
        },
        {
            id: 'qwen3.8-27b-hauhau',
            name: 'Qwen 3.8 27B Uncensored MTP (Aggressive)',
            hf_repo: 'HauhauCS/Qwen3.8-27B-Uncensored-HauhauCS-Aggressive-MTP-GGUF',
            ollama_tag: 'hf.co/HauhauCS/Qwen3.8-27B-Uncensored-HauhauCS-Aggressive-MTP-GGUF:Q4_K_M',
            parameters: '27B',
            quantization: 'Q4_K_M (GGUF)',
            recommended: false,
            ssd_size: '16.8 GB',
            ram_req: '32 GB RAM',
            vram_req: '18 GB - 24 GB VRAM',
            cpu_req: '12+ núcleos (Ryzen 9 / Intel i9 / Threadripper)',
            target_hardware: 'Servidores GPU locales, PCs con RTX 3090 / 4090 (24 GB VRAM) o Apple Silicon 32GB+ RAM',
            description: 'Potencia extrema con Multi-Token Prediction (MTP) para ingeniería inversa y análisis de vulnerabilidades.',
        },
        {
            id: 'qwen3.6-35b-a3b-hauhau',
            name: 'Qwen 3.6 35B-A3B MoE Uncensored (Aggressive)',
            hf_repo: 'HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive',
            ollama_tag: 'hf.co/HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive:Q4_K_M',
            parameters: '35B Total / 3B Activos (MoE)',
            quantization: 'Q4_K_M (GGUF)',
            recommended: false,
            ssd_size: '21.5 GB',
            ram_req: '32 GB RAM',
            vram_req: '20 GB - 24 GB VRAM (o RAM rápida DDR5)',
            cpu_req: '8 a 16 núcleos con memoria DDR5 de alto ancho de banda',
            target_hardware: 'Workstations con 32GB+ RAM DDR5, MacBook Pro M3 Max o GPUs de 24 GB VRAM',
            description: 'Arquitectura Mixture-of-Experts (MoE): conocimiento de un modelo 35B con la velocidad de inferencia de un 3B.',
        },
    ];

    // ===== Estado Global =====
    const state = {
        currentView: 'chat',
        currentMode: 'code',
        currentModel: '',
        models: [],
        installedDetails: [],
        hauhauCatalog: [...DEFAULT_HAUHAU_CATALOG],
        isGenerating: false,
        rawTokens: '',
        currentMsgEl: null,
        currentBubbleEl: null,
        cmdHistory: [],
        cmdHistoryIdx: -1,
        activeSocket: null,
        autoExecSandbox: true,
        allowSudo: false,
        sudoPassword: '',
    };

    // ===== Elementos DOM =====
    const navTabs = document.querySelectorAll('.nav-tab');
    const views = document.querySelectorAll('.workspace-view');
    const viewTitle = document.getElementById('view-title');
    const viewModeBadge = document.getElementById('view-mode-badge');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const modelSelect = document.getElementById('model-select');
    const modelNameDisplay = document.getElementById('model-name-display');
    const modelsBadgeCount = document.getElementById('models-badge-count');
    const openModelsHubBtn = document.getElementById('open-models-hub-btn');
    const quickOpenModelsLink = document.getElementById('quick-open-models-link');
    const modePills = document.querySelectorAll('.mode-pill');
    const newChatBtn = document.getElementById('new-chat-btn');
    const clearChatTopBtn = document.getElementById('clear-chat-top-btn');

    // Autonomous Console & Sudo Controls
    const autoExecToggle = document.getElementById('auto-exec-toggle');
    const sudoControlToggle = document.getElementById('sudo-control-toggle');
    const sudoActiveBanner = document.getElementById('sudo-active-banner');
    const disableSudoBannerBtn = document.getElementById('disable-sudo-banner-btn');
    const sudoModal = document.getElementById('sudo-modal');
    const sudoModalCloseBtn = document.getElementById('sudo-modal-close-btn');
    const sudoCancelBtn = document.getElementById('sudo-cancel-btn');
    const sudoConfirmBtn = document.getElementById('sudo-confirm-btn');
    const sudoModalPassword = document.getElementById('sudo-modal-password');
    const settingSudoPassword = document.getElementById('setting-sudo-password');

    // Embedded Console Drawer
    const embeddedDrawer = document.getElementById('embedded-console-drawer');
    const toggleEmbeddedConsoleBtn = document.getElementById('toggle-embedded-console-btn');
    const embeddedCloseBtn = document.getElementById('embedded-close-btn');
    const embeddedClearBtn = document.getElementById('embedded-clear-btn');
    const embeddedPlanBody = document.getElementById('embedded-plan-body');
    const embeddedTerminalOutput = document.getElementById('embedded-terminal-output');
    const embeddedCmdInput = document.getElementById('embedded-cmd-input');
    const embeddedRunBtn = document.getElementById('embedded-run-btn');
    const embeddedSudoPill = document.getElementById('embedded-sudo-pill');
    const sandboxSudoIndicator = document.getElementById('sandbox-sudo-indicator');

    // Models & HauhauCS View Elements
    const refreshModelsBtn = document.getElementById('refresh-models-btn');
    const hauhauModelSelect = document.getElementById('hauhau-model-select');
    const specRecBadge = document.getElementById('spec-rec-badge');
    const specModelName = document.getElementById('spec-model-name');
    const specOllamaTag = document.getElementById('spec-ollama-tag');
    const specHfLink = document.getElementById('spec-hf-link');
    const specModelDesc = document.getElementById('spec-model-desc');
    const specSsd = document.getElementById('spec-ssd');
    const specRam = document.getElementById('spec-ram');
    const specVram = document.getElementById('spec-vram');
    const specCpu = document.getElementById('spec-cpu');
    const specHardware = document.getElementById('spec-hardware');
    const installHauhauBtn = document.getElementById('install-hauhau-btn');
    const copyOllamaCmdBtn = document.getElementById('copy-ollama-cmd-btn');
    const pullProgressContainer = document.getElementById('pull-progress-container');
    const pullStatusText = document.getElementById('pull-status-text');
    const pullPercentText = document.getElementById('pull-percent-text');
    const pullProgressBarFill = document.getElementById('pull-progress-bar-fill');
    const installedCountPill = document.getElementById('installed-count-pill');
    const installedModelsList = document.getElementById('installed-models-list');
    const hauhauComparisonTbody = document.getElementById('hauhau-comparison-tbody');

    // Chat Elements
    const messagesContainer = document.getElementById('messages');
    const welcomeScreen = document.getElementById('welcome-screen');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const charCount = document.getElementById('char-count');
    const promptChips = document.querySelectorAll('.prompt-chip');

    // Pentest Elements
    const runAuditBtn = document.getElementById('run-audit-btn');
    const metricEuidVal = document.getElementById('metric-euid-val');
    const metricEuidDesc = document.getElementById('metric-euid-desc');
    const metricSudoVal = document.getElementById('metric-sudo-val');
    const metricSudoDesc = document.getElementById('metric-sudo-desc');
    const metricSuidVal = document.getElementById('metric-suid-val');
    const metricKernelVal = document.getElementById('metric-kernel-val');
    const metricKernelDesc = document.getElementById('metric-kernel-desc');
    const suidTableBody = document.getElementById('suid-table-body');
    const suidSearch = document.getElementById('suid-search');
    const interfacesList = document.getElementById('interfaces-list');

    // Files Elements
    const artifactsTableBody = document.getElementById('artifacts-table-body');
    const refreshFilesBtn = document.getElementById('refresh-files-btn');
    const statTotalFiles = document.getElementById('stat-total-files');
    const statTotalSize = document.getElementById('stat-total-size');
    const statLangChips = document.getElementById('stat-lang-chips');
    const filesBadgeCount = document.getElementById('files-badge-count');

    // Terminal Elements
    const terminalScreen = document.getElementById('terminal-screen');
    const terminalCmdInput = document.getElementById('terminal-cmd-input');
    const terminalRunBtn = document.getElementById('terminal-run-btn');
    const clearTerminalBtn = document.getElementById('clear-terminal-btn');
    const terminalWorkingDir = document.getElementById('terminal-working-dir');
    const headerWorkspaceLabel = document.getElementById('header-workspace-label');
    const cmdChips = document.querySelectorAll('.cmd-chip');

    // Settings Elements
    const settingOutputDir = document.getElementById('setting-output-dir');
    const settingSandboxDir = document.getElementById('setting-sandbox-dir');
    const settingOllamaHost = document.getElementById('setting-ollama-host');
    const saveSettingBtns = document.querySelectorAll('.save-setting-btn');
    const testConnectionBtn = document.getElementById('test-connection-btn');
    const testConnectionStatus = document.getElementById('test-connection-status');

    // Modal Elements
    const codeModal = document.getElementById('code-modal');
    const modalFilename = document.getElementById('modal-filename');
    const modalCodeBody = document.getElementById('modal-code-body');
    const modalCopyBtn = document.getElementById('modal-copy-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Sidebar Mobile Toggle
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar');

    // ===== Marked & Highlight.js Setup (100% Local & Offline) =====
    const hasMarked = typeof marked !== 'undefined';
    const hasHljs = typeof hljs !== 'undefined';

    if (hasMarked) {
        marked.setOptions({
            highlight: function(code, lang) {
                if (hasHljs && lang && hljs.getLanguage(lang)) {
                    try { return hljs.highlight(code, { language: lang }).value; } catch (_) {}
                }
                return hasHljs ? hljs.highlightAuto(code).value : escapeHtml(code);
            },
            breaks: true,
            gfm: true,
        });

        const renderer = new marked.Renderer();
        renderer.code = function(code, language) {
            const lang = (language || 'text').toLowerCase();
            let highlighted;
            try {
                if (hasHljs && hljs.getLanguage(lang)) {
                    highlighted = hljs.highlight(code, { language: lang }).value;
                } else if (hasHljs) {
                    highlighted = hljs.highlightAuto(code).value;
                } else {
                    highlighted = escapeHtml(code);
                }
            } catch (_) {
                highlighted = escapeHtml(code);
            }

            let filename = '';
            const lines = code.split('\n');
            if (lines.length > 0) {
                const firstLine = lines[0].trim();
                const match = firstLine.match(/(?:#|\/\/|--|\/\*|<!--)\s*filename:\s*([a-zA-Z0-9_\-\./]+)/i);
                if (match) filename = match[1];
            }

            const encodedCode = encodeURIComponent(code);

            return `<div class="code-block-wrapper">
                <div class="code-block-header">
                    <div class="code-header-left">
                        <span class="code-lang-tag">${escapeHtml(lang)}</span>
                        ${filename ? `<span class="code-filename-tag"><i class="fas fa-file-code"></i> ${escapeHtml(filename)}</span>` : ''}
                    </div>
                    <div class="code-header-actions">
                        <button class="code-action-btn" onclick="copyCodeFromBtn(this, '${encodedCode}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                        <button class="code-action-btn run-btn" onclick="runInEmbeddedSandboxFromBtn('${encodedCode}')">
                            <i class="fas fa-bolt"></i> Ejecutar en Consola Incrustada
                        </button>
                    </div>
                </div>
                <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
            </div>`;
        };
        marked.setOptions({ renderer });
    }

    // ===== Navegación entre Vistas =====
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    openModelsHubBtn?.addEventListener('click', () => switchView('models'));
    quickOpenModelsLink?.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('models');
    });

    function switchView(viewName) {
        state.currentView = viewName;

        navTabs.forEach(t => t.classList.toggle('active', t.dataset.view === viewName));
        views.forEach(v => v.classList.toggle('active', v.id === `view-${viewName}`));

        const titles = {
            chat: 'Asistente AI & Consola Autónoma',
            models: 'Detector de Modelos & Catálogo HauhauCS',
            sandbox: 'Sandbox Terminal Aislado',
            pentest: 'Auditoría & Pentest',
            files: 'Archivos Generados',
            settings: 'Configuración',
        };
        viewTitle.textContent = titles[viewName] || 'Kiru Studio';

        if (viewName === 'files') {
            loadFilesList();
        } else if (viewName === 'models') {
            fetchModelsCatalogRest();
        } else if (viewName === 'pentest') {
            if (metricEuidVal.textContent === 'Verificando...') {
                executeFullAudit();
            }
        } else if (viewName === 'settings') {
            loadConfigData();
        }

        if (window.innerWidth <= 900) {
            sidebar.classList.remove('open');
        }
    }

    toggleSidebarBtn?.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    openSidebarBtn?.addEventListener('click', () => sidebar.classList.add('open'));

    // ===== Control de Consola Incrustada & Sudo Controlado =====
    toggleEmbeddedConsoleBtn?.addEventListener('click', () => {
        if (state.currentView !== 'chat') switchView('chat');
        embeddedDrawer?.classList.toggle('open');
    });
    embeddedCloseBtn?.addEventListener('click', () => embeddedDrawer?.classList.remove('open'));
    embeddedClearBtn?.addEventListener('click', () => {
        if (embeddedTerminalOutput) {
            embeddedTerminalOutput.innerHTML = '<div class="terminal-line system-msg">[Consola Autónoma Limpia]</div>';
        }
    });

    autoExecToggle?.addEventListener('change', () => {
        state.autoExecSandbox = autoExecToggle.checked;
        showToast(
            state.autoExecSandbox
                ? '🤖 Ejecución autónoma en Sandbox activada'
                : 'Ejecución autónoma en pausa (modo confirmación manual)',
            'info'
        );
    });

    // Sudo Controlado con Advertencia Exacta Obligatoria
    sudoControlToggle?.addEventListener('change', (e) => {
        if (sudoControlToggle.checked) {
            // Revertir hasta que el usuario confirme explícitamente la advertencia en el modal
            sudoControlToggle.checked = false;
            sudoModal?.classList.add('open');
        } else {
            setSudoState(false);
        }
    });

    sudoModalCloseBtn?.addEventListener('click', () => sudoModal?.classList.remove('open'));
    sudoCancelBtn?.addEventListener('click', () => sudoModal?.classList.remove('open'));
    sudoConfirmBtn?.addEventListener('click', () => {
        if (sudoModalPassword && sudoModalPassword.value) {
            state.sudoPassword = sudoModalPassword.value;
            if (settingSudoPassword) settingSudoPassword.value = sudoModalPassword.value;
        }
        sudoModal?.classList.remove('open');
        setSudoState(true);
        showToast('⚠️ Modo Sudo Controlado habilitado bajo tu responsabilidad', 'info');
    });

    disableSudoBannerBtn?.addEventListener('click', () => setSudoState(false));

    settingSudoPassword?.addEventListener('input', () => {
        state.sudoPassword = settingSudoPassword.value;
    });

    function setSudoState(enabled) {
        state.allowSudo = Boolean(enabled);
        if (sudoControlToggle) sudoControlToggle.checked = state.allowSudo;
        if (sudoActiveBanner) sudoActiveBanner.style.display = state.allowSudo ? 'flex' : 'none';

        if (embeddedSudoPill) {
            embeddedSudoPill.className = `policy-pill ${state.allowSudo ? 'sudo-on' : 'sudo-off'}`;
            embeddedSudoPill.innerHTML = state.allowSudo
                ? '<i class="fas fa-unlock"></i> Sudo: CONTROLADO'
                : '<i class="fas fa-lock"></i> Sudo: OFF';
        }
        if (sandboxSudoIndicator) {
            sandboxSudoIndicator.className = `policy-pill ${state.allowSudo ? 'sudo-on' : 'sudo-off'}`;
            sandboxSudoIndicator.textContent = state.allowSudo ? 'Sudo Controlado: ACTIVO' : 'Sudo: Desactivado';
        }

        sendWsAction('set_sudo', { allow_sudo: state.allowSudo });
        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'allow_sudo', value: String(state.allowSudo) }),
        }).catch(() => {});
    }

    // ===== Catálogo HauhauCS & Detector de Modelos Instalados =====
    function renderHauhauCatalog() {
        if (!hauhauModelSelect) return;
        const catalog = state.hauhauCatalog.length > 0 ? state.hauhauCatalog : DEFAULT_HAUHAU_CATALOG;

        const recommended = catalog.filter(m => m.recommended);
        const others = catalog.filter(m => !m.recommended);

        hauhauModelSelect.innerHTML = '';

        if (recommended.length > 0) {
            const recGroup = document.createElement('optgroup');
            recGroup.label = '⭐ MODELOS RECOMENDADOS (HauhauCS — Ideales para Kiru)';
            recommended.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `⭐ ${m.name} — [${m.ssd_size} SSD | ${m.ram_req}]`;
                recGroup.appendChild(opt);
            });
            hauhauModelSelect.appendChild(recGroup);
        }

        if (others.length > 0) {
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = '📦 OTROS MODELOS DISPONIBLES EN HUGGINGFACE (HauhauCS)';
            others.forEach(m => {
                const paramsLabel = m.parameters || m.badge || m.variant || 'GGUF';
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.name} (${paramsLabel}) — [${m.ssd_size} SSD | ${m.ram_req}]`;
                otherGroup.appendChild(opt);
            });
            hauhauModelSelect.appendChild(otherGroup);
        }

        if (catalog.length > 0) {
            hauhauModelSelect.value = catalog[0].id;
            updateSelectedHauhauCard(catalog[0].id);
        }

        // Renderizar tabla comparativa completa (con recomendados hasta arriba)
        if (hauhauComparisonTbody) {
            const sorted = [...recommended, ...others];
            hauhauComparisonTbody.innerHTML = sorted.map(m => {
                const isInstalled = state.models.includes(m.ollama_tag);
                const repoName = m.hf_repo || (m.hf_url ? m.hf_url.replace('https://huggingface.co/', '') : 'HauhauCS');
                const paramsLabel = m.parameters || m.badge || m.variant || 'Q4_K_M';
                return `<tr>
                    <td>
                        ${m.recommended ? '<span class="rec-badge" style="margin-right:6px;">⭐ TOP</span>' : ''}
                        <strong>${escapeHtml(m.name)}</strong>
                        <div style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">${escapeHtml(repoName)}</div>
                    </td>
                    <td><span class="lang-pill">${escapeHtml(paramsLabel)}</span></td>
                    <td><strong class="text-cyan">${escapeHtml(m.ssd_size)}</strong></td>
                    <td>${escapeHtml(m.ram_req)}</td>
                    <td>${escapeHtml(m.vram_req)}</td>
                    <td>${escapeHtml(m.cpu_req)}</td>
                    <td style="font-size:12px; color:var(--text-muted); max-width:260px;">${escapeHtml(m.target_hardware)}</td>
                    <td>
                        ${isInstalled
                            ? `<button class="glass-btn-sm text-green" onclick="activateInstalledModel('${escapeHtml(m.ollama_tag)}')"><i class="fas fa-check"></i> Instalado (Usar)</button>`
                            : `<button class="glass-btn-sm text-cyan" onclick="selectAndInstallHauhau('${escapeHtml(m.id)}')"><i class="fas fa-download"></i> Instalar</button>`
                        }
                    </td>
                </tr>`;
            }).join('');
        }
    }

    function updateSelectedHauhauCard(modelId) {
        const catalog = state.hauhauCatalog.length > 0 ? state.hauhauCatalog : DEFAULT_HAUHAU_CATALOG;
        const spec = catalog.find(m => m.id === modelId) || catalog[0];
        if (!spec) return;

        const hfUrl = spec.hf_url || `https://huggingface.co/${spec.hf_repo || 'HauhauCS'}`;
        if (specRecBadge) {
            specRecBadge.style.display = spec.recommended ? 'inline-block' : 'none';
        }
        if (specModelName) specModelName.textContent = spec.name;
        if (specOllamaTag) specOllamaTag.textContent = spec.ollama_tag;
        if (specHfLink) specHfLink.href = hfUrl;
        if (specModelDesc) specModelDesc.textContent = spec.description;
        if (specSsd) specSsd.textContent = spec.ssd_size;
        if (specRam) specRam.textContent = spec.ram_req;
        if (specVram) specVram.textContent = spec.vram_req;
        if (specCpu) specCpu.textContent = spec.cpu_req;
        if (specHardware) specHardware.textContent = spec.target_hardware;
    }

    hauhauModelSelect?.addEventListener('change', () => {
        updateSelectedHauhauCard(hauhauModelSelect.value);
    });

    copyOllamaCmdBtn?.addEventListener('click', () => {
        const catalog = state.hauhauCatalog.length > 0 ? state.hauhauCatalog : DEFAULT_HAUHAU_CATALOG;
        const spec = catalog.find(m => m.id === hauhauModelSelect?.value) || catalog[0];
        if (!spec) return;
        const cmd = `ollama run ${spec.ollama_tag}`;
        navigator.clipboard.writeText(cmd).then(() => {
            showToast(`Comando copiado: ${cmd}`, 'success');
        });
    });

    installHauhauBtn?.addEventListener('click', () => {
        const catalog = state.hauhauCatalog.length > 0 ? state.hauhauCatalog : DEFAULT_HAUHAU_CATALOG;
        const spec = catalog.find(m => m.id === hauhauModelSelect?.value) || catalog[0];
        if (!spec) return;
        startModelPull(spec.ollama_tag);
    });

    window.selectAndInstallHauhau = function(modelId) {
        if (hauhauModelSelect) {
            hauhauModelSelect.value = modelId;
            updateSelectedHauhauCard(modelId);
        }
        const catalog = state.hauhauCatalog.length > 0 ? state.hauhauCatalog : DEFAULT_HAUHAU_CATALOG;
        const spec = catalog.find(m => m.id === modelId);
        if (spec) startModelPull(spec.ollama_tag);
    };

    window.activateInstalledModel = function(modelName) {
        state.currentModel = modelName;
        if (modelSelect) modelSelect.value = modelName;
        if (modelNameDisplay) modelNameDisplay.textContent = modelName;
        sendWsAction('set_model', { model: modelName });
        renderInstalledModels();
        showToast(`Cerebro activo conectado: ${modelName}`, 'success');
    };

    async function startModelPull(ollamaTag) {
        if (pullProgressContainer) pullProgressContainer.style.display = 'block';
        if (pullStatusText) pullStatusText.textContent = `Solicitando a Ollama instalar ${ollamaTag}...`;
        if (pullPercentText) pullPercentText.textContent = '0%';
        if (pullProgressBarFill) pullProgressBarFill.style.width = '5%';
        if (installHauhauBtn) installHauhauBtn.disabled = true;

        if (state.activeSocket && state.activeSocket.readyState === WebSocket.OPEN) {
            sendWsAction('pull_model', { model: ollamaTag });
        } else {
            try {
                const resp = await fetch('/api/ollama/pull', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: ollamaTag }),
                });
                const data = await resp.json();
                if (data.ok) {
                    if (pullStatusText) pullStatusText.textContent = `✅ Instalado: ${ollamaTag}`;
                    if (pullPercentText) pullPercentText.textContent = '100%';
                    if (pullProgressBarFill) pullProgressBarFill.style.width = '100%';
                    showToast(data.message || 'Modelo instalado con éxito', 'success');
                    fetchModelsCatalogRest();
                } else {
                    throw new Error(data.error || 'Fallo al instalar modelo');
                }
            } catch (err) {
                if (pullStatusText) pullStatusText.textContent = `❌ Error: ${err.message}`;
                showToast(`Error instalando modelo: ${err.message}`, 'error');
            } finally {
                if (installHauhauBtn) installHauhauBtn.disabled = false;
            }
        }
    }

    function renderInstalledModels() {
        if (!installedModelsList) return;
        const details = state.installedDetails || [];
        const count = details.length || state.models.length;

        if (modelsBadgeCount) modelsBadgeCount.textContent = count;
        if (installedCountPill) installedCountPill.textContent = `${count} detectado(s)`;

        if (count === 0) {
            installedModelsList.innerHTML = `
                <div class="text-center text-muted" style="padding: 20px;">
                    <i class="fas fa-box-open" style="font-size:24px; margin-bottom:8px; display:block;"></i>
                    No se detectaron modelos instalados en Ollama actualmente.<br>
                    Selecciona uno de los modelos recomendados de <strong>HauhauCS</strong> a la izquierda y pulsa <strong>Instalar Modelo con Ollama</strong>.
                </div>`;
            return;
        }

        const listToRender = details.length > 0
            ? details
            : state.models.map(name => ({
                name,
                size_human: 'Local',
                parameter_size: 'GGUF',
                quantization_level: 'Ollama',
            }));

        installedModelsList.innerHTML = listToRender.map(m => {
            const isCurrent = m.name === state.currentModel;
            return `<div class="installed-model-card ${isCurrent ? 'active-model' : ''}">
                <div class="installed-model-info">
                    <strong>${escapeHtml(m.name)}</strong>
                    <div class="installed-model-meta">
                        <span class="lang-pill"><i class="fas fa-hard-drive text-cyan"></i> ${escapeHtml(m.size_human || 'N/A')}</span>
                        <span class="lang-pill">${escapeHtml(m.parameter_size || 'LLM')}</span>
                        <span class="lang-pill">${escapeHtml(m.quantization || m.quantization_level || 'GGUF')}</span>
                    </div>
                </div>
                <div>
                    ${isCurrent
                        ? '<span class="iface-badge up"><i class="fas fa-bolt"></i> EN USO</span>'
                        : `<button class="glass-btn-sm text-cyan" onclick="activateInstalledModel('${escapeHtml(m.name)}')"><i class="fas fa-plug"></i> Conectar Cerebro</button>`
                    }
                </div>
            </div>`;
        }).join('');
    }

    async function fetchModelsCatalogRest() {
        try {
            const resp = await fetch('/api/models');
            if (resp.ok) {
                const data = await resp.json();
                populateModels(data.models, data.current, data.installed_details, data.hauhau_catalog);
            }
        } catch (_) {}
    }

    refreshModelsBtn?.addEventListener('click', () => {
        sendWsAction('get_models');
        fetchModelsCatalogRest();
        showToast('Detectando modelos instalados en Ollama...', 'info');
    });

    // Inicializar catálogo HauhauCS inmediatamente (100% offline-ready)
    renderHauhauCatalog();

    // ===== Conexión WebSocket Nativa =====
    function initConnection() {
        if (window.location.protocol === 'file:') {
            updateOnlineStatus(false, 'Modo Local (Ejecuta kiru-quick.sh / .ps1 / .cmd)');
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        try {
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => {
                state.activeSocket = ws;
                updateOnlineStatus(true);
                sendWsAction('get_models');
                sendWsAction('get_files');
                sendWsAction('get_config');
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    handleIncomingEvent(msg.event, msg.data);
                } catch (e) {
                    console.error('Error parseando mensaje WS:', e);
                }
            };

            ws.onclose = () => {
                updateOnlineStatus(false, 'Reconectando...');
                state.activeSocket = null;
                setTimeout(initConnection, 3000);
            };

            ws.onerror = () => {
                updateOnlineStatus(false, 'Error WS');
            };
        } catch (e) {
            console.error('Error iniciando WebSocket:', e);
        }
    }

    function sendWsAction(action, payload = {}) {
        if (!state.activeSocket || state.activeSocket.readyState !== WebSocket.OPEN) return;
        state.activeSocket.send(JSON.stringify({ action, ...payload }));
    }

    function handleIncomingEvent(event, data) {
        switch (event) {
            case 'connection_status':
                updateOnlineStatus(data.ok, data.message);
                populateModels(data.models, data.current_model, data.installed_details, data.hauhau_catalog);
                break;
            case 'models_list':
                populateModels(data.models, data.current, data.installed_details, data.hauhau_catalog);
                break;
            case 'model_changed':
                state.currentModel = data.model;
                modelNameDisplay.textContent = data.model;
                renderInstalledModels();
                showToast(`Modelo activo: ${data.model}`, 'info');
                break;
            case 'mode_changed':
                setModeActive(data.mode);
                break;
            case 'sudo_status_changed':
                state.allowSudo = Boolean(data.allow_sudo);
                if (sudoControlToggle) sudoControlToggle.checked = state.allowSudo;
                if (sudoActiveBanner) sudoActiveBanner.style.display = state.allowSudo ? 'flex' : 'none';
                break;
            case 'files_list':
                renderFilesList(data.files);
                break;
            case 'config_loaded':
                applyConfigData(data);
                break;
            case 'config_saved':
                showToast(data.message || 'Configuración guardada', 'success');
                break;
            case 'chat_cleared':
                resetChatUI();
                break;
            case 'chat_event':
                processChatEvent(data);
                break;
            case 'autonomous_command_proposed':
                handleAutonomousCommandProposed(data);
                break;
            case 'sandbox_execution_result':
                renderSandboxResultInEmbeddedConsole(data);
                break;
            case 'model_pull_progress':
                handleModelPullProgress(data);
                break;
            case 'model_pull_error':
                if (installHauhauBtn) installHauhauBtn.disabled = false;
                if (pullStatusText) pullStatusText.textContent = `❌ Error: ${data.error}`;
                showToast(`Error instalando ${data.model}: ${data.error}`, 'error');
                break;
        }
    }

    function handleModelPullProgress(data) {
        if (pullProgressContainer) pullProgressContainer.style.display = 'block';
        const pct = data.percent || 0;
        if (pullStatusText) pullStatusText.textContent = `${data.model}: ${data.status}`;
        if (pullPercentText) pullPercentText.textContent = `${pct}%`;
        if (pullProgressBarFill) pullProgressBarFill.style.width = `${Math.max(5, pct)}%`;

        if (data.done) {
            if (installHauhauBtn) installHauhauBtn.disabled = false;
            if (pullPercentText) pullPercentText.textContent = '100%';
            if (pullProgressBarFill) pullProgressBarFill.style.width = '100%';
            showToast(`✅ Modelo '${data.model}' instalado correctamente en Ollama`, 'success');
            sendWsAction('get_models');
        }
    }

    function updateOnlineStatus(isOnline, msg = '') {
        if (isOnline) {
            statusDot.className = 'pulsing-dot online';
            statusText.textContent = 'En línea';
        } else {
            statusDot.className = 'pulsing-dot offline';
            statusText.textContent = msg || 'Desconectado';
        }
    }

    // ===== Modelos y Modos =====
    function populateModels(models, current, installedDetails, hauhauCatalog) {
        state.models = models || [];
        if (installedDetails) state.installedDetails = installedDetails;
        if (hauhauCatalog && hauhauCatalog.length > 0) {
            state.hauhauCatalog = hauhauCatalog;
        }
        state.currentModel = current || (state.models[0] || '');
        modelSelect.innerHTML = '';

        if (state.models.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Sin modelos (Instala desde HauhauCS)';
            modelSelect.appendChild(opt);
        } else {
            state.models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                if (m === state.currentModel) opt.selected = true;
                modelSelect.appendChild(opt);
            });
            modelNameDisplay.textContent = state.currentModel;
        }

        renderInstalledModels();
        renderHauhauCatalog();
    }

    modelSelect?.addEventListener('change', () => {
        const selected = modelSelect.value;
        if (selected) {
            sendWsAction('set_model', { model: selected });
        }
    });

    modePills.forEach(pill => {
        pill.addEventListener('click', () => {
            const mode = pill.dataset.mode;
            setModeActive(mode);
            sendWsAction('set_mode', { mode });
        });
    });

    function setModeActive(mode) {
        state.currentMode = mode;
        modePills.forEach(p => p.classList.toggle('active', p.dataset.mode === mode));
        viewModeBadge.textContent = `MODO ${mode.toUpperCase()}`;
    }

    // ===== Arquitectura de Control Autónomo de Consola en Sandbox =====
    function extractPlanSummaryFromMarkdown(mdText, command, verdict) {
        const objMatch = mdText.match(/Objetivo\s*\/?\s*Fin:\**\s*([^\n]+)/i);
        const toolsMatch = mdText.match(/Herramientas\s*Requeridas:\**\s*([^\n]+)/i);

        const objective = objMatch
            ? objMatch[1].trim()
            : 'Ejecución técnica solicitada por el usuario en el entorno Sandbox.';
        const toolsList = (verdict?.tools_detected && verdict.tools_detected.length > 0)
            ? verdict.tools_detected.join(', ')
            : (toolsMatch ? toolsMatch[1].trim() : 'bash builtins');

        return { objective, toolsList, command };
    }

    function handleAutonomousCommandProposed(data) {
        const command = data.command || '';
        const verdict = data.verdict || {};
        const plan = extractPlanSummaryFromMarkdown(state.rawTokens, command, verdict);

        // Actualizar tarjeta de Plan de Ejecución en la Consola Incrustada
        if (embeddedPlanBody) {
            const statusBadge = verdict.allowed
                ? (verdict.requires_sudo
                    ? '<span class="policy-pill sudo-on">⚠️ SUDO CONTROLADO</span>'
                    : '<span class="policy-pill safe">✅ VALIDADO POR FIREWALL</span>')
                : '<span class="policy-pill sudo-on">🛡️ BLOQUEADO POR FIREWALL</span>';

            embeddedPlanBody.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>Plan Detectado</strong>
                    ${statusBadge}
                </div>
                <div><span class="text-cyan">🎯 Fin:</span> ${escapeHtml(plan.objective)}</div>
                <div><span class="text-purple">🛠️ Herramientas:</span> <code>${escapeHtml(plan.toolsList)}</code></div>
                <div><span class="text-green">⚡ Comando:</span> <code>${escapeHtml(command.split('\n')[0])}</code></div>
                ${!verdict.allowed ? `<div class="text-red" style="margin-top:4px;"><strong>Motivo bloqueo:</strong> ${escapeHtml(verdict.reason)}</div>` : ''}
            `;
        }

        if (!verdict.allowed) {
            // Mostrar bloqueo de comando dañino o falta de sudo
            appendEmbeddedTerminalLine(`🛡️ [BLOQUEADO] $ ${command}`, 'error-msg');
            appendEmbeddedTerminalLine(verdict.reason, 'error-msg');
            if (state.currentBubbleEl) {
                const blockedCard = document.createElement('div');
                blockedCard.className = 'inline-sandbox-card blocked';
                blockedCard.innerHTML = `
                    <div class="inline-sandbox-header">
                        <span><i class="fas fa-ban"></i> Firewall de Sandbox: Comando Bloqueado</span>
                        <span>Código 126</span>
                    </div>
                    <div class="inline-sandbox-body">${escapeHtml(verdict.reason)}</div>
                `;
                state.currentBubbleEl.appendChild(blockedCard);
            }
            return;
        }

        // Si el modo Auto-Ejecución Sandbox está activo, ejecutar de forma autónoma
        if (state.autoExecSandbox) {
            executeCommandInEmbeddedSandbox(command, true);
        }
    }

    async function executeCommandInEmbeddedSandbox(command, showInlineInChat = false) {
        const cleanCmd = (command || '').trim();
        if (!cleanCmd) return;

        embeddedDrawer?.classList.add('open');
        appendEmbeddedTerminalLine(`kiru@sandbox:~$ ${cleanCmd}`, 'cmd-echo');

        try {
            const resp = await fetch('/api/sandbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: cleanCmd,
                    allow_sudo: state.allowSudo,
                    sudo_password: state.sudoPassword || null,
                }),
            });
            const res = await resp.json();
            renderSandboxResultInEmbeddedConsole(res, showInlineInChat, cleanCmd);
        } catch (err) {
            appendEmbeddedTerminalLine(`Error de ejecución: ${err.message}`, 'error-msg');
        }
    }

    function renderSandboxResultInEmbeddedConsole(res, showInlineInChat = false, cmdText = '') {
        const verdict = res.safety_verdict || {};

        if (verdict && embeddedPlanBody && cmdText) {
            const tools = (verdict.tools_detected || []).join(', ') || 'bash';
            embeddedPlanBody.innerHTML = `
                <div><span class="text-cyan">⚡ Comando:</span> <code>${escapeHtml(cmdText)}</code></div>
                <div><span class="text-purple">🛠️ Herramientas:</span> <code>${escapeHtml(tools)}</code></div>
                <div><span class="text-green">🛡️ Veredicto:</span> ${escapeHtml(verdict.reason || '')}</div>
            `;
        }

        if (res.stdout) appendEmbeddedTerminalLine(res.stdout);
        if (res.stderr) appendEmbeddedTerminalLine(res.stderr, 'error-msg');
        appendEmbeddedTerminalLine(
            `[Exit: ${res.exit_code ?? 0} · ${res.execution_time_ms ?? 0}ms]`,
            'system-msg'
        );

        if (showInlineInChat && state.currentBubbleEl) {
            const isBlocked = res.exit_code === 126 || (verdict && verdict.allowed === false);
            const card = document.createElement('div');
            card.className = `inline-sandbox-card ${isBlocked ? 'blocked' : ''}`;
            const outputText = [res.stdout, res.stderr].filter(Boolean).join('\n').trim() || '(Comando completado sin salida)';
            card.innerHTML = `
                <div class="inline-sandbox-header">
                    <span><i class="fas ${isBlocked ? 'fa-shield-virus' : 'fa-terminal'}"></i> ${isBlocked ? 'Bloqueado por Firewall' : 'Ejecución Autónoma en Sandbox'}</span>
                    <span>Exit: ${res.exit_code ?? 0} (${res.execution_time_ms ?? 0}ms)</span>
                </div>
                <div class="inline-sandbox-body">${escapeHtml(outputText)}</div>
            `;
            state.currentBubbleEl.appendChild(card);
            scrollToBottom();
        }
    }

    function appendEmbeddedTerminalLine(text, className = '') {
        if (!embeddedTerminalOutput) return;
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        line.textContent = text;
        embeddedTerminalOutput.appendChild(line);
        embeddedTerminalOutput.scrollTop = embeddedTerminalOutput.scrollHeight;
    }

    embeddedRunBtn?.addEventListener('click', () => {
        const cmd = embeddedCmdInput?.value.trim();
        if (cmd) {
            embeddedCmdInput.value = '';
            executeCommandInEmbeddedSandbox(cmd, false);
        }
    });

    embeddedCmdInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = embeddedCmdInput.value.trim();
            if (cmd) {
                embeddedCmdInput.value = '';
                executeCommandInEmbeddedSandbox(cmd, false);
            }
        }
    });

    window.runInEmbeddedSandboxFromBtn = function(encodedCode) {
        const code = decodeURIComponent(encodedCode).trim();
        executeCommandInEmbeddedSandbox(code, true);
    };

    // ===== Chat Flow =====
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || state.isGenerating) return;

        if (welcomeScreen) welcomeScreen.style.display = 'none';

        appendUserMessage(text);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        charCount.textContent = '0 chars';
        sendBtn.disabled = true;

        initAssistantMessage();
        state.isGenerating = true;

        sendWsAction('send_message', { message: text });
    }

    sendBtn?.addEventListener('click', sendMessage);

    messageInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput?.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
        const len = messageInput.value.length;
        charCount.textContent = `${len} chars`;
        sendBtn.disabled = len === 0 || state.isGenerating;
    });

    promptChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            messageInput.value = prompt;
            messageInput.dispatchEvent(new Event('input'));
            messageInput.focus();
        });
    });

    newChatBtn?.addEventListener('click', () => {
        sendWsAction('clear_chat');
        resetChatUI();
    });

    clearChatTopBtn?.addEventListener('click', () => {
        sendWsAction('clear_chat');
        resetChatUI();
    });

    function resetChatUI() {
        messagesContainer.innerHTML = '';
        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
            messagesContainer.appendChild(welcomeScreen);
        }
        state.isGenerating = false;
        state.rawTokens = '';
        state.currentMsgEl = null;
        state.currentBubbleEl = null;
        sendBtn.disabled = messageInput.value.trim().length === 0;
    }

    function appendUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg user';
        msgDiv.innerHTML = `
            <div class="msg-avatar"><i class="fas fa-user"></i></div>
            <div class="msg-body">
                <div class="msg-bubble">${escapeHtml(text)}</div>
            </div>
        `;
        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
    }

    function initAssistantMessage() {
        state.rawTokens = '';
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg assistant';
        msgDiv.innerHTML = `
            <div class="msg-avatar"><img src="assets/apariencia.jpeg" alt="Kiru" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.src='static/img/apariencia.jpeg'"></div>
            <div class="msg-body">
                <div class="msg-bubble"><span class="thinking-badge"><i class="fas fa-spinner fa-spin"></i> Preparando Plan de Ejecución...</span></div>
            </div>
        `;
        messagesContainer.appendChild(msgDiv);
        state.currentMsgEl = msgDiv;
        state.currentBubbleEl = msgDiv.querySelector('.msg-bubble');
        scrollToBottom();
    }

    function processChatEvent(evt) {
        if (!state.currentBubbleEl) return;

        switch (evt.type) {
            case 'thinking':
                state.currentBubbleEl.innerHTML = `<span class="thinking-badge"><i class="fas fa-brain text-cyan"></i> ${escapeHtml(evt.content)}</span>`;
                scrollToBottom();
                break;

            case 'token':
                const badge = state.currentBubbleEl.querySelector('.thinking-badge');
                if (badge) badge.remove();

                state.rawTokens += evt.content;
                state.currentBubbleEl.innerHTML = hasMarked
                    ? marked.parse(state.rawTokens)
                    : `<pre style="white-space:pre-wrap;">${escapeHtml(state.rawTokens)}</pre>`;
                scrollToBottom();
                break;

            case 'code_detected':
                if (evt.blocks && evt.blocks.length > 0) {
                    showToast(`💾 ${evt.blocks.length} archivo(s) guardado(s) en disco`, 'success');
                    loadFilesList();
                }
                break;

            case 'status':
                state.currentBubbleEl.innerHTML += `<div class="terminal-line system-msg" style="margin-top:6px;">${escapeHtml(evt.content)}</div>`;
                scrollToBottom();
                break;

            case 'done':
                state.isGenerating = false;
                sendBtn.disabled = messageInput.value.trim().length === 0;
                break;

            case 'error':
                state.isGenerating = false;
                state.currentBubbleEl.innerHTML += `<div class="terminal-line error-msg"><i class="fas fa-triangle-exclamation"></i> ${escapeHtml(evt.content)}</div>`;
                showToast(evt.content, 'error');
                sendBtn.disabled = messageInput.value.trim().length === 0;
                break;
        }
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // ===== PENTEST & SECURITY SUITE =====
    runAuditBtn?.addEventListener('click', executeFullAudit);

    async function executeFullAudit() {
        runAuditBtn.disabled = true;
        runAuditBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Auditando...</span>';

        try {
            const resp = await fetch('/api/audit');
            if (!resp.ok) throw new Error('Error al consultar /api/audit');
            const data = await resp.json();

            const priv = data.privileges;
            metricEuidVal.textContent = priv.is_root ? 'ROOT (Peligro)' : `No-Root (EUID: ${priv.euid})`;
            metricEuidVal.style.color = priv.is_root ? 'var(--accent-red)' : 'var(--accent-green)';
            metricEuidDesc.textContent = priv.is_root ? 'Acceso administrativo total' : 'Usuario con privilegios estándar';

            metricSudoVal.textContent = priv.sudo_possible ? 'VULNERABLE (NOPASSWD)' : 'CONTROLADO';
            metricSudoVal.style.color = priv.sudo_possible ? 'var(--accent-red)' : 'var(--text-main)';
            metricSudoDesc.textContent = priv.sudo_status;

            metricSuidVal.textContent = priv.suid_binaries_count;
            renderSuidTable(priv.suid_samples);

            const kern = data.kernel;
            metricKernelVal.textContent = kern.release;
            metricKernelDesc.textContent = kern.warning || `Arquitectura ${kern.arch} verificada`;
            if (kern.warning) metricKernelVal.style.color = 'var(--accent-amber)';

            renderInterfaces(data.network_interfaces);
            showToast('Auditoría de seguridad completada con éxito', 'success');
        } catch (e) {
            showToast(`Error al ejecutar auditoría: ${e.message}`, 'error');
        } finally {
            runAuditBtn.disabled = false;
            runAuditBtn.innerHTML = '<i class="fas fa-play"></i> <span>Ejecutar Auditoría Completa</span>';
        }
    }

    function renderSuidTable(samples) {
        if (!samples || samples.length === 0) {
            suidTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No se detectaron binarios SUID</td></tr>';
            return;
        }

        const lolbasCheck = ['bash', 'sh', 'find', 'awk', 'less', 'more', 'vi', 'vim', 'nano', 'python', 'perl', 'ruby', 'nmap', 'env', 'pkexec'];

        suidTableBody.innerHTML = samples.map(path => {
            const filename = path.split('/').pop().toLowerCase();
            const isLolbas = lolbasCheck.includes(filename);

            return `<tr>
                <td><code>${escapeHtml(path)}</code></td>
                <td><span class="iface-badge down">rwsr-xr-x</span></td>
                <td>
                    ${isLolbas
                        ? '<span class="iface-badge down"><i class="fas fa-triangle-exclamation"></i> ALTO (LOLBAS)</span>'
                        : '<span class="iface-badge up">Normal</span>'}
                </td>
                <td>
                    <button class="glass-btn-sm" onclick="askAiAboutBinary('${escapeHtml(path)}')">
                        <i class="fas fa-sparkles"></i> Analizar con IA
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    suidSearch?.addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        const rows = suidTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filter) ? '' : 'none';
        });
    });

    function renderInterfaces(ifaces) {
        if (!ifaces || ifaces.length === 0) {
            interfacesList.innerHTML = '<p class="text-muted">No hay interfaces disponibles</p>';
            return;
        }

        interfacesList.innerHTML = ifaces.map(i => `
            <div class="iface-card">
                <div>
                    <strong>${escapeHtml(i.name)}</strong>
                    <div style="font-size: 11px; color: var(--text-dim);">${escapeHtml(i.mac || 'Sin MAC')}</div>
                </div>
                <span class="iface-badge ${i.is_up ? 'up' : 'down'}">${i.is_up ? 'UP / ACTIVA' : 'DOWN'}</span>
            </div>
        `).join('');
    }

    // ===== GESTOR DE ARCHIVOS =====
    refreshFilesBtn?.addEventListener('click', loadFilesList);

    async function loadFilesList() {
        if (window.location.protocol === 'file:') return;
        try {
            const resp = await fetch('/api/files');
            if (resp.ok) {
                const data = await resp.json();
                renderFilesList(data.files || []);
            }
            const statsResp = await fetch('/api/stats');
            if (statsResp.ok) {
                const stats = await statsResp.json();
                statTotalFiles.textContent = stats.total_files || 0;
                statTotalSize.textContent = stats.total_size_human || '0 KB';
                filesBadgeCount.textContent = stats.total_files || 0;

                if (stats.languages) {
                    statLangChips.innerHTML = Object.entries(stats.languages)
                        .map(([lang, count]) => `<span class="lang-pill">${escapeHtml(lang)}: ${count}</span>`)
                        .join('') || '<span class="lang-pill">Sin datos</span>';
                }
            }
        } catch (e) {
            console.error('Error cargando archivos:', e);
        }
    }

    function renderFilesList(files) {
        if (!artifactsTableBody) return;

        if (!files || files.length === 0) {
            artifactsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay archivos generados aún</td></tr>';
            return;
        }

        artifactsTableBody.innerHTML = files.map(f => `
            <tr>
                <td><strong>${escapeHtml(f.name)}</strong></td>
                <td><span class="lang-pill">${escapeHtml(f.extension || 'txt')}</span></td>
                <td>${escapeHtml(f.size_human)}</td>
                <td>${escapeHtml(f.modified)}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <a href="/api/files/${encodeURIComponent(f.name)}" download class="glass-btn-sm" title="Descargar">
                            <i class="fas fa-download"></i>
                        </a>
                        <button class="glass-btn-sm" onclick="previewFile('${encodeURIComponent(f.name)}')" title="Ver contenido">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="glass-btn-sm" style="color:var(--accent-red);" onclick="deleteFile('${encodeURIComponent(f.name)}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    window.previewFile = async function(filename) {
        try {
            const resp = await fetch(`/api/files/${filename}`);
            if (resp.ok) {
                const content = await resp.text();
                modalFilename.textContent = decodeURIComponent(filename);
                modalCodeBody.textContent = content;
                delete modalCodeBody.dataset.highlighted;
                if (hasHljs) hljs.highlightElement(modalCodeBody);
                codeModal.classList.add('open');
            }
        } catch (e) {
            showToast('Error abriendo archivo', 'error');
        }
    };

    window.deleteFile = async function(filename) {
        if (!confirm(`¿Eliminar ${decodeURIComponent(filename)}?`)) return;
        try {
            const resp = await fetch(`/api/files/${filename}`, { method: 'DELETE' });
            if (resp.ok) {
                showToast('Archivo eliminado', 'info');
                loadFilesList();
            }
        } catch (e) {
            showToast('Error al eliminar', 'error');
        }
    };

    modalCloseBtn?.addEventListener('click', () => codeModal.classList.remove('open'));
    codeModal?.addEventListener('click', (e) => {
        if (e.target === codeModal) codeModal.classList.remove('open');
    });

    modalCopyBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(modalCodeBody.textContent).then(() => {
            showToast('Código copiado al portapapeles', 'success');
        });
    });

    // ===== TERMINAL CONSOLE (VIEW SANDBOX) =====
    function runTerminalCommand(cmd) {
        const cleanCmd = (cmd || terminalCmdInput.value).trim();
        if (!cleanCmd) return;

        state.cmdHistory.push(cleanCmd);
        state.cmdHistoryIdx = state.cmdHistory.length;

        appendTerminalLine(`kiru@sandbox:~$ ${cleanCmd}`, 'cmd-echo');
        terminalCmdInput.value = '';

        fetch('/api/sandbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: cleanCmd,
                allow_sudo: state.allowSudo,
                sudo_password: state.sudoPassword || null,
            })
        })
        .then(r => r.json())
        .then(res => {
            if (res.safety_verdict && res.safety_verdict.tools_detected?.length > 0) {
                appendTerminalLine(
                    `[Herramientas detectadas: ${res.safety_verdict.tools_detected.join(', ')}]`,
                    'system-msg'
                );
            }
            if (res.stdout) appendTerminalLine(res.stdout);
            if (res.stderr) appendTerminalLine(res.stderr, 'error-msg');
            appendTerminalLine(`[Exit code: ${res.exit_code ?? 0} · ${res.execution_time_ms}ms]`, 'system-msg');
        })
        .catch(err => {
            appendTerminalLine(`Error ejecutando comando: ${err.message}`, 'error-msg');
        });
    }

    terminalRunBtn?.addEventListener('click', () => runTerminalCommand());
    terminalCmdInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            runTerminalCommand();
        } else if (e.key === 'ArrowUp') {
            if (state.cmdHistory.length > 0 && state.cmdHistoryIdx > 0) {
                state.cmdHistoryIdx--;
                terminalCmdInput.value = state.cmdHistory[state.cmdHistoryIdx];
            }
        } else if (e.key === 'ArrowDown') {
            if (state.cmdHistoryIdx < state.cmdHistory.length - 1) {
                state.cmdHistoryIdx++;
                terminalCmdInput.value = state.cmdHistory[state.cmdHistoryIdx];
            } else {
                state.cmdHistoryIdx = state.cmdHistory.length;
                terminalCmdInput.value = '';
            }
        }
    });

    clearTerminalBtn?.addEventListener('click', () => {
        terminalScreen.innerHTML = '<div class="terminal-line system-msg">[Consola limpia]</div>';
    });

    cmdChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const cmd = chip.dataset.cmd;
            terminalCmdInput.value = cmd;
            runTerminalCommand(cmd);
        });
    });

    function appendTerminalLine(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        line.textContent = text;
        terminalScreen.appendChild(line);
        terminalScreen.scrollTop = terminalScreen.scrollHeight;
    }

    // ===== CONFIGURACIÓN =====
    async function loadConfigData() {
        if (window.location.protocol === 'file:') return;
        try {
            const resp = await fetch('/api/config');
            if (resp.ok) {
                const data = await resp.json();
                applyConfigData(data);
            }
        } catch (_) {}
    }

    function applyConfigData(data) {
        if (data.output_dir && settingOutputDir) settingOutputDir.value = data.output_dir;
        if (data.sandbox_dir) {
            if (settingSandboxDir) settingSandboxDir.value = data.sandbox_dir;
            if (terminalWorkingDir) terminalWorkingDir.textContent = data.sandbox_dir;
            if (headerWorkspaceLabel) headerWorkspaceLabel.textContent = data.sandbox_dir;
        }
        if (data.ollama_host && settingOllamaHost) settingOllamaHost.value = data.ollama_host;
        if (typeof data.allow_sudo === 'boolean') {
            state.allowSudo = data.allow_sudo;
            if (sudoControlToggle) sudoControlToggle.checked = state.allowSudo;
            if (sudoActiveBanner) sudoActiveBanner.style.display = state.allowSudo ? 'flex' : 'none';
        }
    }

    saveSettingBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const key = btn.dataset.key;
            const inputId = btn.dataset.input;
            const inputEl = document.getElementById(inputId);
            const value = inputEl ? inputEl.value.trim() : '';

            try {
                const resp = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key, value })
                });
                if (resp.ok) {
                    showToast(`Ajuste ${key} guardado`, 'success');
                    if (key === 'sandbox_dir') {
                        terminalWorkingDir.textContent = value;
                        headerWorkspaceLabel.textContent = value;
                    }
                }
            } catch (e) {
                showToast(`Error al guardar: ${e.message}`, 'error');
            }
        });
    });

    testConnectionBtn?.addEventListener('click', async () => {
        testConnectionStatus.textContent = 'Verificando...';
        try {
            const resp = await fetch('/api/health');
            const data = await resp.json();
            if (data.ok) {
                testConnectionStatus.textContent = `✅ Conectado (${data.models ? data.models.length : 0} modelos detectados)`;
                testConnectionStatus.style.color = 'var(--accent-green)';
            } else {
                testConnectionStatus.textContent = `❌ ${data.message}`;
                testConnectionStatus.style.color = 'var(--accent-red)';
            }
        } catch (e) {
            testConnectionStatus.textContent = `❌ Error: ${e.message}`;
            testConnectionStatus.style.color = 'var(--accent-red)';
        }
    });

    // ===== Utilidades Globales =====
    window.copyCodeFromBtn = function(btn, encodedCode) {
        const code = decodeURIComponent(encodedCode);
        navigator.clipboard.writeText(code).then(() => {
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-cyan"></i> Copiado!';
            setTimeout(() => { btn.innerHTML = orig; }, 1800);
            showToast('Código copiado al portapapeles', 'success');
        });
    };

    window.askAiAboutBinary = function(binPath) {
        switchView('chat');
        const prompt = `Prepara un Plan de Ejecución Autónomo con Objetivo, Herramientas Requeridas y Comando para analizar el binario con bit SUID '${binPath}' en el Sandbox.`;
        messageInput.value = prompt;
        sendMessage();
    };

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            info: 'fa-circle-info',
        };

        toast.innerHTML = `<i class="fas ${icons[type] || 'fa-info'}"></i> <span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Iniciar conexión al cargar
    initConnection();
    loadFilesList();
    fetchModelsCatalogRest();
});
