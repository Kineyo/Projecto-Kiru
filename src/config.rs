use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub ollama_host: String,
    pub ollama_model: String,
    pub server_host: String,
    pub server_port: u16,
    pub timeout_seconds: u64,
    pub context_length: usize,
    pub temperature: f32,
    pub top_p: f32,
    pub top_k: u32,
    pub repeat_penalty: f32,
    pub output_dir: String,
    pub sandbox_dir: String,
    pub rag_docs_dir: String,
    pub default_mode: String,
    pub max_history: usize,
}

impl Default for AppConfig {
    fn default() -> Self {
        let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let default_output = format!("{}/Documentos/Kiru-Output", home);
        let default_sandbox = "/tmp/kiru-sandbox".to_string();

        let base_dir = env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .to_string_lossy()
            .to_string();
        let rag_docs = format!("{}/Rage", base_dir);

        let mut config = Self {
            ollama_host: env::var("KIRU_OLLAMA_HOST")
                .unwrap_or_else(|_| "http://localhost:11434".to_string()),
            ollama_model: env::var("KIRU_MODEL")
                .unwrap_or_else(|_| "Qwen3.5:4B-Uncensored-Aggressive".to_string()),
            server_host: env::var("KIRU_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            server_port: env::var("KIRU_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(5000),
            timeout_seconds: 120,
            context_length: 8192,
            temperature: 0.2,
            top_p: 0.9,
            top_k: 40,
            repeat_penalty: 1.1,
            output_dir: default_output,
            sandbox_dir: default_sandbox,
            rag_docs_dir: rag_docs,
            default_mode: "code".to_string(),
            max_history: 20,
        };

        config.load_user_config();
        config
    }
}

impl AppConfig {
    pub fn config_path() -> PathBuf {
        let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
        Path::new(&home).join(".config/kiru/config.json")
    }

    pub fn load_user_config(&mut self) {
        let path = Self::config_path();
        if path.exists() {
            if let Ok(contents) = fs::read_to_string(&path) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&contents) {
                    if let Some(out) = val.get("output_dir").and_then(|v| v.as_str()) {
                        self.output_dir = out.to_string();
                    }
                    if let Some(sb) = val.get("sandbox_dir").and_then(|v| v.as_str()) {
                        self.sandbox_dir = sb.to_string();
                    }
                    if let Some(m) = val.get("model").and_then(|v| v.as_str()) {
                        self.ollama_model = m.to_string();
                    }
                    if let Some(h) = val.get("ollama_host").and_then(|v| v.as_str()) {
                        self.ollama_host = h.to_string();
                    }
                }
            }
        }
    }

    pub fn save_setting(&mut self, key: &str, value: &str) -> Result<(), String> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let mut val = if path.exists() {
            fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                .unwrap_or_else(|| serde_json::json!({}))
        } else {
            serde_json::json!({})
        };

        if let Some(obj) = val.as_object_mut() {
            obj.insert(key.to_string(), serde_json::Value::String(value.to_string()));
        }

        match key {
            "output_dir" => self.output_dir = value.to_string(),
            "sandbox_dir" => self.sandbox_dir = value.to_string(),
            "model" => self.ollama_model = value.to_string(),
            "ollama_host" => self.ollama_host = value.to_string(),
            _ => {}
        }

        let data = serde_json::to_string_pretty(&val).map_err(|e| e.to_string())?;
        fs::write(path, data).map_err(|e| e.to_string())?;
        Ok(())
    }
}
