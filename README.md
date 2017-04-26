#ProseMirror spell checker plugin

Notes:
- Host the dictionaries (aff & dic) on your server for better load time
- Get other dictionaries with git clone https://chromium.googlesource.com/chromium/deps/hunspell_dictionaries
- build with: browserify prosemirror-spellchecker --outfile prosemirror-spellchecker\src\bundle_spellcheck.js

Todo:
- remove Typo object from global namespace
- fix pasting multiple lines

Demo:
https://plnkr.co/edit/Mo7nNAucTRROs0rM4npu

