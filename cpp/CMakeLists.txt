cmake_minimum_required(VERSION 3.20)
project(kiru-cpp VERSION 2.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(CURL REQUIRED)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CURL_INCLUDE_DIRS}
)

set(SOURCES
    src/main.cpp
    src/Config.cpp
    src/SystemPrompt.cpp
    src/CodeExtractor.cpp
    src/FileManager.cpp
    src/RagEngine.cpp
    src/Sandbox.cpp
    src/PentestAuditor.cpp
    src/OllamaClient.cpp
)

add_executable(kiru-cpp ${SOURCES})

target_link_libraries(kiru-cpp PRIVATE ${CURL_LIBRARIES})
