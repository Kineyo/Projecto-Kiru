use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledModelDetail {
    pub name: String,
    pub size_bytes: u64,
    pub size_human: String,
    pub modified_at: String,
    pub parameter_size: String,
    pub quantization: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HauhauModelSpec {
    pub id: String,
    pub ollama_tag: String,
    pub name: String,
    pub variant: String,
    pub recommended: bool,
    pub badge: String,
    pub ssd_size: String,
    pub ram_req: String,
    pub vram_req: String,
    pub cpu_req: String,
    pub target_hardware: String,
    pub description: String,
    pub hf_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub ok: bool,
    pub message: String,
    pub models: Vec<String>,
    pub installed_details: Vec<InstalledModelDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStreamChunk {
    pub model: Option<String>,
    pub message: Option<ChatMessage>,
    pub done: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullProgressChunk {
    pub status: Option<String>,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
    pub error: Option<String>,
}

#[derive(Clone)]
pub struct OllamaClient {
    pub host: String,
    pub model: String,
    client: Client,
    pub context_length: usize,
    pub temperature: f32,
    pub top_p: f32,
    pub top_k: u32,
    pub repeat_penalty: f32,
}

impl OllamaClient {
    pub fn new(
        host: String,
        model: String,
        context_length: usize,
        temperature: f32,
        top_p: f32,
        top_k: u32,
        repeat_penalty: f32,
    ) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(600))
            .build()
            .unwrap_or_default();

        Self {
            host,
            model,
            client,
            context_length,
            temperature,
            top_p,
            top_k,
            repeat_penalty,
        }
    }

    fn format_bytes(bytes: u64) -> String {
        let gb = bytes as f64 / (1024.0 * 1024.0 * 1024.0);
        if gb >= 1.0 {
            format!("{:.2} GB", gb)
        } else {
            let mb = bytes as f64 / (1024.0 * 1024.0);
            format!("{:.0} MB", mb)
        }
    }

    pub async fn check_health(&self) -> HealthStatus {
        let url = format!("{}/api/tags", self.host.trim_end_matches('/'));
        match self.client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(val) = resp.json::<serde_json::Value>().await {
                    let mut models = Vec::new();
                    let mut installed_details = Vec::new();

                    if let Some(arr) = val.get("models").and_then(|v| v.as_array()) {
                        for m in arr {
                            let name = m
                                .get("name")
                                .and_then(|n| n.as_str())
                                .unwrap_or("unknown")
                                .to_string();
                            let size_bytes = m.get("size").and_then(|s| s.as_u64()).unwrap_or(0);
                            let modified_at = m
                                .get("modified_at")
                                .and_then(|s| s.as_str())
                                .unwrap_or("")
                                .chars()
                                .take(10)
                                .collect::<String>();

                            let details = m.get("details");
                            let parameter_size = details
                                .and_then(|d| d.get("parameter_size"))
                                .and_then(|p| p.as_str())
                                .unwrap_or("N/A")
                                .to_string();
                            let quantization = details
                                .and_then(|d| d.get("quantization_level"))
                                .and_then(|q| q.as_str())
                                .unwrap_or("GGUF")
                                .to_string();

                            models.push(name.clone());
                            installed_details.push(InstalledModelDetail {
                                name,
                                size_bytes,
                                size_human: Self::format_bytes(size_bytes),
                                modified_at,
                                parameter_size,
                                quantization,
                            });
                        }
                    }

                    HealthStatus {
                        ok: true,
                        message: format!("Ollama activo ({} modelos instalados)", models.len()),
                        models,
                        installed_details,
                    }
                } else {
                    HealthStatus {
                        ok: false,
                        message: "Error parseando respuesta de Ollama".to_string(),
                        models: Vec::new(),
                        installed_details: Vec::new(),
                    }
                }
            }
            Ok(resp) => HealthStatus {
                ok: false,
                message: format!("Ollama retornó código: {}", resp.status()),
                models: Vec::new(),
                installed_details: Vec::new(),
            },
            Err(e) => HealthStatus {
                ok: false,
                message: format!("No se pudo conectar a Ollama ({})", e),
                models: Vec::new(),
                installed_details: Vec::new(),
            },
        }
    }

    #[allow(dead_code)]
    pub async fn list_models(&self) -> Vec<String> {
        self.check_health().await.models
    }

    pub fn set_model(&mut self, model: &str) {
        self.model = model.to_string();
    }

    /// Catálogo oficial de modelos de https://huggingface.co/HauhauCS
    /// Con los modelos recomendados al principio y especificaciones técnicas completas.
    pub fn get_hauhau_catalog() -> Vec<HauhauModelSpec> {
        vec![
            HauhauModelSpec {
                id: "qwen3.5-4b-aggressive".to_string(),
                ollama_tag: "hf.co/HauhauCS/Qwen3.5-4B-Uncensored-HauhauCS-Aggressive:Q4_K_M".to_string(),
                name: "⭐ [RECOMENDADO #1] Qwen 3.5 4B Uncensored Aggressive (Q4_K_M)".to_string(),
                variant: "Aggressive (0% Refusals)".to_string(),
                recommended: true,
                badge: "⭐ RECOMENDADO · EQUILIBRIO PERFECTO".to_string(),
                ssd_size: "2.6 GB".to_string(),
                ram_req: "6 GB mín / 8 GB rec".to_string(),
                vram_req: "4 GB VRAM (o modo CPU puro)".to_string(),
                cpu_req: "4 núcleos (Intel Core i5 / AMD Ryzen 5 / Apple M1+)".to_string(),
                target_hardware: "Laptops de uso diario, PCs de gama media, GPUs GTX 1650 / RTX 3050 o gráficos integrados".to_string(),
                description: "El mejor balance entre velocidad, precisión en código C++/Rust y análisis de seguridad ofensiva sin censura.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/Qwen3.5-4B-Uncensored-HauhauCS-Aggressive".to_string(),
            },
            HauhauModelSpec {
                id: "qwen3.5-2b-aggressive".to_string(),
                ollama_tag: "hf.co/HauhauCS/Qwen3.5-2B-Uncensored-HauhauCS-Aggressive:Q4_K_M".to_string(),
                name: "⭐ [RECOMENDADO #2] Qwen 3.5 2B Uncensored Aggressive (Q4_K_M)".to_string(),
                variant: "Aggressive (Ultra-Ligero)".to_string(),
                recommended: true,
                badge: "⭐ RECOMENDADO · BAJOS RECURSOS / CPU".to_string(),
                ssd_size: "1.4 GB".to_string(),
                ram_req: "4 GB RAM".to_string(),
                vram_req: "No requiere GPU (1.5 GB si usa GPU)".to_string(),
                cpu_req: "2 a 4 núcleos (Cualquier procesador x86_64 o ARM64)".to_string(),
                target_hardware: "Laptops ultraligeras sin GPU dedicada, máquinas virtuales (VM), Mini-PCs y equipos con 4-8 GB de RAM".to_string(),
                description: "Respuestas instantáneas y consumo mínimo de memoria. Ideal para control autónomo de consola en equipos modestos.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/Qwen3.5-2B-Uncensored-HauhauCS-Aggressive".to_string(),
            },
            HauhauModelSpec {
                id: "qwen3.5-9b-aggressive".to_string(),
                ollama_tag: "hf.co/HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive:Q4_K_M".to_string(),
                name: "⭐ [RECOMENDADO #3] Qwen 3.5 9B Uncensored Aggressive (Q4_K_M)".to_string(),
                variant: "Aggressive (Pro Coding & Pentest)".to_string(),
                recommended: true,
                badge: "⭐ RECOMENDADO · POTENCIA PROFESIONAL".to_string(),
                ssd_size: "5.8 GB".to_string(),
                ram_req: "12 GB mín / 16 GB rec".to_string(),
                vram_req: "6 a 8 GB VRAM".to_string(),
                cpu_req: "6 a 8 núcleos (Intel Core i7 / Ryzen 7 / Apple M1 Pro+)".to_string(),
                target_hardware: "PCs Gaming / Desarrollo con RTX 3060, RTX 4060, RX 6700 XT o MacBooks con 16 GB de memoria unificada".to_string(),
                description: "Razonamiento técnico profundo para auditorías complejas, planeación autónoma multi-paso y arquitectura C++/Rust.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive".to_string(),
            },
            HauhauModelSpec {
                id: "gemma4-e2b-aggressive".to_string(),
                ollama_tag: "hf.co/HauhauCS/Gemma-4-E2B-Uncensored-HauhauCS-Aggressive:Q4_K_M".to_string(),
                name: "Gemma 4 E2B Uncensored Aggressive (Q4_K_M)".to_string(),
                variant: "Aggressive".to_string(),
                recommended: false,
                badge: "LIGERO · 2B PARÁMETROS".to_string(),
                ssd_size: "1.6 GB".to_string(),
                ram_req: "4 GB RAM".to_string(),
                vram_req: "2 GB VRAM (o CPU)".to_string(),
                cpu_req: "4 núcleos".to_string(),
                target_hardware: "Portátiles de oficina, equipos sin tarjeta gráfica dedicada y contenedores ligeros".to_string(),
                description: "Arquitectura Gemma 4 compacta editada por HauhauCS sin bloqueos artificiales.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/Gemma-4-E2B-Uncensored-HauhauCS-Aggressive".to_string(),
            },
            HauhauModelSpec {
                id: "gemma4-e4b-aggressive".to_string(),
                ollama_tag: "hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M".to_string(),
                name: "Gemma 4 E4B Uncensored Aggressive (Q4_K_M)".to_string(),
                variant: "Aggressive".to_string(),
                recommended: false,
                badge: "GAMA MEDIA · 4B PARÁMETROS".to_string(),
                ssd_size: "2.9 GB".to_string(),
                ram_req: "8 GB RAM".to_string(),
                vram_req: "4 GB VRAM".to_string(),
                cpu_req: "4 a 6 núcleos".to_string(),
                target_hardware: "Laptops modernas con 8 GB+ RAM o GPUs de entrada (4 GB VRAM)".to_string(),
                description: "Excelente seguimiento de instrucciones estructuradas y generación de planes de consola.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive".to_string(),
            },
            HauhauModelSpec {
                id: "qwen3vl-8b-aggressive".to_string(),
                ollama_tag: "hf.co/HauhauCS/Qwen3VL-8B-Uncensored-HauhauCS-Aggressive:Q4_K_M".to_string(),
                name: "Qwen 3 VL 8B Uncensored Aggressive (Q4_K_M)".to_string(),
                variant: "Aggressive Multimodal".to_string(),
                recommended: false,
                badge: "GAMA MEDIA-ALTA · 8B PARÁMETROS".to_string(),
                ssd_size: "5.4 GB".to_string(),
                ram_req: "12 GB RAM".to_string(),
                vram_req: "8 GB VRAM".to_string(),
                cpu_req: "6 núcleos".to_string(),
                target_hardware: "Equipos con GPU dedicada de 8 GB VRAM (RTX 3060Ti / 3070 / 4060)".to_string(),
                description: "Modelo de 8B parámetros sin censura con gran capacidad de análisis sintáctico y scripting.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/Qwen3VL-8B-Uncensored-HauhauCS-Aggressive".to_string(),
            },
            HauhauModelSpec {
                id: "gemma4-12b-balanced".to_string(),
                ollama_tag: "hf.co/HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced:Q4_K_M".to_string(),
                name: "Gemma 4 12B QAT Uncensored Balanced (Q4_K_M)".to_string(),
                variant: "Balanced (Agentes & Tool-Use)".to_string(),
                recommended: false,
                badge: "AVANZADO · 12B PARÁMETROS".to_string(),
                ssd_size: "7.6 GB".to_string(),
                ram_req: "16 GB RAM".to_string(),
                vram_req: "10 a 12 GB VRAM".to_string(),
                cpu_req: "8 núcleos".to_string(),
                target_hardware: "PCs con RTX 3060 (12GB), RTX 4070, RX 6800 o Mac M1/M2/M3 con 16-24 GB RAM".to_string(),
                description: "Variante Balanced optimizada con QAT para máxima estabilidad en agentes autónomos y planes largos.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced".to_string(),
            },
            HauhauModelSpec {
                id: "gpt-oss-20b-aggressive".to_string(),
                ollama_tag: "hf.co/HauhauCS/GPT-OSS-20B-Uncensored-HauhauCS-Aggressive:Q4_K_M".to_string(),
                name: "GPT-OSS 20B Uncensored Aggressive (Q4_K_M)".to_string(),
                variant: "Aggressive".to_string(),
                recommended: false,
                badge: "WORKSTATION · 20B PARÁMETROS".to_string(),
                ssd_size: "12.4 GB".to_string(),
                ram_req: "24 GB mín / 32 GB rec".to_string(),
                vram_req: "16 GB VRAM".to_string(),
                cpu_req: "8 a 12 núcleos".to_string(),
                target_hardware: "Estaciones de trabajo con RTX 4060 Ti (16GB), RTX 4080, RX 7800 XT o Mac 32GB".to_string(),
                description: "Modelo de 20B parámetros para ingeniería inversa compleja y refactorización masiva.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/GPT-OSS-20B-Uncensored-HauhauCS-Aggressive".to_string(),
            },
            HauhauModelSpec {
                id: "qwen3.8-27b-aggressive".to_string(),
                ollama_tag: "hf.co/HauhauCS/Qwen3.8-27B-Uncensored-HauhauCS-Aggressive-MTP-GGUF:Q4_K_M".to_string(),
                name: "Qwen 3.8 27B Uncensored Aggressive MTP (Q4_K_M)".to_string(),
                variant: "Aggressive + MTP".to_string(),
                recommended: false,
                badge: "ENTUSIASTA · 27B PARÁMETROS".to_string(),
                ssd_size: "16.8 GB".to_string(),
                ram_req: "32 GB RAM".to_string(),
                vram_req: "20 a 24 GB VRAM".to_string(),
                cpu_req: "12 a 16 núcleos (Ryzen 9 / Core i9 / Apple M2 Max+)".to_string(),
                target_hardware: "Workstations entusiastas con RTX 3090 / RTX 4090 (24 GB VRAM) o Mac Studio 32GB+".to_string(),
                description: "Buque insignia denso de 27B con Multi-Token Prediction (MTP) y 0% rechazos.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/Qwen3.8-27B-Uncensored-HauhauCS-Aggressive-MTP-GGUF".to_string(),
            },
            HauhauModelSpec {
                id: "qwen3.6-35b-a3b-aggressive".to_string(),
                ollama_tag: "hf.co/HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive:Q4_K_M".to_string(),
                name: "Qwen 3.6 35B-A3B MoE Uncensored Aggressive (Q4_K_M)".to_string(),
                variant: "Aggressive MoE (3B Activos)".to_string(),
                recommended: false,
                badge: "SERVIDOR / MoE · 35B TOTAL (3B ACTIVOS)".to_string(),
                ssd_size: "21.0 GB".to_string(),
                ram_req: "32 GB RAM".to_string(),
                vram_req: "24 GB VRAM (o híbrido RAM+VRAM)".to_string(),
                cpu_req: "12 a 16 núcleos".to_string(),
                target_hardware: "Workstations con 32-64 GB RAM o GPUs de 24 GB; alta velocidad gracias a solo 3B parámetros activos por token".to_string(),
                description: "Arquitectura Mixture-of-Experts (MoE): conocimiento de un modelo de 35B con la velocidad de uno de 3B.".to_string(),
                hf_url: "https://huggingface.co/HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive".to_string(),
            },
        ]
    }

    pub async fn pull_model<F>(&self, model_name: &str, mut progress_cb: F) -> Result<(), String>
    where
        F: FnMut(PullProgressChunk) + Send + 'static,
    {
        let url = format!("{}/api/pull", self.host.trim_end_matches('/'));
        let body = json!({
            "name": model_name,
            "stream": true
        });

        let resp = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Error conectando a Ollama para descargar modelo: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Ollama retornó estado {} al descargar {}", resp.status(), model_name));
        }

        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();

        while let Some(chunk_res) = stream.next().await {
            let chunk = chunk_res.map_err(|e| format!("Error en stream de descarga: {}", e))?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(pos) = buffer.find('\n') {
                let line = buffer[..pos].trim().to_string();
                buffer = buffer[pos + 1..].to_string();

                if line.is_empty() {
                    continue;
                }

                if let Ok(parsed) = serde_json::from_str::<PullProgressChunk>(&line) {
                    if let Some(err) = &parsed.error {
                        return Err(format!("Error de Ollama pull: {}", err));
                    }
                    progress_cb(parsed);
                }
            }
        }

        Ok(())
    }

    pub async fn stream_chat<F>(
        &self,
        messages: Vec<ChatMessage>,
        system: Option<String>,
        mut token_callback: F,
    ) -> Result<String, String>
    where
        F: FnMut(&str) + Send + 'static,
    {
        let url = format!("{}/api/chat", self.host.trim_end_matches('/'));

        let mut all_msgs = Vec::new();
        if let Some(sys) = system {
            if !sys.is_empty() {
                all_msgs.push(ChatMessage {
                    role: "system".to_string(),
                    content: sys,
                });
            }
        }
        all_msgs.extend(messages);

        let body = json!({
            "model": self.model,
            "messages": all_msgs,
            "stream": true,
            "options": {
                "num_ctx": self.context_length,
                "temperature": self.temperature,
                "top_p": self.top_p,
                "top_k": self.top_k,
                "repeat_penalty": self.repeat_penalty
            }
        });

        let resp = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Error conectando a Ollama: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Ollama error status: {} (Verifica que el modelo '{}' esté instalado)", resp.status(), self.model));
        }

        let mut full_response = String::new();
        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();

        while let Some(chunk_res) = stream.next().await {
            let chunk = chunk_res.map_err(|e| format!("Error en streaming: {}", e))?;
            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            while let Some(pos) = buffer.find('\n') {
                let line = buffer[..pos].trim().to_string();
                buffer = buffer[pos + 1..].to_string();

                if line.is_empty() {
                    continue;
                }

                if let Ok(parsed) = serde_json::from_str::<ChatStreamChunk>(&line) {
                    if let Some(msg) = parsed.message {
                        if !msg.content.is_empty() {
                            token_callback(&msg.content);
                            full_response.push_str(&msg.content);
                        }
                    }
                }
            }
        }

        Ok(full_response)
    }
}
