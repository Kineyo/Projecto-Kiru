#pragma once

#include <string>
#include <vector>
#include <unordered_set>

namespace kiru {

struct RagChunk {
    std::string source;
    size_t chunk_id = 0;
    std::string content;
    std::unordered_set<std::string> terms;
};

class RagEngine {
public:
    explicit RagEngine(const std::string& docs_dir);
    size_t index_markdown();
    std::string query(const std::string& query_text, size_t top_k = 3) const;
    size_t total_chunks() const { return chunks.size(); }

private:
    std::string docs_dir;
    std::vector<RagChunk> chunks;
    static std::unordered_set<std::string> tokenize(const std::string& text);
};

} // namespace kiru
