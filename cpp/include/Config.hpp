#pragma once

#include <string>
#include <filesystem>
#include <nlohmann/json.hpp>

namespace kiru {

struct Config {
    std::string ollama_host = "http://localhost:11434";
    std::string ollama_model = "Qwen3.5:4B-Uncensored-Aggressive";
    std::string server_host = "127.0.0.1";
    int server_port = 5000;
    int timeout_seconds = 120;
    int context_length = 8192;
    float temperature = 0.2f;
    float top_p = 0.9f;
    int top_k = 40;
    float repeat_penalty = 1.1f;
    std::string output_dir;
    std::string sandbox_dir = "/tmp";
    std::string rag_docs_dir;
    std::string default_mode = "code";
    int max_history = 20;

    static Config load_default();
    static std::filesystem::path get_user_config_path();
    void load_user_config();
    bool save_setting(const std::string& key, const std::string& value);
    nlohmann::json to_json() const;
};

} // namespace kiru
