#include "Config.hpp"
#include <cstdlib>
#include <fstream>
#include <iostream>

namespace kiru {

std::filesystem::path Config::get_user_config_path() {
    const char* home = std::getenv("HOME");
    std::filesystem::path home_path = home ? home : ".";
    return home_path / ".config" / "kiru" / "config.json";
}

Config Config::load_default() {
    Config cfg;
    const char* home = std::getenv("HOME");
    std::filesystem::path home_path = home ? home : ".";
    cfg.output_dir = (home_path / "Documentos" / "Kiru-Output").string();
    cfg.rag_docs_dir = (std::filesystem::current_path() / "Rage").string();

    if (const char* env_host = std::getenv("KIRU_OLLAMA_HOST")) cfg.ollama_host = env_host;
    if (const char* env_model = std::getenv("KIRU_MODEL")) cfg.ollama_model = env_model;
    if (const char* env_srv = std::getenv("KIRU_HOST")) cfg.server_host = env_srv;
    if (const char* env_port = std::getenv("KIRU_PORT")) {
        try { cfg.server_port = std::stoi(env_port); } catch (...) {}
    }

    cfg.load_user_config();
    return cfg;
}

void Config::load_user_config() {
    auto path = get_user_config_path();
    if (std::filesystem::exists(path)) {
        try {
            std::ifstream file(path);
            nlohmann::json j;
            file >> j;
            if (j.contains("output_dir") && j["output_dir"].is_string()) {
                output_dir = j["output_dir"].get<std::string>();
            }
            if (j.contains("sandbox_dir") && j["sandbox_dir"].is_string()) {
                sandbox_dir = j["sandbox_dir"].get<std::string>();
            }
            if (j.contains("model") && j["model"].is_string()) {
                ollama_model = j["model"].get<std::string>();
            }
            if (j.contains("ollama_host") && j["ollama_host"].is_string()) {
                ollama_host = j["ollama_host"].get<std::string>();
            }
        } catch (...) {}
    }
}

bool Config::save_setting(const std::string& key, const std::string& value) {
    auto path = get_user_config_path();
    try {
        if (!path.parent_path().empty()) {
            std::filesystem::create_directories(path.parent_path());
        }

        nlohmann::json j = nlohmann::json::object();
        if (std::filesystem::exists(path)) {
            std::ifstream inFile(path);
            try { inFile >> j; } catch (...) {}
        }

        j[key] = value;
        if (key == "output_dir") output_dir = value;
        else if (key == "sandbox_dir") sandbox_dir = value;
        else if (key == "model") ollama_model = value;
        else if (key == "ollama_host") ollama_host = value;

        std::ofstream outFile(path);
        outFile << j.dump(4);
        return true;
    } catch (...) {
        return false;
    }
}

nlohmann::json Config::to_json() const {
    return {
        {"ollama_host", ollama_host},
        {"ollama_model", ollama_model},
        {"server_host", server_host},
        {"server_port", server_port},
        {"output_dir", output_dir},
        {"sandbox_dir", sandbox_dir},
        {"rag_docs_dir", rag_docs_dir},
        {"default_mode", default_mode},
        {"temperature", temperature},
        {"context_length", context_length}
    };
}

} // namespace kiru
