#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

namespace kiru {

inline const char* SUDO_WARNING_TEXT =
    "Darle comandos de superusuario puede resultar en la perdida de archivos importantes, daños, y uso de comandos peligrosos. Solo debe usarse en entorno controlados y comprendiendo por completo los riesgos que puede significar";

struct SafetyVerdict {
    bool allowed = false;
    bool requires_sudo = false;
    std::string risk_level = "safe";
    std::string reason;
    std::string sudo_warning;

    nlohmann::json to_json() const;
};

struct SandboxResult {
    bool success = false;
    bool blocked = false;
    bool requires_sudo = false;
    int exit_code = -1;
    std::string stdout_str;
    std::string stderr_str;
    int64_t execution_time_ms = 0;
    SafetyVerdict safety;

    nlohmann::json to_json() const;
};

class SandboxExecutor {
public:
    SafetyVerdict validate_command(const std::string& command, bool allow_sudo = false) const;
    SandboxResult execute(const std::string& command, const std::string& working_dir, bool allow_sudo = false) const;
};

} // namespace kiru
