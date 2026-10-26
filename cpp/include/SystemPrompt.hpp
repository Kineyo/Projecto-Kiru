#pragma once

#include <string>
#include <unordered_map>
#include <vector>

namespace kiru {

class SystemPromptManager {
public:
    SystemPromptManager();
    std::string get_prompt(const std::string& mode) const;
    std::string get_description(const std::string& mode) const;
    std::vector<std::string> get_available_modes() const;

private:
    std::unordered_map<std::string, std::string> prompts;
    std::unordered_map<std::string, std::string> descriptions;
};

} // namespace kiru
