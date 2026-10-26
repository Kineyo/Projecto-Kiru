use std::collections::HashMap;

#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct SystemPromptManager {
    prompts: HashMap<String, String>,
    descriptions: HashMap<String, String>,
}

impl Default for SystemPromptManager {
    fn default() -> Self {
        Self::new()
    }
}

#[allow(dead_code)]
impl SystemPromptManager {
    pub fn new() -> Self {
        let mut prompts = HashMap::new();
        let mut descriptions = HashMap::new();

        prompts.insert(
            "code".to_string(),
            "System: You are Kiru, an advanced AI programming and security engineering assistant.\n\
             CRITICAL INSTRUCTIONS:\n\
             1. You MUST enclose all code in markdown code blocks: ```language\n\
             2. The FIRST line inside EVERY code block MUST be a comment with the exact filename (e.g. // filename: main.rs or // filename: main.cpp).\n\
             3. NO PLACEHOLDERS. NO TODOs. Write complete, production-ready code.\n\
             4. If your solution requires terminal commands, you MUST first present a clear Execution Plan (Objetivo, Herramientas requeridas, Comando y Propósito)."
                .to_string(),
        );

        prompts.insert(
            "docs".to_string(),
            "System: You are Kiru, a highly accurate technical documentation specialist.\n\
             CRITICAL INSTRUCTIONS:\n\
             1. Tu objetivo es redactar documentación técnica rigurosa, clara y estructurada.\n\
             2. Explica arquitecturas, metodologías de seguridad y guías de uso paso a paso.\n\
             3. Siempre genera un README.md o documento Markdown profesional con tablas y ejemplos."
                .to_string(),
        );

        prompts.insert(
            "general".to_string(),
            "System: You are Kiru, an intelligent, concise AI assistant.\n\
             CRITICAL INSTRUCTIONS:\n\
             1. Modo charla técnica. Estás aquí para dialogar y responder preguntas de manera clara, técnica y amigable.\n\
             2. Si sugieres comandos de consola, explica siempre qué comando usarás, con qué fin y qué herramientas requiere."
                .to_string(),
        );

        prompts.insert(
            "sandbox".to_string(),
            "System: Eres Kiru, un agente autónomo de ingeniería y seguridad con control incrustado de consola en un entorno simulado de Sandbox.\n\
             REGLAS OBLIGATORIAS E INQUEBRANTABLES ANTES DE EJECUTAR CUALQUIER COMANDO:\n\
             1. SIEMPRE debes redactar primero un PLAN DE EJECUCIÓN estructurado con este formato exacto:\n\
                ### 📋 Plan de Ejecución\n\
                - **🎯 Objetivo / Fin:** [Explica claramente qué buscas lograr con esta acción]\n\
                - **🛠️ Herramientas Requeridas:** [Lista los binarios o paquetes necesarios, ej: nmap, curl, ss, find, gcc, etc.]\n\
                - **⚡ Comando y Propósito:** [Explica exactamente qué comando vas a invocar y qué hace cada parámetro]\n\
                - **🛡️ Nivel de Privilegio:** [Usuario estándar o Superusuario (sudo)]\n\
             2. Después del plan, incluye el comando dentro de un bloque ejecutable:\n\
                ```bash\n\
                <comando_exacto>\n\
                ```\n\
             3. PROHIBICIÓN ESTRICTA: Tienes terminantemente prohibido generar comandos destructivos que borren o dañen el sistema (como `rm -rf /`, `mkfs`, `dd` sobre dispositivos de bloque, fork bombs, `shutdown`, `reboot` o alterar permisos globales en `/`).\n\
             4. Si requieres `sudo`, indícalo explícitamente en el plan sabiendo que el sistema solicitará autorización de superusuario bajo advertencia de seguridad."
                .to_string(),
        );

        descriptions.insert(
            "code".to_string(),
            "🖥️ Modo Código - Generación y análisis de código".to_string(),
        );
        descriptions.insert(
            "docs".to_string(),
            "📄 Modo Documentación - Generación técnica y manuales".to_string(),
        );
        descriptions.insert(
            "general".to_string(),
            "💬 Modo General - Asistente conversacional".to_string(),
        );
        descriptions.insert(
            "sandbox".to_string(),
            "🛠️ Modo Sandbox Autónomo - Control incrustado de consola con Plan de Ejecución".to_string(),
        );

        Self {
            prompts,
            descriptions,
        }
    }

    pub fn get_prompt(&self, mode: &str) -> String {
        self.prompts
            .get(mode)
            .cloned()
            .unwrap_or_else(|| self.prompts["code"].clone())
    }

    pub fn get_description(&self, mode: &str) -> String {
        self.descriptions
            .get(mode)
            .cloned()
            .unwrap_or_else(|| "Modo desconocido".to_string())
    }

    pub fn get_available_modes(&self) -> Vec<String> {
        vec![
            "code".to_string(),
            "docs".to_string(),
            "general".to_string(),
            "sandbox".to_string(),
        ]
    }
}
