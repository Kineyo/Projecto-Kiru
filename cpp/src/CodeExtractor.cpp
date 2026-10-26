#include "CodeExtractor.hpp"
#include <regex>
#include <fstream>
#include <filesystem>
#include <functional>
#include <sstream>
#include <iomanip>

namespace kiru {

nlohmann::json ExtractedCode::to_json() const {
    return {
        {"filename", filename},
        {"language", language},
        {"extension", extension},
        {"code", code},
        {"path", path}
    };
}

CodeExtractor::CodeExtractor() {
    lang_extensions["cpp"] = "cpp";
    lang_extensions["c++"] = "cpp";
    lang_extensions["cxx"] = "cpp";
    lang_extensions["c"] = "c";
    lang_extensions["h"] = "h";
    lang_extensions["hpp"] = "hpp";
    lang_extensions["rust"] = "rs";
    lang_extensions["rs"] = "rs";
    lang_extensions["python"] = "py";
    lang_extensions["py"] = "py";
    lang_extensions["javascript"] = "js";
    lang_extensions["js"] = "js";
    lang_extensions["typescript"] = "ts";
    lang_extensions["ts"] = "ts";
    lang_extensions["html"] = "html";
    lang_extensions["css"] = "css";
    lang_extensions["bash"] = "sh";
    lang_extensions["sh"] = "sh";
    lang_extensions["json"] = "json";
    lang_extensions["yaml"] = "yaml";
    lang_extensions["yml"] = "yaml";
    lang_extensions["sql"] = "sql";
    lang_extensions["go"] = "go";
    lang_extensions["text"] = "txt";
    lang_extensions["txt"] = "txt";
}

std::string CodeExtractor::get_extension(const std::string& lang) const {
    std::string lower;
    for (char c : lang) lower += std::tolower(c);
    auto it = lang_extensions.find(lower);
    if (it != lang_extensions.end()) return it->second;
    return "txt";
}

std::string CodeExtractor::extract_filename(const std::string& code, const std::string& default_ext) const {
    std::vector<std::regex> patterns = {
        std::regex(R"((?:#|//|--|/\*|<!--)\s*filename:\s*([a-zA-Z0-9_\-\./]+))", std::regex::icase),
        std::regex(R"((?:#|//|--)\s*(?:file|archivo):\s*([a-zA-Z0-9_\-\./]+))", std::regex::icase),
        std::regex(R"((?:#|//|--)\s*([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]{1,5})\b)", std::regex::icase)
    };

    std::stringstream ss(code);
    std::string line;
    int line_count = 0;
    while (std::getline(ss, line) && line_count++ < 5) {
        for (const auto& re : patterns) {
            std::smatch match;
            if (std::regex_search(line, match, re)) {
                if (match.size() > 1) {
                    std::string fn = match[1].str();
                    auto p = std::filesystem::path(fn).filename().string();
                    if (!p.empty()) return p;
                }
            }
        }
    }

    std::size_t h = std::hash<std::string>{}(code);
    std::stringstream hex_ss;
    hex_ss << "snippet_" << std::hex << (h & 0xFFFF) << "." << default_ext;
    return hex_ss.str();
}

std::vector<ExtractedCode> CodeExtractor::extract_blocks(const std::string& text) const {
    std::vector<ExtractedCode> results;
    std::regex block_re(R"(```([a-zA-Z0-9_#\+\.\-]*)\r?\n([\s\S]*?)\r?\n```)");
    auto words_begin = std::sregex_iterator(text.begin(), text.end(), block_re);
    auto words_end = std::sregex_iterator();

    for (std::sregex_iterator i = words_begin; i != words_end; ++i) {
        std::smatch match = *i;
        std::string raw_lang = match[1].str();
        std::string code = match[2].str();

        if (code.find_first_not_of(" \t\n\r") == std::string::npos) continue;

        std::string ext = get_extension(raw_lang);
        std::string filename = extract_filename(code, ext);

        ExtractedCode item;
        item.filename = filename;
        item.language = raw_lang.empty() ? ext : raw_lang;
        item.extension = ext;
        item.code = code;
        results.push_back(item);
    }

    return results;
}

bool CodeExtractor::save_all(std::vector<ExtractedCode>& blocks, const std::string& output_dir) const {
    try {
        std::filesystem::create_directories(output_dir);
        for (auto& block : blocks) {
            auto p = std::filesystem::path(output_dir) / block.filename;
            std::ofstream out(p);
            out << block.code;
            block.path = std::filesystem::absolute(p).string();
        }
        return true;
    } catch (...) {
        return false;
    }
}

} // namespace kiru
