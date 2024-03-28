#!/usr/bin/bash
wget https://github.com/jprjr/gsf2wav/archive/refs/heads/main.zip
unzip main.zip
rm main.zip
mv gsf2wav-main gsf2wav
wget https://github.com/jprjr/lazygsf/archive/refs/heads/main.zip -O gsf2wav/main.zip
unzip gsf2wav/main.zip -d gsf2wav/
rm gsf2wav/main.zip
mv -f -T gsf2wav/lazygsf-main gsf2wav/lazygsf
wget https://bitbucket.org/losnoco/psflib/get/3bea757c8b45.zip -O gsf2wav/psflib.zip
unzip gsf2wav/psflib.zip -d gsf2wav/
rm gsf2wav/psflib.zip
mv -f -T gsf2wav/losnoco-psflib-3bea757c8b45 gsf2wav/psflib
wget https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.3.zip -O gsf2wav/lazygsf/mgba.zip
unzip gsf2wav/lazygsf/mgba.zip -d gsf2wav/lazygsf/
rm gsf2wav/lazygsf/mgba.zip
mv -f -T gsf2wav/lazygsf/mgba-0.10.3 gsf2wav/lazygsf/mgba
cp CMakeLists-modifications/CMakeLists.txt gsf2wav/CMakeLists.txt
cp CMakeLists-modifications/lazygsf/CMakeLists.txt gsf2wav/lazygsf/CMakeLists.txt
cp CMakeLists-modifications/lazygsf/mgba/CMakeLists.txt gsf2wav/lazygsf/mgba/CMakeLists.txt