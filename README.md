#ProseMirror spell checker plugin

Notes:
- Host the dictionaries (aff & dic) on your server for better load time
- Get other dictionaries with git clone https://chromium.googlesource.com/chromium/deps/hunspell_dictionaries
- ProseMirror height must be 100% for correct suggestion box positioning
- build with: browserify prosemirror-spellchecker --outfile prosemirror-spellchecker\src\bundle_spellcheck.js

Todo:
- remove Typo object from global namespace
- spellcheck only the words that were modified
- fix pasting multiple lines

Demo:


