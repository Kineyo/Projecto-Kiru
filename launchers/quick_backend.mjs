#!/usr/bin/env node
/**
 * ============================================================================
 * Project Kiru v2.0 — Zero-Dependency Quick Test Backend (Node.js ESM)
 * ============================================================================
 * Permite probar la interfaz web 100% offline, el Controlador Autónomo de
 * Consola Sandbox (con Firewall Anti-Destructivo y Plan de Ejecución IA) y el
 * Instalador de Modelos HauhauCS (https://huggingface.co/HauhauCS) vía Ollama
 * directamente desde el navegador ANTES de compilar el núcleo en Rust o C++20.
 * ============================================================================
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { exec, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = parseInt(process.env.KIRU_PORT || '5000', 10);
const HOST = process.env.KIRU_HOST || '127.0.0.1';

// Advertencia exacta requerida para uso controlado de sudo
const SUDO_WARNING_TEXT =
    'Darle comandos de superusuario puede resultar en la perdida de archivos importantes, daños, y uso de comandos peligrosos. Solo debe usarse en entorno controlados y comprendiendo por completo los riesgos que puede significar';

// Estado en memoria del servidor rápido
const state = {
    ollamaHost: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    currentModel: 'hf.co/HauhauCS/Qwen3.5-4B-Uncensored-HauhauCS-Aggressive:Q4_K_M',
    currentMode: 'code',
    outputDir: path.join(os.homedir(), 'Documentos', 'Kiru-Output'),
    sandboxDir: path.join(os.tmpdir(), 'kiru-sandbox'),
    allowSudo: false,
    chatHistory: [],
};

// Asegurar directorios de trabajo y sandbox simulado
fs.mkdirSync(state.outputDir, { recursive: true });
fs.mkdirSync(state.sandboxDir, { recursive: true });

// ============================================================================
// Catálogo Oficial de Modelos de https://huggingface.co/HauhauCS
// (Los modelos recomendados aparecen hasta arriba)
// ============================================================================
const HAUHAU_CATALOG = [
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

// ============================================================================
// Firewall de Seguridad para Sandbox y Detección de Herramientas
// ============================================================================
const FORBIDDEN_RULES = [
    {
        re: /(?:^|\s|;|&&|\|\|)(?:sudo\s+)?rm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive)\s+(?:\/|\/\*|\/bin|\/boot|\/dev|\/etc|\/home|\/lib|\/lib64|\/proc|\/root|\/sbin|\/sys|\/usr|\/var|~|\$HOME)(?:\s|$|;|\/)/i,
        reason: 'PROHIBIDO: Intento de borrado recursivo del sistema operativo o directorios críticos (rm -rf /).',
    },
    {
        re: /--no-preserve-root/i,
        reason: 'PROHIBIDO: El uso de --no-preserve-root está estrictamente bloqueado por la directiva de protección del sistema.',
    },
    {
        re: /(?:^|\s|;|&&|\|\|)(?:sudo\s+)?(?:mkfs(?:\.[a-z0-9]+)?|wipefs|fdisk|parted|cfdisk|sfdisk)\b/i,
        reason: 'PROHIBIDO: Formateo o alteración de tablas de particiones de disco bloqueado en el entorno Sandbox.',
    },
    {
        re: /(?:^|\s|;|&&|\|\|)(?:sudo\s+)?dd\s+.*of=\/dev\/(?:sd[a-z]|nvme[0-9]n[0-9]|vd[a-z]|hd[a-z]|loop[0-9]|mem|kmem)/i,
        reason: 'PROHIBIDO: Escritura directa a bloques de dispositivo (/dev/*) mediante dd.',
    },
    {
        re: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
        reason: 'PROHIBIDO: Detección de Fork Bomb contra el sistema.',
    },
    {
        re: /(?:^|\s|;|&&|\|\|)(?:sudo\s+)?(?:shutdown|reboot|poweroff|halt|init\s+[06]|systemctl\s+(?:poweroff|reboot|halt))\b/i,
        reason: 'PROHIBIDO: Comandos de apagado o reinicio del sistema anfitrión no permitidos en el Sandbox.',
    },
    {
        re: /(?:^|\s|;|&&|\|\|)(?:sudo\s+)?(?:chmod|chown)\s+(?:-R|--recursive)\s+.*\s+\/(?:\s|$)/i,
        reason: 'PROHIBIDO: Modificación masiva de permisos o propietarios sobre la raíz del sistema (/).',
    },
    {
        re: />\s*\/dev\/(?:sd[a-z]|nvme[0-9]n[0-9]|vd[a-z])/i,
        reason: 'PROHIBIDO: Redirección destructiva directa hacia dispositivos de almacenamiento.',
    },
    {
        re: /(?:^|\s|;|&&|\|\|)(?:sudo\s+)?(?:shred|lvremove|vgremove|pvremove|zpool\s+destroy)\b/i,
        reason: 'PROHIBIDO: Destrucción de volúmenes lógicos o borrado seguro de bloques del sistema.',
    },
    {
        re: /\/proc\/sysrq-trigger/i,
        reason: 'PROHIBIDO: Escritura en /proc/sysrq-trigger bloqueada.',
    },
];

const SHELL_BUILTINS = new Set([
    'echo', 'cd', 'pwd', 'export', 'unset', 'set', 'alias', 'true', 'false',
    'test', 'printf', 'read', 'ulimit', 'umask', 'wait', 'eval', 'exec', 'source',
    'if', 'then', 'else', 'fi', 'for', 'in', 'do', 'done', 'while', 'case', 'esac',
]);

function detectTools(command) {
    const tools = [];
    const seen = new Set();
    const segments = command.split(/[|;&]+/);

    for (const seg of segments) {
        const tokens = seg.trim().split(/\s+/).filter(Boolean);
        let idx = 0;
        while (idx < tokens.length && tokens[idx].includes('=') && !tokens[idx].startsWith('-')) {
            idx++;
        }
        if (idx < tokens.length && tokens[idx] === 'sudo') {
            idx++;
            while (idx < tokens.length && tokens[idx].startsWith('-')) {
                idx++;
            }
        }
        if (idx < tokens.length) {
            const rawBin = tokens[idx].replace(/^['"(]+|['");]+$/g, '');
            const binName = path.basename(rawBin);
            if (
                binName &&
                /^[a-zA-Z0-9._+-]+$/.test(binName) &&
                !SHELL_BUILTINS.has(binName) &&
                !seen.has(binName)
            ) {
                seen.add(binName);
                tools.push(binName);
            }
        }
    }
    return tools;
}

function validateCommand(command, allowSudo = false) {
    const trimmed = (command || '').trim();
    const toolsDetected = detectTools(trimmed);

    if (!trimmed) {
        return {
            allowed: false,
            requires_sudo: false,
            risk_level: 'blocked',
            reason: 'El comando está vacío.',
            tools_detected: [],
            sudo_warning: null,
        };
    }

    for (const rule of FORBIDDEN_RULES) {
        if (rule.re.test(trimmed)) {
            return {
                allowed: false,
                requires_sudo: false,
                risk_level: 'blocked',
                reason: rule.reason,
                tools_detected: toolsDetected,
                sudo_warning: null,
            };
        }
    }

    const usesSudo = /(?:^|\s|;|&&|\|\|)sudo\b/.test(trimmed);
    if (usesSudo) {
        if (!allowSudo) {
            return {
                allowed: false,
                requires_sudo: true,
                risk_level: 'elevated_sudo',
                reason: `Comando requiere privilegios de superusuario (sudo), pero el modo Sudo Controlado está desactivado. ${SUDO_WARNING_TEXT}`,
                tools_detected: toolsDetected,
                sudo_warning: SUDO_WARNING_TEXT,
            };
        }
        return {
            allowed: true,
            requires_sudo: true,
            risk_level: 'elevated_sudo',
            reason: 'Ejecución con Sudo Controlado autorizada bajo responsabilidad del usuario.',
            tools_detected: toolsDetected,
            sudo_warning: SUDO_WARNING_TEXT,
        };
    }

    return {
        allowed: true,
        requires_sudo: false,
        risk_level: 'safe',
        reason: 'Comando validado por el Firewall de Sandbox Simulado de Kiru.',
        tools_detected: toolsDetected,
        sudo_warning: null,
    };
}

function executeInSandbox(command, workdir, allowSudo = false, sudoPassword = null) {
    return new Promise((resolve) => {
        const start = Date.now();
        const verdict = validateCommand(command, allowSudo);

        if (!verdict.allowed) {
            return resolve({
                stdout: '',
                stderr: `🛡️ [KIRU SANDBOX FIREWALL BLOCKED]\n${verdict.reason}`,
                exit_code: 126,
                timed_out: false,
                execution_time_ms: Date.now() - start,
                safety_verdict: verdict,
            });
        }

        const sandboxEnvDir = path.join(workdir || state.sandboxDir);
        fs.mkdirSync(sandboxEnvDir, { recursive: true });

        let effectiveCmd = command.trim();
        let stdinData = null;

        if (verdict.requires_sudo && sudoPassword) {
            effectiveCmd = effectiveCmd.replace(/\bsudo\b/, 'sudo -S -p ""');
            stdinData = `${sudoPassword}\n`;
        }

        const child = spawn('bash', ['-c', effectiveCmd], {
            cwd: sandboxEnvDir,
            env: {
                ...process.env,
                KIRU_SANDBOX: '1',
                KIRU_SANDBOX_ROOT: sandboxEnvDir,
                HISTFILE: '/dev/null',
            },
        });

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
        }, 30000);

        if (stdinData && child.stdin) {
            child.stdin.write(stdinData);
            child.stdin.end();
        }

        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });

        child.on('close', (code) => {
            clearTimeout(timer);
            if (verdict.requires_sudo) {
                stderr = `⚠️ [ADVERTENCIA SUDO]: ${SUDO_WARNING_TEXT}\n${stderr}`.trim();
            }
            resolve({
                stdout,
                stderr: timedOut ? '⏱️ Timeout: El comando excedió el límite de 30 segundos en el Sandbox.' : stderr,
                exit_code: timedOut ? -1 : (code ?? 0),
                timed_out: timedOut,
                execution_time_ms: Date.now() - start,
                safety_verdict: verdict,
            });
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            resolve({
                stdout: '',
                stderr: `Error al invocar proceso en Sandbox: ${err.message}`,
                exit_code: -1,
                timed_out: false,
                execution_time_ms: Date.now() - start,
                safety_verdict: verdict,
            });
        });
    });
}

// ============================================================================
// System Prompt con Plan de Ejecución Obligatorio
// ============================================================================
function getSystemPrompt(mode) {
    return `Eres Kiru, un asistente técnico de inteligencia artificial con una arquitectura incrustada de control autónomo de consola en un entorno simulado de Sandbox.

DIRECTIVA OBLIGATORIA DE PLANIFICACIÓN ANTES DE USAR LA CONSOLA (MODO: ${mode.toUpperCase()}):
Siempre que propongas o vayas a ejecutar comandos en la consola del Sandbox, ESTÁS OBLIGADO a preparar y presentar primero un PLAN CLARO Y ESTRUCTURADO antes del bloque de código con el siguiente formato exacto:

### 📋 Plan de Ejecución Autónomo
- **🎯 Objetivo / Fin:** [Explica claramente qué se busca lograr con este comando y por qué es necesario]
- **🛠️ Herramientas Requeridas:** [Lista los binarios/paquetes que requiere el comando, ej: \`nmap\`, \`iproute2\`, \`gcc\`, \`cargo\`, \`findutils\`]
- **⚡ Comando a Ejecutar:** [Menciona el comando exacto y explica qué hace cada flag]
- **🛡️ Nivel de Privilegio:** [Usuario Estándar en Sandbox | Requiere Sudo Controlado]

REGLAS ESTRICTAS DE SEGURIDAD DEL SANDBOX:
1. PROHIBIDO usar comandos destructivos que dañen o borren el sistema operativo (\`rm -rf /\`, \`mkfs\`, \`dd of=/dev/*\`, \`wipefs\`, \`shutdown\`, \`reboot\`, fork bombs, etc.).
2. Si un comando requiere \`sudo\`, advierte explícitamente: "${SUDO_WARNING_TEXT}".
3. Después de tu Plan de Ejecución, coloca el comando dentro de un bloque \`\`\`bash ... \`\`\` para que el Controlador Autónomo de Consola de Kiru lo valide y ejecute en el Sandbox.`;
}

// ============================================================================
// Funciones Auxiliares de Ollama
// ============================================================================
async function fetchOllamaModels() {
    try {
        const res = await fetch(`${state.ollamaHost}/api/tags`, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) return { ok: false, models: [], details: [] };
        const data = await res.json();
        const details = (data.models || []).map((m) => {
            const bytes = m.size || 0;
            const gb = bytes / 1073741824;
            const sizeHuman = gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / 1048576).toFixed(0)} MB`;
            return {
                name: m.name,
                size_bytes: bytes,
                size_human: sizeHuman,
                family: m.details?.family || 'LLM',
                parameter_size: m.details?.parameter_size || 'N/A',
                quantization_level: m.details?.quantization_level || 'GGUF',
                modified_at: m.modified_at || '',
            };
        });
        const names = details.map((d) => d.name);
        if (names.length > 0 && !names.includes(state.currentModel)) {
            state.currentModel = names[0];
        }
        return { ok: true, models: names, details };
    } catch {
        return { ok: false, models: [], details: [] };
    }
}

// ============================================================================
// Implementación RFC 6455 WebSocket Nativa (Cero Dependencias)
// ============================================================================
function sendWsFrame(socket, payloadObj) {
    if (socket.destroyed || !socket.writable) return;
    const json = JSON.stringify(payloadObj);
    const data = Buffer.from(json, 'utf8');
    const len = data.length;

    let header;
    if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81; // FIN + Text Frame
        header[1] = len;
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    socket.write(Buffer.concat([header, data]));
}

function parseWsFrames(buffer) {
    const messages = [];
    let offset = 0;

    while (offset + 2 <= buffer.length) {
        const byte1 = buffer[offset];
        const byte2 = buffer[offset + 1];
        const opcode = byte1 & 0x0f;
        const isMasked = (byte2 & 0x80) !== 0;
        let payloadLen = byte2 & 0x7f;
        let headerLen = 2;

        if (payloadLen === 126) {
            if (offset + 4 > buffer.length) break;
            payloadLen = buffer.readUInt16BE(offset + 2);
            headerLen = 4;
        } else if (payloadLen === 127) {
            if (offset + 10 > buffer.length) break;
            payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
            headerLen = 10;
        }

        const maskLen = isMasked ? 4 : 0;
        if (offset + headerLen + maskLen + payloadLen > buffer.length) break;

        const mask = isMasked ? buffer.subarray(offset + headerLen, offset + headerLen + 4) : null;
        const payload = Buffer.from(
            buffer.subarray(offset + headerLen + maskLen, offset + headerLen + maskLen + payloadLen)
        );

        if (isMasked && mask) {
            for (let i = 0; i < payload.length; i++) {
                payload[i] ^= mask[i % 4];
            }
        }

        offset += headerLen + maskLen + payloadLen;
        if (opcode === 0x01) {
            messages.push({ type: 'text', data: payload.toString('utf8') });
        } else if (opcode === 0x08) {
            messages.push({ type: 'close' });
        } else if (opcode === 0x09) {
            messages.push({ type: 'ping' });
        }
    }

    return { messages, remaining: buffer.subarray(offset) };
}

// ============================================================================
// Servidor HTTP + API + WebSocket
// ============================================================================
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
};

function sendJson(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (c) => { body += c.toString(); });
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); }
            catch { resolve({}); }
        });
    });
}

function listGeneratedFiles() {
    try {
        if (!fs.existsSync(state.outputDir)) return [];
        return fs.readdirSync(state.outputDir)
            .map((name) => {
                const full = path.join(state.outputDir, name);
                const st = fs.statSync(full);
                if (!st.isFile()) return null;
                const ext = path.extname(name).replace('.', '') || 'txt';
                return {
                    name,
                    extension: ext,
                    size: st.size,
                    size_human: st.size >= 1024 ? `${(st.size / 1024).toFixed(1)} KB` : `${st.size} B`,
                    modified: st.mtime.toISOString().replace('T', ' ').slice(0, 19),
                };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // 1. Vista Principal
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        const htmlPath = path.join(ROOT_DIR, 'frontend', 'templates', 'index.html');
        if (fs.existsSync(htmlPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return fs.createReadStream(htmlPath).pipe(res);
        }
    }

    // 2. Recursos Estáticos (/static/* y /assets/*)
    if (req.method === 'GET' && (pathname.startsWith('/static/') || pathname.startsWith('/assets/'))) {
        const baseFolder = pathname.startsWith('/static/')
            ? path.join(ROOT_DIR, 'frontend', 'static')
            : path.join(ROOT_DIR, 'assets');
        const relPath = pathname.replace(/^\/(static|assets)\//, '');
        const safePath = path.normalize(path.join(baseFolder, relPath));

        if (safePath.startsWith(baseFolder) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
            const ext = path.extname(safePath).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            return fs.createReadStream(safePath).pipe(res);
        }
        res.writeHead(404);
        return res.end('Not found');
    }

    // 3. Endpoints REST API
    if (pathname === '/api/health' && req.method === 'GET') {
        const ollama = await fetchOllamaModels();
        return sendJson(res, 200, {
            ok: ollama.ok,
            message: ollama.ok
                ? `Conectado a Ollama (${ollama.models.length} modelos detectados)`
                : `No se detectó servidor Ollama activo en ${state.ollamaHost}`,
            models: ollama.models,
            installed_details: ollama.details,
            current_model: state.currentModel,
            hauhau_catalog: HAUHAU_CATALOG,
            engine: 'Quick-Test Backend (Node.js Zero-Compile)',
        });
    }

    if (pathname === '/api/models' && req.method === 'GET') {
        const ollama = await fetchOllamaModels();
        return sendJson(res, 200, {
            models: ollama.models,
            installed_details: ollama.details,
            current: state.currentModel,
            hauhau_catalog: HAUHAU_CATALOG,
        });
    }

    if (pathname === '/api/hauhau/catalog' && req.method === 'GET') {
        const ollama = await fetchOllamaModels();
        return sendJson(res, 200, {
            repository: 'https://huggingface.co/HauhauCS',
            catalog: HAUHAU_CATALOG,
            installed: ollama.details,
        });
    }

    if (pathname === '/api/ollama/pull' && req.method === 'POST') {
        const body = await readBody(req);
        const targetModel = (body.model || '').trim();
        if (!targetModel) {
            return sendJson(res, 400, { ok: false, error: 'Nombre de modelo vacío' });
        }
        try {
            const pullRes = await fetch(`${state.ollamaHost}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: targetModel, stream: false }),
            });
            if (pullRes.ok) {
                state.currentModel = targetModel;
                return sendJson(res, 200, {
                    ok: true,
                    model: targetModel,
                    message: `Modelo '${targetModel}' instalado correctamente en Ollama.`,
                });
            }
            const errTxt = await pullRes.text();
            return sendJson(res, 500, { ok: false, error: errTxt });
        } catch (err) {
            return sendJson(res, 500, { ok: false, error: err.message });
        }
    }

    if (pathname === '/api/sandbox/validate' && req.method === 'POST') {
        const body = await readBody(req);
        const allowSudo = typeof body.allow_sudo === 'boolean' ? body.allow_sudo : state.allowSudo;
        const verdict = validateCommand(body.command || '', allowSudo);
        return sendJson(res, 200, verdict);
    }

    if (pathname === '/api/sandbox' && req.method === 'POST') {
        const body = await readBody(req);
        const allowSudo = typeof body.allow_sudo === 'boolean' ? body.allow_sudo : state.allowSudo;
        const result = await executeInSandbox(body.command || '', state.sandboxDir, allowSudo, body.sudo_password);
        return sendJson(res, 200, result);
    }

    if (pathname === '/api/audit' && req.method === 'GET') {
        const euid = process.geteuid ? process.geteuid() : 1000;
        const netIfaces = os.networkInterfaces();
        const network_interfaces = Object.entries(netIfaces).map(([name, addrs]) => ({
            name,
            is_up: true,
            mac: addrs?.find((a) => a.mac && a.mac !== '00:00:00:00:00:00')?.mac || 'loopback',
        }));

        exec('find /usr/bin /bin -perm -4000 2>/dev/null | head -n 30', (err, stdout) => {
            const samples = (stdout || '').split('\n').map((s) => s.trim()).filter(Boolean);
            sendJson(res, 200, {
                privileges: {
                    euid,
                    is_root: euid === 0,
                    sudo_possible: false,
                    sudo_status: 'Sudo controlado por Kiru Sandbox',
                    suid_binaries_count: samples.length,
                    suid_samples: samples,
                },
                kernel: {
                    release: os.release(),
                    arch: os.arch(),
                    warning: null,
                },
                network_interfaces,
            });
        });
        return;
    }

    if (pathname === '/api/files' && req.method === 'GET') {
        return sendJson(res, 200, { files: listGeneratedFiles() });
    }

    if (pathname === '/api/stats' && req.method === 'GET') {
        const files = listGeneratedFiles();
        const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
        const languages = {};
        for (const f of files) {
            languages[f.extension] = (languages[f.extension] || 0) + 1;
        }
        return sendJson(res, 200, {
            total_files: files.length,
            total_size_human: `${(totalBytes / 1024).toFixed(1)} KB`,
            languages,
        });
    }

    if (pathname === '/api/config' && req.method === 'GET') {
        return sendJson(res, 200, {
            output_dir: state.outputDir,
            sandbox_dir: state.sandboxDir,
            ollama_host: state.ollamaHost,
            allow_sudo: state.allowSudo,
            sudo_warning: SUDO_WARNING_TEXT,
        });
    }

    if (pathname === '/api/config' && req.method === 'POST') {
        const body = await readBody(req);
        if (body.key === 'output_dir' && body.value) {
            state.outputDir = body.value;
            fs.mkdirSync(state.outputDir, { recursive: true });
        } else if (body.key === 'sandbox_dir' && body.value) {
            state.sandboxDir = body.value;
            fs.mkdirSync(state.sandboxDir, { recursive: true });
        } else if (body.key === 'ollama_host' && body.value) {
            state.ollamaHost = body.value;
        } else if (body.key === 'allow_sudo') {
            state.allowSudo = body.value === 'true' || body.value === true;
        }
        return sendJson(res, 200, { ok: true, allow_sudo: state.allowSudo, sudo_warning: SUDO_WARNING_TEXT });
    }

    res.writeHead(404);
    res.end('Not found');
});

// ============================================================================
// Upgrade WebSocket en /ws
// ============================================================================
server.on('upgrade', (req, socket) => {
    if (!req.url.startsWith('/ws')) {
        socket.destroy();
        return;
    }

    const key = req.headers['sec-websocket-key'];
    if (!key) {
        socket.destroy();
        return;
    }

    const acceptKey = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');

    socket.write(
        [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptKey}`,
            '\r\n',
        ].join('\r\n')
    );

    // Enviar estado inicial
    fetchOllamaModels().then((ollama) => {
        sendWsFrame(socket, {
            event: 'connection_status',
            data: {
                ok: ollama.ok,
                message: ollama.ok ? 'Conectado a Ollama' : 'Ollama desconectado',
                models: ollama.models,
                installed_details: ollama.details,
                current_model: state.currentModel,
                hauhau_catalog: HAUHAU_CATALOG,
            },
        });
    });

    let recvBuffer = Buffer.alloc(0);

    socket.on('data', async (chunk) => {
        recvBuffer = Buffer.concat([recvBuffer, chunk]);
        const { messages, remaining } = parseWsFrames(recvBuffer);
        recvBuffer = remaining;

        for (const msg of messages) {
            if (msg.type === 'close') {
                socket.end();
                return;
            }
            if (msg.type !== 'text') continue;

            let parsed;
            try { parsed = JSON.parse(msg.data); }
            catch { continue; }

            const action = parsed.action;

            if (action === 'get_models') {
                const ollama = await fetchOllamaModels();
                sendWsFrame(socket, {
                    event: 'models_list',
                    data: {
                        models: ollama.models,
                        installed_details: ollama.details,
                        current: state.currentModel,
                        hauhau_catalog: HAUHAU_CATALOG,
                    },
                });
            } else if (action === 'set_model' && parsed.model) {
                state.currentModel = parsed.model;
                sendWsFrame(socket, { event: 'model_changed', data: { model: state.currentModel } });
            } else if (action === 'set_mode' && parsed.mode) {
                state.currentMode = parsed.mode;
                sendWsFrame(socket, { event: 'mode_changed', data: { mode: state.currentMode } });
            } else if (action === 'set_sudo') {
                state.allowSudo = Boolean(parsed.allow_sudo);
                sendWsFrame(socket, {
                    event: 'sudo_status_changed',
                    data: { allow_sudo: state.allowSudo, warning: SUDO_WARNING_TEXT },
                });
            } else if (action === 'get_files') {
                sendWsFrame(socket, { event: 'files_list', data: { files: listGeneratedFiles() } });
            } else if (action === 'get_config') {
                sendWsFrame(socket, {
                    event: 'config_loaded',
                    data: {
                        output_dir: state.outputDir,
                        sandbox_dir: state.sandboxDir,
                        ollama_host: state.ollamaHost,
                        allow_sudo: state.allowSudo,
                        sudo_warning: SUDO_WARNING_TEXT,
                    },
                });
            } else if (action === 'clear_chat') {
                state.chatHistory = [];
                sendWsFrame(socket, { event: 'chat_cleared', data: {} });
            } else if (action === 'run_sandbox_command' && parsed.command) {
                const allowSudo = typeof parsed.allow_sudo === 'boolean' ? parsed.allow_sudo : state.allowSudo;
                const res = await executeInSandbox(parsed.command, state.sandboxDir, allowSudo, parsed.sudo_password);
                sendWsFrame(socket, { event: 'sandbox_execution_result', data: res });
            } else if (action === 'pull_model' && parsed.model) {
                const targetModel = parsed.model.trim();
                sendWsFrame(socket, {
                    event: 'model_pull_progress',
                    data: {
                        model: targetModel,
                        status: `Conectando con Ollama para descargar ${targetModel}...`,
                        completed: 0,
                        total: 0,
                        percent: 0,
                        done: false,
                    },
                });

                try {
                    const pullResp = await fetch(`${state.ollamaHost}/api/pull`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: targetModel, stream: true }),
                    });

                    if (!pullResp.ok || !pullResp.body) {
                        const errTxt = await pullResp.text();
                        sendWsFrame(socket, {
                            event: 'model_pull_error',
                            data: { model: targetModel, error: errTxt || `HTTP ${pullResp.status}` },
                        });
                        continue;
                    }

                    const reader = pullResp.body.getReader();
                    const decoder = new TextDecoder();
                    let buf = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buf += decoder.decode(value, { stream: true });
                        const lines = buf.split('\n');
                        buf = lines.pop() || '';

                        for (const line of lines) {
                            if (!line.trim()) continue;
                            try {
                                const j = JSON.parse(line);
                                if (j.error) {
                                    sendWsFrame(socket, {
                                        event: 'model_pull_error',
                                        data: { model: targetModel, error: j.error },
                                    });
                                } else {
                                    const completed = j.completed || 0;
                                    const total = j.total || 0;
                                    const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
                                    sendWsFrame(socket, {
                                        event: 'model_pull_progress',
                                        data: {
                                            model: targetModel,
                                            status: j.status || 'Descargando...',
                                            completed,
                                            total,
                                            percent,
                                            done: j.status === 'success',
                                        },
                                    });
                                }
                            } catch {}
                        }
                    }

                    state.currentModel = targetModel;
                    const updated = await fetchOllamaModels();
                    sendWsFrame(socket, {
                        event: 'models_list',
                        data: {
                            models: updated.models,
                            installed_details: updated.details,
                            current: state.currentModel,
                            hauhau_catalog: HAUHAU_CATALOG,
                        },
                    });
                } catch (err) {
                    sendWsFrame(socket, {
                        event: 'model_pull_error',
                        data: { model: targetModel, error: err.message },
                    });
                }
            } else if (action === 'send_message' && parsed.message) {
                const userMsg = parsed.message;
                sendWsFrame(socket, {
                    event: 'chat_event',
                    data: {
                        type: 'thinking',
                        content: `Preparando Plan de Ejecución con ${state.currentModel}...`,
                    },
                });

                const messagesPayload = [
                    { role: 'system', content: getSystemPrompt(state.currentMode) },
                    ...state.chatHistory,
                    { role: 'user', content: userMsg },
                ];

                try {
                    const chatRes = await fetch(`${state.ollamaHost}/api/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: state.currentModel,
                            messages: messagesPayload,
                            stream: true,
                        }),
                    });

                    if (!chatRes.ok || !chatRes.body) {
                        const errTxt = await chatRes.text();
                        sendWsFrame(socket, {
                            event: 'chat_event',
                            data: { type: 'error', content: `Error de Ollama: ${errTxt}` },
                        });
                        continue;
                    }

                    const reader = chatRes.body.getReader();
                    const decoder = new TextDecoder();
                    let fullReply = '';
                    let buf = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buf += decoder.decode(value, { stream: true });
                        const lines = buf.split('\n');
                        buf = lines.pop() || '';

                        for (const line of lines) {
                            if (!line.trim()) continue;
                            try {
                                const j = JSON.parse(line);
                                const token = j.message?.content || '';
                                if (token) {
                                    fullReply += token;
                                    sendWsFrame(socket, {
                                        event: 'chat_event',
                                        data: { type: 'token', content: token },
                                    });
                                }
                            } catch {}
                        }
                    }

                    state.chatHistory.push({ role: 'user', content: userMsg });
                    state.chatHistory.push({ role: 'assistant', content: fullReply });

                    // Detectar bloques bash propuestos para el Controlador Autónomo de Consola
                    const bashRegex = /```(?:bash|sh)\n([\s\S]*?)```/gi;
                    let match;
                    while ((match = bashRegex.exec(fullReply)) !== null) {
                        const cmd = match[1].trim();
                        if (cmd) {
                            const verdict = validateCommand(cmd, state.allowSudo);
                            sendWsFrame(socket, {
                                event: 'autonomous_command_proposed',
                                data: { command: cmd, verdict },
                            });
                        }
                    }

                    sendWsFrame(socket, { event: 'chat_event', data: { type: 'done' } });
                } catch (err) {
                    sendWsFrame(socket, {
                        event: 'chat_event',
                        data: { type: 'error', content: `Error conectando con Ollama: ${err.message}` },
                    });
                }
            }
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║   🚀 KIRU AI v2.0 - Quick-Test Browser Backend (Zero-Compile)    ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(`║   🌐 Interfaz Web Local : http://${HOST}:${PORT}                    ║`);
    console.log(`║   🛡️  Sandbox Aislado    : ${state.sandboxDir.padEnd(36)}║`);
    console.log('║   🤖 Catálogo HauhauCS  : https://huggingface.co/HauhauCS        ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
});
