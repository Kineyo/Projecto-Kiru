#include <iostream>
#include <string>
#include <vector>
#include "Config.hpp"
#include "SystemPrompt.hpp"
#include "CodeExtractor.hpp"
#include "FileManager.hpp"
#include "RagEngine.hpp"
#include "Sandbox.hpp"
#include "PentestAuditor.hpp"
#include "OllamaClient.hpp"

using namespace kiru;

int main(int argc, char* argv[]) {
    Config config = Config::load_default();

    if (argc > 1) {
        std::string cmd = argv[1];
        if (cmd == "audit" || cmd == "--audit") {
            std::cout << "🛡️  [Kiru C++] Ejecutando Auditoría Nativa de Seguridad...\n";
            auto report = PentestAuditor::full_audit();
            std::cout << report.to_json().dump(2) << std::endl;
            return 0;
        } else if (cmd == "health" || cmd == "--health") {
            OllamaClient ollama(config.ollama_host, config.ollama_model);
            auto h = ollama.check_health();
            std::cout << h.to_json().dump(2) << std::endl;
            return 0;
        } else if (cmd == "files" || cmd == "--files") {
            FileManager fm;
            auto files = fm.list_output_files(config.output_dir);
            nlohmann::json arr = nlohmann::json::array();
            for (const auto& f : files) arr.push_back(f.to_json());
            std::cout << arr.dump(2) << std::endl;
            return 0;
        } else if (cmd == "sandbox" && argc > 2) {
            SandboxExecutor sb;
            auto res = sb.execute(argv[2], config.sandbox_dir);
            std::cout << res.to_json().dump(2) << std::endl;
            return 0;
        }
    }

    std::cout << "============================================================\n";
    std::cout << "✨ Kiru AI - Native C++ Edition v2.0\n";
    std::cout << "   Asistente IA de Seguridad Ofensiva y Generación de Código\n";
    std::cout << "============================================================\n";
    std::cout << "   🔧 Ollama Host:      " << config.ollama_host << "\n";
    std::cout << "   🧠 Modelo Activo:    " << config.ollama_model << "\n";
    std::cout << "   📁 Carpeta Output:   " << config.output_dir << "\n";
    std::cout << "   📦 Carpeta Sandbox:  " << config.sandbox_dir << "\n";
    std::cout << "   📚 Base RAG:         " << config.rag_docs_dir << "\n";
    std::cout << "============================================================\n";

    std::cout << "⏳ Indexando documentos RAG...\n";
    RagEngine rag(config.rag_docs_dir);
    std::cout << "✅ RAG indexado: " << rag.total_chunks() << " fragmentos cargados en memoria.\n";

    OllamaClient ollama(
        config.ollama_host,
        config.ollama_model,
        config.context_length,
        config.temperature,
        config.top_p,
        config.top_k,
        config.repeat_penalty
    );

    auto health = ollama.check_health();
    if (health.ok) {
        std::cout << "✅ Conexión con Ollama establecida (" << health.models.size() << " modelos disponibles).\n";
    } else {
        std::cout << "⚠️  " << health.message << "\n";
    }

    SystemPromptManager prompt_mgr;
    CodeExtractor extractor;
    FileManager file_mgr;
    SandboxExecutor sandbox;

    std::vector<nlohmann::json> history;
    std::string current_mode = "code";

    std::cout << "\n💡 Escribe tu consulta (o ':exit', ':audit', ':mode <code|docs|general|sandbox>', ':files'):\n\n";

    std::string input;
    while (true) {
        std::cout << "\nkiru [" << current_mode << "]> ";
        if (!std::getline(std::cin, input)) break;
        if (input.empty()) continue;

        if (input == ":exit" || input == "exit" || input == "quit") {
            std::cout << "Saliendo de Kiru.\n";
            break;
        } else if (input == ":audit") {
            auto report = PentestAuditor::full_audit();
            std::cout << report.to_json().dump(2) << std::endl;
            continue;
        } else if (input == ":files") {
            auto files = file_mgr.list_output_files(config.output_dir);
            std::cout << "\nArchivos en " << config.output_dir << ": (" << files.size() << ")\n";
            for (const auto& f : files) {
                std::cout << "  - " << f.name << " (" << f.size_human << ") [" << f.modified << "]\n";
            }
            continue;
        } else if (input.rfind(":mode ", 0) == 0) {
            current_mode = input.substr(6);
            std::cout << "Modo cambiado a: " << current_mode << "\n";
            continue;
        }

        // RAG Query
        std::string rag_context = rag.query(input, 3);
        std::string enriched_input = input;
        std::string sys_prompt;

        if (!rag_context.empty()) {
            std::cout << "\n📚 [RAG] Fragmentos de seguridad encontrados e inyectados.\n";
            enriched_input = "CONTEXTO DE AUDITORÍA Y PENTEST:\n" + rag_context +
                             "\n\nCONSULTA TÉCNICA: " + input + "\n\nRESPUESTA:";
            sys_prompt = "Eres Kiru, analista técnico de seguridad ofensiva. Responde con sintaxis exacta y bloques de código listos para producción.";
        } else {
            sys_prompt = prompt_mgr.get_prompt(current_mode);
        }

        history.push_back({{"role", "user"}, {"content", enriched_input}});
        if (history.size() > 20) {
            history.erase(history.begin(), history.begin() + (history.size() - 20));
        }

        std::cout << "\n✨ Kiru:\n";
        std::string full_response = ollama.stream_chat(history, sys_prompt, [](const std::string& token) {
            std::cout << token << std::flush;
        });
        std::cout << "\n";

        history.push_back({{"role", "assistant"}, {"content", full_response}});

        // Extract code
        auto blocks = extractor.extract_blocks(full_response);
        if (!blocks.empty()) {
            extractor.save_all(blocks, config.output_dir);
            std::cout << "\n💾 " << blocks.size() << " archivo(s) extraído(s) y guardado(s) en " << config.output_dir << ":\n";
            for (const auto& b : blocks) {
                std::cout << "   -> " << b.filename << " (" << b.language << ")\n";
            }
        }
    }

    return 0;
}
