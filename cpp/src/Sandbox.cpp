#include "Sandbox.hpp"
#include <chrono>
#include <filesystem>
#include <array>
#include <regex>
#include <cstdio>
#include <sys/wait.h>
#include <unistd.h>

namespace kiru {

nlohmann::json SafetyVerdict::to_json() const {
    return {
        {"allowed", allowed},
        {"requires_sudo", requires_sudo},
        {"risk_level", risk_level},
        {"reason", reason},
        {"sudo_warning", sudo_warning.empty() ? nullptr : nlohmann::json(sudo_warning)}
    };
}

nlohmann::json SandboxResult::to_json() const {
    return {
        {"success", success},
        {"blocked", blocked},
        {"requires_sudo", requires_sudo},
        {"exit_code", exit_code},
        {"stdout", stdout_str},
        {"stderr", stderr_str},
        {"execution_time_ms", execution_time_ms},
        {"safety", safety.to_json()}
    };
}

SafetyVerdict SandboxExecutor::validate_command(const std::string& command, bool allow_sudo) const {
    SafetyVerdict verdict;

    std::vector<std::pair<std::string, std::string>> forbidden = {
        {R"(\brm\b[^\n;&|]*(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive)[^\n;&|]*\s+(/|/\*|/boot|/etc|/usr|/var|/bin|/sbin|/lib|/dev|/proc|/sys|/root|/home)(\s|$|;|&|\|))",
         "PROHIBIDO: Intento de eliminar directorios críticos del sistema operativo."},
        {R"(--no-preserve-root)", "PROHIBIDO: El flag --no-preserve-root está bloqueado."},
        {R"(\b(mkfs|wipefs|fdisk|parted|sfdisk|cfdisk)\b)", "PROHIBIDO: Comandos de formateo o particionado de disco bloqueados."},
        {R"(\bdd\b[^\n;&|]*of=/dev/)", "PROHIBIDO: Escritura directa sobre dispositivos de bloque."},
        {R"(:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:)", "PROHIBIDO: Fork Bomb detectada."},
        {R"(\b(shutdown|reboot|poweroff|halt|init\s+[06])\b)", "PROHIBIDO: Comandos de apagado o reinicio del sistema."},
        {R"(\b(chmod|chown)\b[^\n;&|]*-R[^\n;&|]*\s+(/|/\*|/etc|/usr|/bin)(\s|$))", "PROHIBIDO: Alteración masiva de permisos en raíz."}
    };

    for (const auto& [pat, msg] : forbidden) {
        std::regex re(pat, std::regex::icase);
        if (std::regex_search(command, re)) {
            verdict.allowed = false;
            verdict.risk_level = "blocked";
            verdict.reason = msg;
            return verdict;
        }
    }

    std::regex sudo_re(R"((^|[;&|\s])(sudo|su\s+-|pkexec|doas)(\s|$))", std::regex::icase);
    verdict.requires_sudo = std::regex_search(command, sudo_re);

    if (verdict.requires_sudo && !allow_sudo) {
        verdict.allowed = false;
        verdict.risk_level = "sudo_required";
        verdict.reason = "El comando requiere privilegios de superusuario (sudo), pero Sudo Controlado está desactivado.";
        verdict.sudo_warning = SUDO_WARNING_TEXT;
        return verdict;
    }

    verdict.allowed = true;
    verdict.risk_level = verdict.requires_sudo ? "sudo_elevated" : "safe";
    verdict.reason = verdict.requires_sudo
        ? "Comando validado con superusuario controlado."
        : "Comando validado por el Firewall del Sandbox.";
    if (verdict.requires_sudo) {
        verdict.sudo_warning = SUDO_WARNING_TEXT;
    }
    return verdict;
}

SandboxResult SandboxExecutor::execute(const std::string& command, const std::string& working_dir, bool allow_sudo) const {
    SandboxResult res;
    auto start = std::chrono::steady_clock::now();

    res.safety = validate_command(command, allow_sudo);
    res.requires_sudo = res.safety.requires_sudo;

    if (!res.safety.allowed) {
        res.success = false;
        res.blocked = true;
        res.exit_code = 126;
        res.stderr_str = "🛑 [SANDBOX FIREWALL BLOCK] " + res.safety.reason;
        if (!res.safety.sudo_warning.empty()) {
            res.stderr_str += "\n⚠️ ADVERTENCIA: " + res.safety.sudo_warning;
        }
        return res;
    }

    try {
        std::filesystem::create_directories(working_dir);
    } catch (...) {}

    std::string full_cmd = "cd \"" + working_dir + "\" && KIRU_SANDBOX=1 " + command + " 2>&1";

    std::array<char, 256> buffer;
    std::string result;
    FILE* pipe = popen(full_cmd.c_str(), "r");
    if (!pipe) {
        res.success = false;
        res.stderr_str = "Error al abrir pipe de ejecución";
        return res;
    }

    while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
        result += buffer.data();
    }

    int status = pclose(pipe);
    auto end = std::chrono::steady_clock::now();

    res.execution_time_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
    res.exit_code = WEXITSTATUS(status);
    res.success = (res.exit_code == 0);
    res.stdout_str = result;

    return res;
}

} // namespace kiru
