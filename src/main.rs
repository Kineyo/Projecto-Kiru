mod code_extractor;
mod config;
mod file_manager;
mod ollama;
mod pentest;
mod rag;
mod sandbox;
mod server;
mod system_prompt;

use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

use code_extractor::CodeExtractor;
use config::AppConfig;
use file_manager::FileManager;
use ollama::OllamaClient;
use pentest::PentestAuditor;
use rag::RagEngine;
use sandbox::SandboxExecutor;
use system_prompt::SystemPromptManager;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();

    // Check for audit sub-command
    if args.len() > 1 && (args[1] == "audit" || args[1] == "--audit") {
        println!("🛡️  Ejecutando Auditoría Nativa de Seguridad Kiru...");
        let report = PentestAuditor::full_audit();
        println!("{}", serde_json::to_string_pretty(&report)?);
        return Ok(());
    }

    let mut config = AppConfig::default();

    // Support --port <N> CLI argument
    let mut i = 1;
    while i < args.len() {
        if args[i] == "--port" && i + 1 < args.len() {
            if let Ok(p) = args[i + 1].parse::<u16>() {
                config.server_port = p;
            }
            i += 1;
        }
        i += 1;
    }

    println!("============================================================");
    println!("✨ Kiru AI - Core Server (Rust Edition v2.0)");
    println!("   Asistente IA para Generación de Código y Pentesting");
    println!("============================================================");
    println!("   🔧 Ollama Host:      {}", config.ollama_host);
    println!("   🧠 Modelo Activo:    {}", config.ollama_model);
    println!("   📁 Carpeta Output:   {}", config.output_dir);
    println!("   📦 Carpeta Sandbox:  {}", config.sandbox_dir);
    println!("   📚 Base de Conocimiento (RAG): {}", config.rag_docs_dir);
    println!("============================================================");

    // Initialize components
    let file_manager = FileManager::new();
    let _ = FileManager::ensure_directory(&config.output_dir);

    println!("⏳ Indexando documentos RAG desde {}...", config.rag_docs_dir);
    let rag = RagEngine::new(&config.rag_docs_dir);
    println!("✅ RAG indexado: {} fragmentos en memoria.", rag.total_chunks());

    let ollama = OllamaClient::new(
        config.ollama_host.clone(),
        config.ollama_model.clone(),
        config.context_length,
        config.temperature,
        config.top_p,
        config.top_k,
        config.repeat_penalty,
    );

    let prompt_manager = SystemPromptManager::new();
    let extractor = CodeExtractor::new();
    let sandbox = SandboxExecutor::new();

    let host = config.server_host.clone();
    let port = config.server_port;

    let app_state = Arc::new(server::AppState {
        config: RwLock::new(config),
        ollama: RwLock::new(ollama),
        prompt_manager,
        extractor,
        file_manager,
        rag: RwLock::new(rag),
        sandbox,
        history: Mutex::new(Vec::new()),
        current_mode: RwLock::new("code".to_string()),
        allow_sudo: RwLock::new(false),
    });

    let router = server::create_router(app_state);

    let bind_addr = format!("{}:{}", host, port);
    println!("🚀 Kiru Server escuchando en http://{}", bind_addr);

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    axum::serve(listener, router).await?;

    Ok(())
}
