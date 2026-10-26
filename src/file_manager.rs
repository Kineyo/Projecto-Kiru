use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputFileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub size_human: String,
    pub modified: String,
    pub extension: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputStats {
    pub total_files: usize,
    pub total_size: u64,
    pub total_size_human: String,
    pub languages: HashMap<String, usize>,
}

#[derive(Clone, Default)]
#[allow(dead_code)]
pub struct FileManager;

#[allow(dead_code)]
impl FileManager {
    pub fn new() -> Self {
        Self
    }

    pub fn ensure_directory<P: AsRef<Path>>(path: P) -> std::io::Result<()> {
        fs::create_dir_all(path)
    }

    pub fn human_size(bytes: u64) -> String {
        const KB: f64 = 1024.0;
        const MB: f64 = KB * 1024.0;
        const GB: f64 = MB * 1024.0;

        let b = bytes as f64;
        if b < KB {
            format!("{} B", bytes)
        } else if b < MB {
            format!("{:.1} KB", b / KB)
        } else if b < GB {
            format!("{:.1} MB", b / MB)
        } else {
            format!("{:.2} GB", b / GB)
        }
    }

    pub fn save_file(&self, content: &str, filepath: &Path) -> std::io::Result<PathBuf> {
        if let Some(parent) = filepath.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(filepath, content)?;
        fs::canonicalize(filepath).or_else(|_| Ok(filepath.to_path_buf()))
    }

    pub fn list_output_files(&self, output_dir: &str) -> Vec<OutputFileInfo> {
        let mut files = Vec::new();
        let path = Path::new(output_dir);
        if !path.exists() {
            return files;
        }

        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_file() {
                        let file_path = entry.path();
                        let name = entry.file_name().to_string_lossy().to_string();
                        let ext = file_path
                            .extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("")
                            .to_string();

                        let metadata = entry.metadata().ok();
                        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                        let modified = metadata
                            .and_then(|m| m.modified().ok())
                            .map(|st| {
                                let dt: DateTime<Local> = st.into();
                                dt.format("%Y-%m-%d %H:%M:%S").to_string()
                            })
                            .unwrap_or_else(|| "-".to_string());

                        files.push(OutputFileInfo {
                            name,
                            path: file_path.to_string_lossy().to_string(),
                            size,
                            size_human: Self::human_size(size),
                            modified,
                            extension: ext,
                        });
                    }
                }
            }
        }

        // Sort descending by modified date / name
        files.sort_by(|a, b| b.modified.cmp(&a.modified));
        files
    }

    pub fn get_file_content(&self, filepath: &str) -> Option<String> {
        fs::read_to_string(filepath).ok()
    }

    pub fn delete_file(&self, filepath: &str) -> bool {
        fs::remove_file(filepath).is_ok()
    }

    pub fn get_output_stats(&self, output_dir: &str) -> OutputStats {
        let files = self.list_output_files(output_dir);
        let mut languages: HashMap<String, usize> = HashMap::new();
        let mut total_size: u64 = 0;

        for f in &files {
            total_size += f.size;
            let ext = if f.extension.is_empty() {
                "other".to_string()
            } else {
                f.extension.clone()
            };
            *languages.entry(ext).or_insert(0) += 1;
        }

        OutputStats {
            total_files: files.len(),
            total_size,
            total_size_human: Self::human_size(total_size),
            languages,
        }
    }
}
