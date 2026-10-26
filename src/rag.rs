use std::collections::HashSet;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone)]
pub struct RagChunk {
    pub source: String,
    pub chunk_id: usize,
    pub content: String,
    pub terms: HashSet<String>,
}

#[derive(Clone, Default)]
pub struct RagEngine {
    docs_dir: String,
    chunks: Vec<RagChunk>,
    is_indexed: bool,
}

impl RagEngine {
    pub fn new(docs_dir: &str) -> Self {
        let mut engine = Self {
            docs_dir: docs_dir.to_string(),
            chunks: Vec::new(),
            is_indexed: false,
        };
        engine.index_markdown();
        engine
    }

    fn tokenize(text: &str) -> HashSet<String> {
        text.to_lowercase()
            .split(|c: char| !c.is_alphanumeric() && c != '_' && c != '-')
            .filter(|w| w.len() >= 3)
            .map(|w| w.to_string())
            .collect()
    }

    pub fn index_markdown(&mut self) -> usize {
        self.chunks.clear();
        let path = Path::new(&self.docs_dir);
        if !path.exists() {
            return 0;
        }

        for entry in WalkDir::new(path).into_iter().flatten() {
            if entry.file_type().is_file() {
                if let Some(ext) = entry.path().extension() {
                    if ext == "md" {
                        if let Ok(content) = fs::read_to_string(entry.path()) {
                            let source = entry.file_name().to_string_lossy().to_string();
                            let words: Vec<&str> = content.split_whitespace().collect();
                            let chunk_size = 350;
                            let overlap = 50;

                            let mut i = 0;
                            let mut chunk_id = 0;
                            while i < words.len() {
                                let end = (i + chunk_size).min(words.len());
                                let chunk_text = words[i..end].join(" ");
                                let terms = Self::tokenize(&chunk_text);

                                self.chunks.push(RagChunk {
                                    source: source.clone(),
                                    chunk_id,
                                    content: chunk_text,
                                    terms,
                                });

                                chunk_id += 1;
                                if end == words.len() {
                                    break;
                                }
                                i += chunk_size.saturating_sub(overlap).max(1);
                            }
                        }
                    }
                }
            }
        }

        self.is_indexed = true;
        self.chunks.len()
    }

    pub fn query(&self, query_text: &str, top_k: usize) -> Option<String> {
        if self.chunks.is_empty() {
            return None;
        }

        let query_terms = Self::tokenize(query_text);
        if query_terms.is_empty() {
            return None;
        }

        let mut scored: Vec<(f32, &RagChunk)> = Vec::new();

        for chunk in &self.chunks {
            let mut score = 0.0f32;
            for q in &query_terms {
                if chunk.terms.contains(q) {
                    score += 1.0;
                    // Boost if matching filename/source
                    if chunk.source.to_lowercase().contains(q) {
                        score += 2.5;
                    }
                }
            }

            if score > 0.0 {
                scored.push((score, chunk));
            }
        }

        if scored.is_empty() {
            return None;
        }

        scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

        let top_results: Vec<String> = scored
            .into_iter()
            .take(top_k)
            .map(|(score, ch)| {
                format!(
                    "--- [Fuente: {} (Chunk #{}, Relevancia: {:.1})] ---\n{}",
                    ch.source, ch.chunk_id, score, ch.content
                )
            })
            .collect();

        Some(top_results.join("\n\n"))
    }

    pub fn total_chunks(&self) -> usize {
        self.chunks.len()
    }
}
