#include "OllamaClient.hpp"
#include <curl/curl.h>
#include <iostream>
#include <sstream>

namespace kiru {

nlohmann::json OllamaHealth::to_json() const {
    return {
        {"ok", ok},
        {"message", message},
        {"models", models}
    };
}

OllamaClient::OllamaClient(std::string host, std::string model, int context_length,
                           float temperature, float top_p, int top_k, float repeat_penalty)
    : host(std::move(host)), model(std::move(model)), context_length(context_length),
      temperature(temperature), top_p(top_p), top_k(top_k), repeat_penalty(repeat_penalty) {
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

OllamaClient::~OllamaClient() {
    curl_global_cleanup();
}

size_t OllamaClient::WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t total = size * nmemb;
    auto* s = static_cast<std::string*>(userp);
    s->append(static_cast<char*>(contents), total);
    return total;
}

struct StreamState {
    std::string buffer;
    std::string full_response;
    std::function<void(const std::string&)> token_callback;
};

size_t OllamaClient::StreamCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t total = size * nmemb;
    auto* state = static_cast<StreamState*>(userp);
    state->buffer.append(static_cast<char*>(contents), total);

    size_t pos;
    while ((pos = state->buffer.find('\n')) != std::string::npos) {
        std::string line = state->buffer.substr(0, pos);
        state->buffer.erase(0, pos + 1);

        if (line.empty()) continue;

        try {
            auto j = nlohmann::json::parse(line);
            if (j.contains("message") && j["message"].contains("content")) {
                std::string token = j["message"]["content"].get<std::string>();
                if (!token.empty()) {
                    state->full_response += token;
                    if (state->token_callback) {
                        state->token_callback(token);
                    }
                }
            }
        } catch (...) {}
    }

    return total;
}

OllamaHealth OllamaClient::check_health() const {
    OllamaHealth health;
    CURL* curl = curl_easy_init();
    if (!curl) {
        health.ok = false;
        health.message = "Error al inicializar CURL";
        return health;
    }

    std::string url = host;
    while (!url.empty() && url.back() == '/') url.pop_back();
    url += "/api/tags";

    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

    CURLcode res = curl_easy_perform(curl);
    if (res == CURLE_OK) {
        long response_code;
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
        if (response_code == 200) {
            try {
                auto j = nlohmann::json::parse(response);
                if (j.contains("models") && j["models"].is_array()) {
                    for (const auto& m : j["models"]) {
                        if (m.contains("name")) {
                            health.models.push_back(m["name"].get<std::string>());
                        }
                    }
                }
                health.ok = true;
                health.message = "Ollama conectado exitosamente";
            } catch (...) {
                health.ok = false;
                health.message = "Error al parsear tags de Ollama";
            }
        } else {
            health.ok = false;
            health.message = "Ollama devolvió código: " + std::to_string(response_code);
        }
    } else {
        health.ok = false;
        health.message = "No se puede conectar a Ollama en " + host;
    }

    curl_easy_cleanup(curl);
    return health;
}

std::vector<std::string> OllamaClient::list_models() const {
    return check_health().models;
}

std::string OllamaClient::stream_chat(
    const std::vector<nlohmann::json>& messages,
    const std::string& system_prompt,
    std::function<void(const std::string&)> token_callback
) const {
    CURL* curl = curl_easy_init();
    if (!curl) return "";

    std::string url = host;
    while (!url.empty() && url.back() == '/') url.pop_back();
    url += "/api/chat";

    nlohmann::json all_msgs = nlohmann::json::array();
    if (!system_prompt.empty()) {
        all_msgs.push_back({
            {"role", "system"},
            {"content", system_prompt}
        });
    }
    for (const auto& m : messages) {
        all_msgs.push_back(m);
    }

    nlohmann::json body = {
        {"model", model},
        {"messages", all_msgs},
        {"stream", true},
        {"options", {
            {"num_ctx", context_length},
            {"temperature", temperature},
            {"top_p", top_p},
            {"top_k", top_k},
            {"repeat_penalty", repeat_penalty}
        }}
    };

    std::string post_data = body.dump();

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    StreamState state;
    state.token_callback = std::move(token_callback);

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_data.c_str());
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 300L);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, StreamCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &state);

    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    return state.full_response;
}

} // namespace kiru
