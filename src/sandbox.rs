use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Stdio;
use std::time::{Duration, Instant};
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::time::timeout;

pub const SUDO_WARNING_TEXT: &str = "Darle comandos de superusuario puede resultar en la perdida de archivos importantes, daños, y uso de comandos peligrosos. Solo debe usarse en entorno controlados y comprendiendo por completo los riesgos que puede significar";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyVerdict {
    pub allowed: bool,
    pub requires_sudo: bool,
    pub risk_level: String, // "safe", "sudo_required", "blocked"
    pub reason: String,
    pub detected_tools: Vec<String>,
    pub missing_tools: Vec<String>,
    pub sudo_warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxResult {
    pub success: bool,
    pub blocked: bool,
    pub requires_sudo: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub execution_time_ms: u128,
    pub safety: SafetyVerdict,
}

#[derive(Clone, Default)]
pub struct SandboxExecutor;

impl SandboxExecutor {
    pub fn new() -> Self {
        Self
    }

    /// Analiza el comando para verificar que no sea destructivo para el sistema operativo,
    /// detecta si requiere sudo y comprueba qué herramientas invoca.
    pub fn validate_command(&self, command: &str, allow_sudo: bool) -> SafetyVerdict {
        let trimmed = command.trim();
        let lower = trimmed.to_lowercase();

        // 1. Reglas de bloqueo estricto contra destrucción del sistema
        let forbidden_patterns: Vec<(&str, &str)> = vec![
            (
                r"(?i)\brm\b[^\n;&|]*(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive)[^\n;&|]*\s+(/|/\*|/boot|/etc|/usr|/var|/bin|/sbin|/lib|/lib64|/dev|/proc|/sys|/root|/home)(\s|$|;|&|\|)",
                "PROHIBIDO: Intento de eliminar directorios críticos de raíz del sistema operativo.",
            ),
            (
                r"(?i)--no-preserve-root",
                "PROHIBIDO: El flag --no-preserve-root está bloqueado por seguridad.",
            ),
            (
                r"(?i)\b(mkfs|mkfs\.[a-z0-9]+|wipefs|fdisk|parted|sfdisk|cfdisk)\b",
                "PROHIBIDO: Comandos de formateo o particionado de discos están bloqueados en el Sandbox.",
            ),
            (
                r"(?i)\bdd\b[^\n;&|]*of=/dev/(sd[a-z]|nvme[0-9]|hd[a-z]|vd[a-z]|loop|mapper|dm-)",
                "PROHIBIDO: Escritura directa sobre dispositivos de bloque (/dev/*) mediante dd.",
            ),
            (
                r"(?i)>\s*/dev/(sd[a-z]|nvme[0-9]|hd[a-z]|vd[a-z]|mem|kmem)",
                "PROHIBIDO: Redirección destructiva hacia dispositivos de bloque o memoria del kernel.",
            ),
            (
                r":\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:",
                "PROHIBIDO: Detección de Fork Bomb (:(){ :|:& };:).",
            ),
            (
                r"(?i)\b(shutdown|reboot|poweroff|halt|init\s+[06]|systemctl\s+(reboot|poweroff|halt))\b",
                "PROHIBIDO: Comandos de apagado o reinicio del sistema anfitrión.",
            ),
            (
                r"(?i)\b(chmod|chown)\b[^\n;&|]*-R[^\n;&|]*\s+(/|/\*|/etc|/usr|/bin|/lib)(\s|$)",
                "PROHIBIDO: Modificación recursiva de permisos o propietarios sobre el directorio raíz.",
            ),
            (
                r"(?i)\bshred\b[^\n;&|]*/dev/",
                "PROHIBIDO: Destrucción de dispositivos mediante shred.",
            ),
            (
                r"(?i)/proc/sysrq-trigger",
                "PROHIBIDO: Manipulación directa de sysrq-trigger del kernel.",
            ),
        ];

        for (pattern, reason) in forbidden_patterns {
            if let Ok(re) = Regex::new(pattern) {
                if re.is_match(trimmed) {
                    return SafetyVerdict {
                        allowed: false,
                        requires_sudo: false,
                        risk_level: "blocked".to_string(),
                        reason: reason.to_string(),
                        detected_tools: vec![],
                        missing_tools: vec![],
                        sudo_warning: None,
                    };
                }
            }
        }

        // 2. Detectar uso de superusuario (sudo / su / pkexec / doas)
        let sudo_re = Regex::new(r"(?i)(^|[;&|\s])(sudo|su\s+-|su\s+root|pkexec|doas)(\s|$)").unwrap();
        let requires_sudo = sudo_re.is_match(&lower);

        // 3. Detectar herramientas requeridas en el comando
        let (detected_tools, missing_tools) = Self::detect_tools(trimmed);

        if requires_sudo && !allow_sudo {
            return SafetyVerdict {
                allowed: false,
                requires_sudo: true,
                risk_level: "sudo_required".to_string(),
                reason: "El comando requiere privilegios de superusuario (sudo), pero el modo Sudo Controlado está desactivado.".to_string(),
                detected_tools,
                missing_tools,
                sudo_warning: Some(SUDO_WARNING_TEXT.to_string()),
            };
        }

        SafetyVerdict {
            allowed: true,
            requires_sudo,
            risk_level: if requires_sudo {
                "sudo_elevated".to_string()
            } else {
                "safe".to_string()
            },
            reason: if requires_sudo {
                "Comando validado con privilegios de superusuario bajo entorno controlado.".to_string()
            } else {
                "Comando verificado por el Firewall del Sandbox (Sin operaciones destructivas).".to_string()
            },
            detected_tools,
            missing_tools,
            sudo_warning: if requires_sudo {
                Some(SUDO_WARNING_TEXT.to_string())
            } else {
                None
            },
        }
    }

    fn detect_tools(command: &str) -> (Vec<String>, Vec<String>) {
        let builtins = [
            "cd", "echo", "export", "set", "unset", "pwd", "exit", "true", "false", "test", "[",
            "if", "then", "else", "fi", "for", "in", "do", "done", "while", "case", "esac",
            "local", "return", "read", "printf", "source", ".", "alias", "ulimit", "umask",
            "history", "type", "hash", "sudo",
        ];

        let mut detected = Vec::new();
        let mut missing = Vec::new();

        for segment in command.split(|c| c == '|' || c == ';' || c == '&' || c == '\n') {
            let words: Vec<&str> = segment.trim().split_whitespace().collect();
            let mut idx = 0;
            while idx < words.len() {
                let w = words[idx];
                // Saltar asignaciones de variables FOO=bar o sudo flags
                if w.contains('=') || w == "sudo" || w.starts_with('-') {
                    idx += 1;
                    continue;
                }
                let clean_tool = w.trim_matches(|c: char| !c.is_alphanumeric() && c != '_' && c != '-' && c != '.');
                if !clean_tool.is_empty() && !builtins.contains(&clean_tool) {
                    if !detected.contains(&clean_tool.to_string()) {
                        detected.push(clean_tool.to_string());
                        // Check if binary exists in PATH
                        let exists = std::process::Command::new("which")
                            .arg(clean_tool)
                            .stdout(Stdio::null())
                            .stderr(Stdio::null())
                            .status()
                            .map(|s| s.success())
                            .unwrap_or(false);
                        if !exists && !Path::new(clean_tool).exists() {
                            missing.push(clean_tool.to_string());
                        }
                    }
                }
                break;
            }
        }

        (detected, missing)
    }

    pub async fn execute(
        &self,
        command: &str,
        working_dir: &str,
        allow_sudo: bool,
        sudo_password: Option<String>,
    ) -> SandboxResult {
        let start = Instant::now();
        let safety = self.validate_command(command, allow_sudo);

        if !safety.allowed {
            return SandboxResult {
                success: false,
                blocked: true,
                requires_sudo: safety.requires_sudo,
                exit_code: Some(126),
                stdout: String::new(),
                stderr: format!(
                    "🛑 [SANDBOX FIREWALL BLOCK]\n{}\n{}",
                    safety.reason,
                    safety.sudo_warning.clone().unwrap_or_default()
                ),
                execution_time_ms: start.elapsed().as_millis(),
                safety,
            };
        }

        // Crear un subdirectorio de sandbox simulado seguro si no existe
        let dir = Path::new(working_dir);
        let _ = tokio::fs::create_dir_all(dir).await;

        // Si usa sudo y se proveyó contraseña, transformar `sudo` en `sudo -S`
        let effective_cmd = if safety.requires_sudo && sudo_password.is_some() {
            let re = Regex::new(r"\bsudo\b").unwrap();
            re.replace(command, "sudo -S -p ''").to_string()
        } else {
            command.to_string()
        };

        let mut child = match Command::new("bash")
            .arg("-c")
            .arg(&effective_cmd)
            .current_dir(dir)
            .env("KIRU_SANDBOX", "1")
            .env("HISTFILE", "/dev/null")
            .stdin(if sudo_password.is_some() {
                Stdio::piped()
            } else {
                Stdio::null()
            })
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                return SandboxResult {
                    success: false,
                    blocked: false,
                    requires_sudo: safety.requires_sudo,
                    exit_code: None,
                    stdout: String::new(),
                    stderr: format!("Error al iniciar proceso en Sandbox: {}", e),
                    execution_time_ms: start.elapsed().as_millis(),
                    safety,
                };
            }
        };

        if let Some(pass) = sudo_password {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(format!("{}\n", pass).as_bytes()).await;
                let _ = stdin.flush().await;
            }
        }

        // Timeout de seguridad de 30 segundos
        match timeout(Duration::from_secs(30), child.wait_with_output()).await {
            Ok(Ok(output)) => {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                SandboxResult {
                    success: output.status.success(),
                    blocked: false,
                    requires_sudo: safety.requires_sudo,
                    exit_code: output.status.code(),
                    stdout,
                    stderr,
                    execution_time_ms: start.elapsed().as_millis(),
                    safety,
                }
            }
            Ok(Err(e)) => SandboxResult {
                success: false,
                blocked: false,
                requires_sudo: safety.requires_sudo,
                exit_code: None,
                stdout: String::new(),
                stderr: format!("Error de ejecución: {}", e),
                execution_time_ms: start.elapsed().as_millis(),
                safety,
            },
            Err(_) => SandboxResult {
                success: false,
                blocked: false,
                requires_sudo: safety.requires_sudo,
                exit_code: Some(124),
                stdout: String::new(),
                stderr: "⏱️ Tiempo de ejecución excedido (Timeout de seguridad de 30s en Sandbox)"
                    .to_string(),
                execution_time_ms: start.elapsed().as_millis(),
                safety,
            },
        }
    }
}
