cmake_minimum_required(VERSION 3.16)
project(risk_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

add_compile_options(-O3)

add_library(risk_engine STATIC
  src/risk_engine.cpp
)

target_include_directories(risk_engine PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_executable(risk_engine_demo
  src/demo_main.cpp
)

target_link_libraries(risk_engine_demo PRIVATE risk_engine)

add_executable(risk_engine_bench
  src/bench_main.cpp
)

target_link_libraries(risk_engine_bench PRIVATE risk_engine)