#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>

namespace kiru {

struct ExtractedCode {
    std::string filename;
    std::string language;
    std::string extension;
    std::string code;
    std::string path;

    nlohmann::json to_json() const;
};

class CodeExtractor {
public:
    CodeExtractor();
    std::string get_extension(const std::string& lang) const;
    std::string extract_filename(const std::string& code, const std::string& default_ext) const;
    std::vector<ExtractedCode> extract_blocks(const std::string& text) const;
    bool save_all(std::vector<ExtractedCode>& blocks, const std::string& output_dir) const;

private:
    std::unordered_map<std::string, std::string> lang_extensions;
};

} // namespace kiru
