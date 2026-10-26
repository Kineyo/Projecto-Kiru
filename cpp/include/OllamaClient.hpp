#pragma once

#include <string>
#include <vector>
#include <functional>
#include <nlohmann/json.hpp>

namespace kiru {

struct OllamaHealth {
    bool ok = false;
    std::string message;
    std::vector<std::string> models;

    nlohmann::json to_json() const;
};

class OllamaClient {
public:
    OllamaClient(std::string host, std::string model, int context_length = 8192,
                 float temperature = 0.2f, float top_p = 0.9f, int top_k = 40,
                 float repeat_penalty = 1.1f);
    ~OllamaClient();

    OllamaHealth check_health() const;
    std::vector<std::string> list_models() const;
    void set_model(const std::string& new_model) { model = new_model; }
    std::string get_model() const { return model; }

    std::string stream_chat(
        const std::vector<nlohmann::json>& messages,
        const std::string& system_prompt,
        std::function<void(const std::string&)> token_callback
    ) const;

private:
    std::string host;
    std::string model;
    int context_length;
    float temperature;
    float top_p;
    int top_k;
    float repeat_penalty;

    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp);
    static size_t StreamCallback(void* contents, size_t size, size_t nmemb, void* userp);
};

} // namespace kiru
