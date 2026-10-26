use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedCode {
    pub filename: String,
    pub language: String,
    pub extension: String,
    pub code: String,
    pub path: Option<String>,
}

#[derive(Clone)]
pub struct CodeExtractor {
    lang_extensions: HashMap<&'static str, &'static str>,
}

impl Default for CodeExtractor {
    fn default() -> Self {
        Self::new()
    }
}

impl CodeExtractor {
    pub fn new() -> Self {
        let mut m = HashMap::new();
        // C / C++ / Rust
        m.insert("rust", "rs");
        m.insert("rs", "rs");
        m.insert("c", "c");
        m.insert("cpp", "cpp");
        m.insert("c++", "cpp");
        m.insert("cxx", "cpp");
        m.insert("h", "h");
        m.insert("hpp", "hpp");

        // Python / Ruby / Perl / Lua
        m.insert("python", "py");
        m.insert("py", "py");
        m.insert("ruby", "rb");
        m.insert("rb", "rb");
        m.insert("perl", "pl");
        m.insert("lua", "lua");

        // JavaScript / TypeScript / Web
        m.insert("javascript", "js");
        m.insert("js", "js");
        m.insert("typescript", "ts");
        m.insert("ts", "ts");
        m.insert("jsx", "jsx");
        m.insert("tsx", "tsx");
        m.insert("html", "html");
        m.insert("htm", "html");
        m.insert("css", "css");
        m.insert("scss", "scss");
        m.insert("vue", "vue");
        m.insert("svelte", "svelte");

        // Systems & Backend
        m.insert("go", "go");
        m.insert("golang", "go");
        m.insert("csharp", "cs");
        m.insert("cs", "cs");
        m.insert("java", "java");
        m.insert("kotlin", "kt");
        m.insert("kt", "kt");
        m.insert("scala", "scala");
        m.insert("swift", "swift");
        m.insert("zig", "zig");
        m.insert("nim", "nim");

        // Shell & Scripts
        m.insert("bash", "sh");
        m.insert("sh", "sh");
        m.insert("zsh", "sh");
        m.insert("shell", "sh");
        m.insert("powershell", "ps1");
        m.insert("ps1", "ps1");
        m.insert("batch", "bat");
        m.insert("bat", "bat");
        m.insert("cmd", "bat");

        // Data & Config
        m.insert("json", "json");
        m.insert("yaml", "yaml");
        m.insert("yml", "yml");
        m.insert("toml", "toml");
        m.insert("xml", "xml");
        m.insert("sql", "sql");
        m.insert("dockerfile", "Dockerfile");
        m.insert("docker", "Dockerfile");
        m.insert("make", "Makefile");
        m.insert("makefile", "Makefile");
        m.insert("cmake", "cmake");
        m.insert("markdown", "md");
        m.insert("md", "md");
        m.insert("text", "txt");
        m.insert("txt", "txt");

        Self {
            lang_extensions: m,
        }
    }

    pub fn get_extension(&self, lang: &str) -> String {
        let clean = lang.trim().to_lowercase();
        self.lang_extensions
            .get(clean.as_str())
            .unwrap_or(&"txt")
            .to_string()
    }

    pub fn extract_filename(&self, code: &str, default_ext: &str) -> String {
        let patterns = [
            r#"(?i)(?:#|//|--|/\*|<!--)\s*filename:\s*([a-zA-Z0-9_\-\./]+)"#,
            r#"(?i)(?:#|//|--)\s*(?:file|archivo):\s*([a-zA-Z0-9_\-\./]+)"#,
            r#"(?i)(?:#|//|--)\s*([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]{1,5})\b"#,
        ];

        for pat in &patterns {
            if let Ok(re) = Regex::new(pat) {
                for line in code.lines().take(5) {
                    if let Some(caps) = re.captures(line) {
                        if let Some(matched) = caps.get(1) {
                            let name = matched.as_str().trim();
                            let clean_name = Path::new(name)
                                .file_name()
                                .and_then(|f| f.to_str())
                                .unwrap_or(name);
                            if !clean_name.is_empty() {
                                return clean_name.to_string();
                            }
                        }
                    }
                }
            }
        }

        // Fallback name
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        code.hash(&mut hasher);
        let hash_val = hasher.finish();
        format!("snippet_{:x}.{}", (hash_val & 0xFFFF), default_ext)
    }

    pub fn extract_blocks(&self, text: &str) -> Vec<ExtractedCode> {
        let mut results = Vec::new();
        // Regex matches ```language ... ```
        let block_regex = Regex::new(r"(?s)```([a-zA-Z0-9_#\+\.\-]*)\r?\n(.*?)\r?\n```").unwrap();

        for cap in block_regex.captures_iter(text) {
            let raw_lang = cap.get(1).map_or("", |m| m.as_str()).trim();
            let code = cap.get(2).map_or("", |m| m.as_str()).to_string();

            if code.trim().is_empty() {
                continue;
            }

            let ext = self.get_extension(raw_lang);
            let filename = self.extract_filename(&code, &ext);

            results.push(ExtractedCode {
                filename,
                language: if raw_lang.is_empty() {
                    ext.clone()
                } else {
                    raw_lang.to_string()
                },
                extension: ext,
                code,
                path: None,
            });
        }

        results
    }

    pub fn save_all(&self, blocks: &mut [ExtractedCode], output_dir: &str) -> std::io::Result<()> {
        fs::create_dir_all(output_dir)?;
        for block in blocks.iter_mut() {
            let target_path = Path::new(output_dir).join(&block.filename);
            fs::write(&target_path, &block.code)?;
            block.path = Some(target_path.to_string_lossy().to_string());
        }
        Ok(())
    }
}
