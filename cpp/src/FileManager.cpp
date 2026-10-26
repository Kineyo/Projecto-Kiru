#include "FileManager.hpp"
#include <filesystem>
#include <fstream>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace kiru {

nlohmann::json OutputFileInfo::to_json() const {
    return {
        {"name", name},
        {"path", path},
        {"size", size},
        {"size_human", size_human},
        {"modified", modified},
        {"extension", extension}
    };
}

nlohmann::json OutputStats::to_json() const {
    return {
        {"total_files", total_files},
        {"total_size", total_size},
        {"total_size_human", total_size_human},
        {"languages", languages}
    };
}

std::string FileManager::human_size(uint64_t bytes) {
    double b = static_cast<double>(bytes);
    std::stringstream ss;
    ss << std::fixed << std::setprecision(1);

    if (b < 1024.0) {
        return std::to_string(bytes) + " B";
    } else if (b < 1024.0 * 1024.0) {
        ss << (b / 1024.0) << " KB";
        return ss.str();
    } else if (b < 1024.0 * 1024.0 * 1024.0) {
        ss << (b / (1024.0 * 1024.0)) << " MB";
        return ss.str();
    } else {
        ss << (b / (1024.0 * 1024.0 * 1024.0)) << " GB";
        return ss.str();
    }
}

bool FileManager::ensure_directory(const std::string& path) {
    try {
        return std::filesystem::create_directories(path);
    } catch (...) {
        return false;
    }
}

std::vector<OutputFileInfo> FileManager::list_output_files(const std::string& output_dir) const {
    std::vector<OutputFileInfo> files;
    if (!std::filesystem::exists(output_dir)) return files;

    try {
        for (const auto& entry : std::filesystem::directory_iterator(output_dir)) {
            if (entry.is_regular_file()) {
                OutputFileInfo info;
                info.name = entry.path().filename().string();
                info.path = std::filesystem::absolute(entry.path()).string();
                info.size = entry.file_size();
                info.size_human = human_size(info.size);

                std::string ext = entry.path().extension().string();
                if (!ext.empty() && ext[0] == '.') ext = ext.substr(1);
                info.extension = ext;

                auto ftime = entry.last_write_time();
                auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(
                    ftime - std::filesystem::file_time_type::clock::now() + std::chrono::system_clock::now()
                );
                std::time_t cftime = std::chrono::system_clock::to_time_t(sctp);
                std::stringstream time_ss;
                time_ss << std::put_time(std::localtime(&cftime), "%Y-%m-%d %H:%M:%S");
                info.modified = time_ss.str();

                files.push_back(info);
            }
        }
    } catch (...) {}

    std::sort(files.begin(), files.end(), [](const OutputFileInfo& a, const OutputFileInfo& b) {
        return a.modified > b.modified;
    });

    return files;
}

std::string FileManager::get_file_content(const std::string& filepath) const {
    std::ifstream in(filepath);
    if (!in.is_open()) return "";
    std::stringstream buffer;
    buffer << in.rdbuf();
    return buffer.str();
}

bool FileManager::delete_file(const std::string& filepath) const {
    try {
        return std::filesystem::remove(filepath);
    } catch (...) {
        return false;
    }
}

OutputStats FileManager::get_output_stats(const std::string& output_dir) const {
    auto files = list_output_files(output_dir);
    OutputStats stats;
    stats.total_files = files.size();
    stats.total_size = 0;

    for (const auto& f : files) {
        stats.total_size += f.size;
        std::string ext = f.extension.empty() ? "other" : f.extension;
        stats.languages[ext]++;
    }
    stats.total_size_human = human_size(stats.total_size);
    return stats;
}

} // namespace kiru
