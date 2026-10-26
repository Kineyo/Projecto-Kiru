#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>

namespace kiru {

struct OutputFileInfo {
    std::string name;
    std::string path;
    uint64_t size = 0;
    std::string size_human;
    std::string modified;
    std::string extension;

    nlohmann::json to_json() const;
};

struct OutputStats {
    size_t total_files = 0;
    uint64_t total_size = 0;
    std::string total_size_human;
    std::unordered_map<std::string, size_t> languages;

    nlohmann::json to_json() const;
};

class FileManager {
public:
    static std::string human_size(uint64_t bytes);
    static bool ensure_directory(const std::string& path);
    std::vector<OutputFileInfo> list_output_files(const std::string& output_dir) const;
    std::string get_file_content(const std::string& filepath) const;
    bool delete_file(const std::string& filepath) const;
    OutputStats get_output_stats(const std::string& output_dir) const;
};

} // namespace kiru
