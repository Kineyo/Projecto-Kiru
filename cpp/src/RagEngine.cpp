#include "RagEngine.hpp"
#include <filesystem>
#include <fstream>
#include <sstream>
#include <algorithm>

namespace kiru {

RagEngine::RagEngine(const std::string& docs_dir) : docs_dir(docs_dir) {
    index_markdown();
}

std::unordered_set<std::string> RagEngine::tokenize(const std::string& text) {
    std::unordered_set<std::string> tokens;
    std::string cur;
    for (char c : text) {
        if (std::isalnum(static_cast<unsigned char>(c)) || c == '_' || c == '-') {
            cur += std::tolower(static_cast<unsigned char>(c));
        } else {
            if (cur.length() >= 3) {
                tokens.insert(cur);
            }
            cur.clear();
        }
    }
    if (cur.length() >= 3) tokens.insert(cur);
    return tokens;
}

size_t RagEngine::index_markdown() {
    chunks.clear();
    if (!std::filesystem::exists(docs_dir)) return 0;

    for (const auto& entry : std::filesystem::recursive_directory_iterator(docs_dir)) {
        if (entry.is_regular_file() && entry.path().extension() == ".md") {
            std::ifstream in(entry.path());
            if (!in.is_open()) continue;

            std::string word;
            std::vector<std::string> words;
            while (in >> word) words.push_back(word);

            const size_t chunk_size = 350;
            const size_t overlap = 50;
            size_t i = 0;
            size_t chunk_id = 0;
            std::string source = entry.path().filename().string();

            while (i < words.size()) {
                size_t end = std::min(i + chunk_size, words.size());
                std::stringstream chunk_ss;
                for (size_t k = i; k < end; ++k) {
                    chunk_ss << words[k] << (k + 1 < end ? " " : "");
                }
                std::string chunk_text = chunk_ss.str();

                RagChunk rc;
                rc.source = source;
                rc.chunk_id = chunk_id++;
                rc.content = chunk_text;
                rc.terms = tokenize(chunk_text);
                chunks.push_back(rc);

                if (end == words.size()) break;
                i += (chunk_size > overlap) ? (chunk_size - overlap) : 1;
            }
        }
    }

    return chunks.size();
}

std::string RagEngine::query(const std::string& query_text, size_t top_k) const {
    if (chunks.empty()) return "";
    auto query_terms = tokenize(query_text);
    if (query_terms.empty()) return "";

    std::vector<std::pair<float, const RagChunk*>> scored;

    for (const auto& ch : chunks) {
        float score = 0.0f;
        for (const auto& qt : query_terms) {
            if (ch.terms.find(qt) != ch.terms.end()) {
                score += 1.0f;
                std::string lower_source = ch.source;
                std::transform(lower_source.begin(), lower_source.end(), lower_source.begin(), ::tolower);
                if (lower_source.find(qt) != std::string::npos) {
                    score += 2.5f;
                }
            }
        }
        if (score > 0.0f) {
            scored.push_back({score, &ch});
        }
    }

    if (scored.empty()) return "";

    std::sort(scored.begin(), scored.end(), [](const auto& a, const auto& b) {
        return a.first > b.first;
    });

    std::stringstream result;
    size_t count = std::min(top_k, scored.size());
    for (size_t i = 0; i < count; ++i) {
        result << "--- [Fuente: " << scored[i].second->source
               << " (Chunk #" << scored[i].second->chunk_id
               << ", Relevancia: " << scored[i].first << ")] ---\n"
               << scored[i].second->content << "\n\n";
    }

    return result.str();
}

} // namespace kiru
