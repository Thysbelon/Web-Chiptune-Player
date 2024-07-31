cmake_minimum_required(VERSION 3.0)
project(libkss)

# add_compile_definitions(EXCLUDE_DRIVER_ALL)

if(MSVC)
  set(CMAKE_C_FLAGS "/Ox /W3 /wd4996")
else()
  if(USE_ASAN)
		set(CMAKE_C_FLAGS "-O0 -Wall -fsanitize=address")
		if(EMSCRIPTEN)
			add_link_options(-sALLOW_MEMORY_GROWTH=1)
		endif()
	elseif(USE_SAFE_HEAP)
		set(CMAKE_C_FLAGS "-O0 -Wall")
	else()
		set(CMAKE_C_FLAGS "-O3 -Wall")
  endif()
endif()

if(NOT TARGET emu2149) 
	add_subdirectory(modules/emu2149) 
endif()

if(NOT TARGET emu2212)
	add_subdirectory(modules/emu2212)
endif()

if(NOT TARGET emu2413)
	add_subdirectory(modules/emu2413)
endif()

if(NOT TARGET emu8950)
	add_subdirectory(modules/emu8950)
endif()

if(NOT TARGET emu76489)
	add_subdirectory(modules/emu76489)
endif()

if(NOT TARGET kmz80)
	add_subdirectory(modules/kmz80)
endif()

file(GLOB SOURCES src/*.c src/**/*.c)

include_directories(modules)

add_library(kss STATIC ${SOURCES})
target_link_libraries(kss emu2149 emu2212 emu2413 emu8950 emu76489 kmz80)

if(EMSCRIPTEN)
	add_link_options(-sEXPORTED_RUNTIME_METHODS=FS -sMODULARIZE -s EXPORT_NAME=WebKSSplayer -sSTACK_SIZE=131072)
	# -sSTACK_SIZE=131072
	# -sALLOW_MEMORY_GROWTH=1
	if(USE_SAFE_HEAP) # -DUSE_SAFE_HEAP=1
		add_link_options(-sSAFE_HEAP)
	endif()
endif()

add_executable(kss2wav EXCLUDE_FROM_ALL example/kss2wav.c)
if(NOT CMAKE_COMPILER_IS_GNUCC)
	target_link_libraries(kss2wav kss)
else()
	target_link_libraries(kss2wav kss m)
endif()

