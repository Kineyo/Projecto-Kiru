use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path as AxumPath, State,
    },
    http::StatusCode,
    response::{Html, IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use crate::code_extractor::CodeExtractor;
use crate::config::AppConfig;
use crate::file_manager::FileManager;
use crate::ollama::{ChatMessage, OllamaClient};
use crate::pentest::PentestAuditor;
use crate::rag::RagEngine;
use crate::sandbox::{SandboxExecutor, SUDO_WARNING_TEXT};
use crate::system_prompt::SystemPromptManager;

pub struct AppState {
    pub config: RwLock<AppConfig>,
    pub ollama: RwLock<OllamaClient>,
    pub prompt_manager: SystemPromptManager,
    pub extractor: CodeExtractor,
    pub file_manager: FileManager,
    pub rag: RwLock<RagEngine>,
    pub sandbox: SandboxExecutor,
    pub history: Mutex<Vec<ChatMessage>>,
    pub current_mode: RwLock<String>,
    pub allow_sudo: RwLock<bool>,
}

#[derive(Deserialize)]
pub struct SetModelReq {
    pub model: String,
}

#[derive(Deserialize)]
pub struct SetModeReq {
    pub mode: String,
}

#[derive(Deserialize)]
pub struct ConfigReq {
    pub key: String,
    pub value: String,
}

#[derive(Deserialize)]
pub struct SandboxReq {
    pub command: String,
    pub allow_sudo: Option<bool>,
    pub sudo_password: Option<String>,
}

#[derive(Deserialize)]
pub struct PullModelReq {
    pub model: String,
}

pub fn resolve_frontend_dir() -> PathBuf {
    let candidates = [
        PathBuf::from("frontend"),
        PathBuf::from("../frontend"),
        PathBuf::from("../../frontend"),
    ];

    for c in &candidates {
        if c.join("templates/index.html").exists() {
            return c.clone();
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let exe_candidates = [
                parent.join("frontend"),
                parent.join("../frontend"),
                parent.join("../../frontend"),
            ];
            for c in &exe_candidates {
                if c.join("templates/index.html").exists() {
                    return c.clone();
                }
            }
        }
    }

    PathBuf::from("frontend")
}

pub fn create_router(state: Arc<AppState>) -> Router {
    let frontend_dir = resolve_frontend_dir();
    let static_dir = frontend_dir.join("static");
    let assets_dir = frontend_dir
        .parent()
        .map(|p| p.join("assets"))
        .unwrap_or_else(|| PathBuf::from("assets"));

    Router::new()
        .route("/", get(index_handler))
        .route("/api/health", get(health_handler))
        .route("/api/models", get(models_handler))
        .route("/api/hauhau/catalog", get(hauhau_catalog_handler))
        .route("/api/ollama/pull", post(pull_model_handler))
        .route("/api/model", post(set_model_handler))
        .route("/api/mode", post(set_mode_handler))
        .route("/api/files", get(files_handler))
        .route("/api/files/{filename}", get(download_file_handler))
        .route("/api/files/{filename}", delete(delete_file_handler))
        .route("/api/stats", get(stats_handler))
        .route("/api/audit", get(audit_handler))
        .route("/api/sandbox", post(sandbox_handler))
        .route("/api/sandbox/validate", post(validate_sandbox_handler))
        .route("/api/config", get(get_config_handler))
        .route("/api/config", post(save_config_handler))
        .route("/ws", get(ws_handler))
        .nest_service("/static", ServeDir::new(static_dir.clone()))
        .nest_service("/frontend/static", ServeDir::new(static_dir))
        .nest_service("/assets", ServeDir::new(assets_dir))
        .layer(CorsLayer::permissive())
        .with_state(state)
}

async fn index_handler() -> impl IntoResponse {
    let frontend_dir = resolve_frontend_dir();
    let template_path = frontend_dir.join("templates/index.html");
    if let Ok(content) = fs::read_to_string(&template_path) {
        Html(content).into_response()
    } else {
        Html(format!(
            "<h1>Error: {} no encontrado</h1>",
            template_path.display()
        ))
        .into_response()
    }
}

async fn health_handler(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let status = {
        let ollama = state.ollama.read().await;
        ollama.check_health().await
    };
    // Si el modelo actual no está entre los instalados pero sí hay modelos instalados, auto-seleccionar el primero
    if status.ok && !status.models.is_empty() {
        let mut ollama = state.ollama.write().await;
        if !status.models.contains(&ollama.model) {
            ollama.set_model(&status.models[0]);
        }
    }
    Json(json!(status))
}

async fn models_handler(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let health = {
        let ollama = state.ollama.read().await;
        ollama.check_health().await
    };
    let mut ollama = state.ollama.write().await;
    if !health.models.is_empty() && !health.models.contains(&ollama.model) {
        ollama.set_model(&health.models[0]);
    }
    let current = ollama.model.clone();
    Json(json!({
        "models": health.models,
        "installed_details": health.installed_details,
        "current": current,
        "hauhau_catalog": OllamaClient::get_hauhau_catalog()
    }))
}

async fn hauhau_catalog_handler(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let health = {
        let ollama = state.ollama.read().await;
        ollama.check_health().await
    };
    Json(json!({
        "catalog": OllamaClient::get_hauhau_catalog(),
        "installed": health.installed_details,
        "sudo_warning": SUDO_WARNING_TEXT
    }))
}

async fn pull_model_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PullModelReq>,
) -> Json<serde_json::Value> {
    let ollama = state.ollama.read().await.clone();
    let model_tag = payload.model.clone();

    match ollama.pull_model(&model_tag, |_| {}).await {
        Ok(_) => {
            let mut ollama_w = state.ollama.write().await;
            ollama_w.set_model(&model_tag);
            Json(json!({
                "ok": true,
                "model": model_tag,
                "message": format!("Modelo '{}' instalado y activado correctamente.", model_tag)
            }))
        }
        Err(e) => Json(json!({
            "ok": false,
            "model": model_tag,
            "error": e
        })),
    }
}

async fn set_model_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SetModelReq>,
) -> Json<serde_json::Value> {
    let mut ollama = state.ollama.write().await;
    ollama.set_model(&payload.model);
    let mut cfg = state.config.write().await;
    let _ = cfg.save_setting("model", &payload.model);
    Json(json!({ "ok": true, "model": payload.model }))
}

async fn set_mode_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SetModeReq>,
) -> Json<serde_json::Value> {
    let mut mode = state.current_mode.write().await;
    *mode = payload.mode.clone();
    Json(json!({ "ok": true, "mode": payload.mode }))
}

async fn files_handler(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let cfg = state.config.read().await;
    let files = state.file_manager.list_output_files(&cfg.output_dir);
    Json(json!({ "files": files }))
}

async fn download_file_handler(
    State(state): State<Arc<AppState>>,
    AxumPath(filename): AxumPath<String>,
) -> Response {
    let cfg = state.config.read().await;
    let file_path = Path::new(&cfg.output_dir).join(&filename);
    if file_path.exists() && file_path.is_file() {
        if let Ok(data) = fs::read(&file_path) {
            return (
                StatusCode::OK,
                [
                    ("Content-Type", "application/octet-stream"),
                    (
                        "Content-Disposition",
                        &format!("attachment; filename=\"{}\"", filename),
                    ),
                ],
                data,
            )
                .into_response();
        }
    }
    StatusCode::NOT_FOUND.into_response()
}

async fn delete_file_handler(
    State(state): State<Arc<AppState>>,
    AxumPath(filename): AxumPath<String>,
) -> Json<serde_json::Value> {
    let cfg = state.config.read().await;
    let file_path = Path::new(&cfg.output_dir).join(&filename);
    let ok = if file_path.exists() {
        state
            .file_manager
            .delete_file(&file_path.to_string_lossy())
    } else {
        false
    };
    Json(json!({ "ok": ok }))
}

async fn stats_handler(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let cfg = state.config.read().await;
    let stats = state.file_manager.get_output_stats(&cfg.output_dir);
    Json(json!(stats))
}

async fn audit_handler() -> Json<serde_json::Value> {
    let report = PentestAuditor::full_audit();
    Json(json!(report))
}

async fn validate_sandbox_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SandboxReq>,
) -> Json<serde_json::Value> {
    let global_sudo = *state.allow_sudo.read().await;
    let allow_sudo = payload.allow_sudo.unwrap_or(global_sudo);
    let verdict = state.sandbox.validate_command(&payload.command, allow_sudo);
    Json(json!(verdict))
}

async fn sandbox_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SandboxReq>,
) -> Json<serde_json::Value> {
    let cfg = state.config.read().await;
    let global_sudo = *state.allow_sudo.read().await;
    let allow_sudo = payload.allow_sudo.unwrap_or(global_sudo);
    let result = state
        .sandbox
        .execute(
            &payload.command,
            &cfg.sandbox_dir,
            allow_sudo,
            payload.sudo_password,
        )
        .await;
    Json(json!(result))
}

async fn get_config_handler(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let cfg = state.config.read().await;
    let allow_sudo = *state.allow_sudo.read().await;
    Json(json!({
        "output_dir": cfg.output_dir,
        "sandbox_dir": cfg.sandbox_dir,
        "model": cfg.ollama_model,
        "ollama_host": cfg.ollama_host,
        "allow_sudo": allow_sudo,
        "sudo_warning": SUDO_WARNING_TEXT
    }))
}

async fn save_config_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ConfigReq>,
) -> Json<serde_json::Value> {
    if payload.key == "allow_sudo" {
        let mut s = state.allow_sudo.write().await;
        *s = payload.value == "true" || payload.value == "1";
        return Json(json!({
            "ok": true,
            "key": "allow_sudo",
            "value": *s,
            "warning": SUDO_WARNING_TEXT
        }));
    }
    let mut cfg = state.config.write().await;
    let ok = cfg.save_setting(&payload.key, &payload.value).is_ok();
    Json(json!({ "ok": ok, "key": payload.key, "value": payload.value }))
}

// WebSocket handler
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

#[derive(Deserialize)]
struct ClientWsMessage {
    #[serde(rename = "type")]
    msg_type: Option<String>,
    action: Option<String>,
    message: Option<String>,
    model: Option<String>,
    mode: Option<String>,
    command: Option<String>,
    allow_sudo: Option<bool>,
    sudo_password: Option<String>,
    key: Option<String>,
    value: Option<String>,
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    // Initial health check emit + auto-select installed model
    let health = {
        let ollama = state.ollama.read().await;
        ollama.check_health().await
    };
    if health.ok && !health.models.is_empty() {
        let mut ollama = state.ollama.write().await;
        if !health.models.contains(&ollama.model) {
            ollama.set_model(&health.models[0]);
        }
    }
    let _ = socket
        .send(Message::Text(
            json!({ "event": "connection_status", "data": health })
                .to_string()
                .into(),
        ))
        .await;

    while let Some(Ok(msg)) = socket.next().await {
        if let Message::Text(text) = msg {
            if let Ok(req) = serde_json::from_str::<ClientWsMessage>(&text) {
                let action = req.action.or(req.msg_type).unwrap_or_default();
                match action.as_str() {
                    "get_models" => {
                        let health = {
                            let ollama = state.ollama.read().await;
                            ollama.check_health().await
                        };
                        let mut ollama = state.ollama.write().await;
                        if !health.models.is_empty() && !health.models.contains(&ollama.model) {
                            ollama.set_model(&health.models[0]);
                        }
                        let current = ollama.model.clone();
                        let _ = socket
                            .send(Message::Text(
                                json!({
                                    "event": "models_list",
                                    "data": {
                                        "models": health.models,
                                        "installed_details": health.installed_details,
                                        "current": current,
                                        "hauhau_catalog": OllamaClient::get_hauhau_catalog()
                                    }
                                })
                                .to_string()
                                .into(),
                            ))
                            .await;
                    }
                    "pull_model" => {
                        if let Some(model_tag) = req.model {
                            let _ = socket
                                .send(Message::Text(
                                    json!({
                                        "event": "pull_progress",
                                        "data": {
                                            "model": model_tag,
                                            "status": "Iniciando descarga desde HuggingFace / Ollama...",
                                            "percent": 0
                                        }
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;

                            let ollama = state.ollama.read().await.clone();
                            let tag_clone = model_tag.clone();
                            let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

                            let pull_task = tokio::spawn(async move {
                                ollama
                                    .pull_model(&tag_clone, move |chunk| {
                                        let _ = tx.send(chunk);
                                    })
                                    .await
                            });

                            while let Some(chunk) = rx.recv().await {
                                let percent = match (chunk.completed, chunk.total) {
                                    (Some(c), Some(t)) if t > 0 => ((c as f64 / t as f64) * 100.0) as u32,
                                    _ => 0,
                                };
                                let _ = socket
                                    .send(Message::Text(
                                        json!({
                                            "event": "pull_progress",
                                            "data": {
                                                "model": model_tag,
                                                "status": chunk.status.unwrap_or_else(|| "Descargando...".to_string()),
                                                "completed": chunk.completed,
                                                "total": chunk.total,
                                                "percent": percent
                                            }
                                        })
                                        .to_string()
                                        .into(),
                                    ))
                                    .await;
                            }

                            match pull_task.await {
                                Ok(Ok(())) => {
                                    {
                                        let mut ollama_w = state.ollama.write().await;
                                        ollama_w.set_model(&model_tag);
                                    }
                                    let health = state.ollama.read().await.check_health().await;
                                    let _ = socket
                                        .send(Message::Text(
                                            json!({
                                                "event": "pull_complete",
                                                "data": {
                                                    "ok": true,
                                                    "model": model_tag,
                                                    "models": health.models,
                                                    "installed_details": health.installed_details
                                                }
                                            })
                                            .to_string()
                                            .into(),
                                        ))
                                        .await;
                                }
                                Ok(Err(e)) => {
                                    let _ = socket
                                        .send(Message::Text(
                                            json!({
                                                "event": "pull_complete",
                                                "data": { "ok": false, "model": model_tag, "error": e }
                                            })
                                            .to_string()
                                            .into(),
                                        ))
                                        .await;
                                }
                                Err(e) => {
                                    let _ = socket
                                        .send(Message::Text(
                                            json!({
                                                "event": "pull_complete",
                                                "data": { "ok": false, "model": model_tag, "error": e.to_string() }
                                            })
                                            .to_string()
                                            .into(),
                                        ))
                                        .await;
                                }
                            }
                        }
                    }
                    "set_model" => {
                        if let Some(m) = req.model {
                            let mut ollama = state.ollama.write().await;
                            ollama.set_model(&m);
                            let mut cfg = state.config.write().await;
                            let _ = cfg.save_setting("model", &m);
                            let _ = socket
                                .send(Message::Text(
                                    json!({
                                        "event": "model_changed",
                                        "data": { "model": m }
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;
                        }
                    }
                    "set_mode" => {
                        if let Some(m) = req.mode {
                            let mut mode = state.current_mode.write().await;
                            *mode = m.clone();
                            let _ = socket
                                .send(Message::Text(
                                    json!({
                                        "event": "mode_changed",
                                        "data": { "mode": m }
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;
                        }
                    }
                    "get_files" => {
                        let cfg = state.config.read().await;
                        let files = state.file_manager.list_output_files(&cfg.output_dir);
                        let _ = socket
                            .send(Message::Text(
                                json!({
                                    "event": "files_list",
                                    "data": { "files": files }
                                })
                                .to_string()
                                .into(),
                            ))
                            .await;
                    }
                    "get_config" => {
                        let cfg = state.config.read().await;
                        let allow_sudo = *state.allow_sudo.read().await;
                        let _ = socket
                            .send(Message::Text(
                                json!({
                                    "event": "config_loaded",
                                    "data": {
                                        "output_dir": cfg.output_dir,
                                        "sandbox_dir": cfg.sandbox_dir,
                                        "allow_sudo": allow_sudo,
                                        "sudo_warning": SUDO_WARNING_TEXT
                                    }
                                })
                                .to_string()
                                .into(),
                            ))
                            .await;
                    }
                    "save_config" => {
                        if let (Some(k), Some(v)) = (req.key, req.value) {
                            if k == "allow_sudo" {
                                let mut s = state.allow_sudo.write().await;
                                *s = v == "true" || v == "1";
                            } else {
                                let mut cfg = state.config.write().await;
                                let _ = cfg.save_setting(&k, &v);
                            }
                            let _ = socket
                                .send(Message::Text(
                                    json!({
                                        "event": "config_saved",
                                        "data": { "message": format!("Guardado: {}", k) }
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;
                        }
                    }
                    "clear_chat" => {
                        let mut hist = state.history.lock().await;
                        hist.clear();
                        let _ = socket
                            .send(Message::Text(
                                json!({ "event": "chat_cleared" }).to_string().into(),
                            ))
                            .await;
                    }
                    "run_sandbox_command" => {
                        if let Some(cmd) = req.command {
                            let global_sudo = *state.allow_sudo.read().await;
                            let allow_sudo = req.allow_sudo.unwrap_or(global_sudo);

                            let _ = socket
                                .send(Message::Text(
                                    json!({
                                        "event": "chat_event",
                                        "data": { "type": "status", "content": format!("🚀 [Sandbox] Validando y ejecutando: `{}`", cmd) }
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;

                            let cfg = state.config.read().await;
                            let res = state
                                .sandbox
                                .execute(&cmd, &cfg.sandbox_dir, allow_sudo, req.sudo_password)
                                .await;

                            let out_text = format!(
                                "COMANDO: {}\nESTADO: {}\nSALIDA:\n{}\nERRORES:\n{}",
                                cmd,
                                if res.blocked {
                                    "BLOQUEADO POR FIREWALL"
                                } else if res.success {
                                    "ÉXITO"
                                } else {
                                    "CON ERRORES"
                                },
                                res.stdout,
                                res.stderr
                            );

                            let mut hist = state.history.lock().await;
                            hist.push(ChatMessage {
                                role: "user".to_string(),
                                content: format!(
                                    "[RESULTADO DE CONSOLA SANDBOX]:\n{}",
                                    out_text
                                ),
                            });

                            let _ = socket
                                .send(Message::Text(
                                    json!({
                                        "event": "sandbox_execution_result",
                                        "data": res
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;

                            let _ = socket
                                .send(Message::Text(
                                    json!({
                                        "event": "chat_event",
                                        "data": {
                                            "type": "token",
                                            "content": format!("\n\n**🖥️ Salida del Sandbox (`{}`):**\n```text\n{}\n```\n", cmd, out_text)
                                        }
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;

                            let _ = socket
                                .send(Message::Text(
                                    json!({
                                        "event": "chat_event",
                                        "data": { "type": "done", "full_response": "" }
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;
                        }
                    }
                    "send_message" => {
                        if let Some(msg_content) = req.message {
                            if msg_content.trim().is_empty() {
                                continue;
                            }

                            let _ = socket
                                .send(Message::Text(
                                    json!({
                                        "event": "chat_event",
                                        "data": { "type": "thinking", "content": "📋 Preparando Plan de Ejecución y consultando base de datos..." }
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;

                            let rag_context = {
                                let rag = state.rag.read().await;
                                rag.query(&msg_content, 3)
                            };

                            let mut enriched_message = msg_content.clone();
                            if let Some(ctx) = &rag_context {
                                enriched_message = format!(
                                    "CONTEXTO RECUPERADO DE LA BASE DE DATOS:\n{}\n\nCONSULTA TÉCNICA: {}\n\nRESPUESTA:",
                                    ctx, msg_content
                                );
                                let _ = socket
                                    .send(Message::Text(
                                        json!({
                                            "event": "chat_event",
                                            "data": { "type": "thinking", "content": "📚 Contexto RAG inyectado." }
                                        })
                                        .to_string()
                                        .into(),
                                    ))
                                    .await;
                            }

                            let current_history = {
                                let mut hist = state.history.lock().await;
                                hist.push(ChatMessage {
                                    role: "user".to_string(),
                                    content: enriched_message,
                                });
                                let cfg = state.config.read().await;
                                if hist.len() > cfg.max_history {
                                    let excess = hist.len() - cfg.max_history;
                                    hist.drain(0..excess);
                                }
                                hist.clone()
                            };

                            let current_mode = state.current_mode.read().await.clone();
                            let system_prompt = if current_mode == "sandbox" {
                                state.prompt_manager.get_prompt("sandbox")
                            } else if rag_context.is_some() {
                                "Eres Kiru, un analista técnico de seguridad ofensiva y desarrollo de software de élite. \
                                 Usa el contexto provisto para responder de forma exacta y estructurada. \
                                 Si propones comandos de consola, incluye siempre un Plan de Ejecución claro (Objetivo, Herramientas requeridas, Comando y Propósito).".to_string()
                            } else {
                                state.prompt_manager.get_prompt(&current_mode)
                            };

                            let ollama = state.ollama.read().await.clone();
                            let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();

                            let stream_task = tokio::spawn(async move {
                                ollama
                                    .stream_chat(current_history, Some(system_prompt), move |tok| {
                                        let _ = tx.send(tok.to_string());
                                    })
                                    .await
                            });

                            let mut full_response = String::new();

                            while let Some(token) = rx.recv().await {
                                full_response.push_str(&token);
                                let _ = socket
                                    .send(Message::Text(
                                        json!({
                                            "event": "chat_event",
                                            "data": { "type": "token", "content": token }
                                        })
                                        .to_string()
                                        .into(),
                                    ))
                                    .await;
                            }

                            match stream_task.await {
                                Ok(Ok(completed_text)) => {
                                    {
                                        let mut hist = state.history.lock().await;
                                        hist.push(ChatMessage {
                                            role: "assistant".to_string(),
                                            content: completed_text.clone(),
                                        });
                                    }

                                    let mut blocks = state.extractor.extract_blocks(&completed_text);
                                    if !blocks.is_empty() {
                                        let cfg = state.config.read().await;
                                        let _ = state.extractor.save_all(&mut blocks, &cfg.output_dir);

                                        let _ = socket
                                            .send(Message::Text(
                                                json!({
                                                    "event": "chat_event",
                                                    "data": { "type": "code_detected", "blocks": blocks }
                                                })
                                                .to_string()
                                                .into(),
                                            ))
                                            .await;

                                        // Detectar bloques bash para el Controlador Autónomo de Consola
                                        let allow_sudo = *state.allow_sudo.read().await;
                                        for b in &blocks {
                                            if b.language == "bash" || b.language == "sh" || b.extension == "sh" {
                                                let cmd_clean = b
                                                    .code
                                                    .lines()
                                                    .filter(|l| !l.trim().starts_with('#'))
                                                    .collect::<Vec<&str>>()
                                                    .join("\n")
                                                    .trim()
                                                    .to_string();
                                                if !cmd_clean.is_empty() {
                                                    let safety = state.sandbox.validate_command(&cmd_clean, allow_sudo);
                                                    let _ = socket
                                                        .send(Message::Text(
                                                            json!({
                                                                "event": "autonomous_command_proposed",
                                                                "data": {
                                                                    "command": cmd_clean,
                                                                    "safety": safety,
                                                                    "mode": current_mode
                                                                }
                                                            })
                                                            .to_string()
                                                            .into(),
                                                        ))
                                                        .await;
                                                }
                                            }
                                        }

                                        let files = state.file_manager.list_output_files(&cfg.output_dir);
                                        let _ = socket
                                            .send(Message::Text(
                                                json!({
                                                    "event": "files_list",
                                                    "data": { "files": files }
                                                })
                                                .to_string()
                                                .into(),
                                            ))
                                            .await;
                                    }

                                    let _ = socket
                                        .send(Message::Text(
                                            json!({
                                                "event": "chat_event",
                                                "data": { "type": "done", "full_response": completed_text }
                                            })
                                            .to_string()
                                            .into(),
                                        ))
                                        .await;
                                }
                                Ok(Err(e)) => {
                                    let _ = socket
                                        .send(Message::Text(
                                            json!({
                                                "event": "chat_event",
                                                "data": { "type": "error", "content": e }
                                            })
                                            .to_string()
                                            .into(),
                                        ))
                                        .await;
                                }
                                Err(e) => {
                                    let _ = socket
                                        .send(Message::Text(
                                            json!({
                                                "event": "chat_event",
                                                "data": { "type": "error", "content": format!("Error de tarea: {}", e) }
                                            })
                                            .to_string()
                                            .into(),
                                        ))
                                        .await;
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    }
}
