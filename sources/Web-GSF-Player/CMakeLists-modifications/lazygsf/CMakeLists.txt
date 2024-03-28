cmake_minimum_required(VERSION 3.1)
cmake_policy(SET CMP0063 NEW)

project(lazygsf)

set(LAZYGSF_VERSION_MAJOR 0)
set(LAZYGSF_VERSION_MINOR 0)
set(LAZYGSF_VERSION_PATCH 0)
set(LAZYGSF_VERSION_STRING ${LAZYGSF_VERSION_MAJOR}.${LAZYGSF_VERSION_MINOR}.${LAZYGSF_VERSION_PATCH})

include(CheckFunctionExists)
include(GNUInstallDirs)

set(OS_LIB)

check_function_exists(snprintf_l HAVE_SNPRINTF_L)
check_function_exists(newlocale HAVE_NEWLOCALE)
check_function_exists(freelocale HAVE_FREELOCALE)
check_function_exists(uselocale HAVE_USELOCALE)
check_function_exists(setlocale HAVE_SETLOCALE)
if(HAVE_NEWLOCALE AND HAVE_FREELOCALE AND HAVE_USELOCALE OR APPLE)
	list(APPEND FUNCTION_DEFINES HAVE_LOCALE)
	if (HAVE_SNPRINTF_L)
		list(APPEND FUNCTION_DEFINES HAVE_SNPRINTF_L)
	endif()
endif()

if(EMSCRIPTEN)
	set(CMAKE_OBJCOPY "${EMSCRIPTEN_ROOT_PATH}/../bin/llvm-objcopy") # I don't know why this is not set in Emscripten.cmake
endif()

# set(LIBMGBA_ONLY ON)
set(LIBMGBA_ONLY ON CACHE BOOL "LIBMGBA_ONLY" FORCE)
set(DISABLE_THREADS ON CACHE BOOL "DISABLE_THREADS" FORCE)
set(MINIMAL_CORE "2" CACHE STRING "MINIMAL_CORE=2" FORCE)
set(M_CORE_GB OFF CACHE BOOL "M_CORE_GB=OFF" FORCE) # GBA should still have GB PSG

# TO DO: if these flags alone don't work, manually exclude sources.
add_subdirectory(mgba)

set(LAZYGSF_SOURCES src/lazygsf.c)

if(WIN32)
    list(APPEND OS_LIB ws2_32 shlwapi)
elseif(UNIX)
    list(APPEND OS_LIB m)
    #if(CMAKE_SYSTEM_NAME STREQUAL "Linux")
    #    add_definitions(-D_GNU_SOURCE)
    #endif()
endif()


add_library(lazygsf ${LAZYGSF_SOURCES})
target_link_libraries(lazygsf PUBLIC ${OS_LIB} mgba)
target_include_directories(lazygsf PRIVATE mgba/include mgba/src)
target_include_directories(lazygsf PUBLIC
  $<INSTALL_INTERFACE:src>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/src>
)
set_target_properties(lazygsf PROPERTIES COMPILE_DEFINITIONS "${FUNCTION_DEFINES};DISABLE_THREADING;M_CORE_GBA;MINIMAL_CORE=2;BUILD_STATIC;${BUILD_DEF}")
set_target_properties(lazygsf PROPERTIES CXX_VISIBILITY_PRESET hidden)
set_target_properties(lazygsf PROPERTIES C_VISIBILITY_PRESET hidden)
set_target_properties(lazygsf PROPERTIES VISIBILITY_INLINES_HIDDEN ON)
set_target_properties(lazygsf PROPERTIES POSITION_INDEPENDENT_CODE ON)
set_target_properties(lazygsf PROPERTIES VERSION ${LAZYGSF_VERSION_STRING} SOVERSION ${LAZYGSF_VERSION_MAJOR}.${LAZYGSF_VERSION_MINOR})

if(MSVC)
    target_compile_options(lazygsf PRIVATE /W3)
else()
    target_compile_options(lazygsf PRIVATE -Wall -Wextra)
endif()

if(NOT BUILD_SHARED_LIBS)
    if(NOT MSVC)
        string(REPLACE " " ";" ORIGINAL_C_FLAGS "${CMAKE_C_FLAGS}")
        add_custom_command(
          TARGET lazygsf
          POST_BUILD
          COMMAND
          ${CMAKE_C_COMPILER} ${ORIGINAL_C_FLAGS} -fPIC
          -nostartfiles -nodefaultlibs -r
          -Wl,--whole-archive $<TARGET_FILE:lazygsf> -Wl,--no-whole-archive
          -o $<TARGET_FILE:lazygsf>.o &&
          ${CMAKE_OBJCOPY} --localize-hidden $<TARGET_FILE:lazygsf>.o &&
          rm -f $<TARGET_FILE:lazygsf> &&
          ${CMAKE_AR} cr $<TARGET_FILE:lazygsf> $<TARGET_FILE:lazygsf>.o &&
          ${CMAKE_RANLIB} $<TARGET_FILE:lazygsf>
          VERBATIM
        )
    endif() # TODO find a way to do this with MSVC tools
endif()

configure_file(${CMAKE_CURRENT_SOURCE_DIR}/lazygsf.pc.in ${CMAKE_BINARY_DIR}/lazygsf.pc @ONLY)
