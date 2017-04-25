const {EditorState} = require("prosemirror-state")
const {EditorView} = require("prosemirror-view")
const {DOMParser} = require("prosemirror-model")
const {schema} = require("prosemirror-schema-basic")
const {exampleSetup} = require("prosemirror-example-setup")
const { spellcheckPlugin } = require("./spellchecker")

const aff = 'https://rawgit.com/kofifus/Typo.js/master/typo/dictionaries/en_US/en_US.aff';
const dic = 'https://rawgit.com/kofifus/Typo.js/master/typo/dictionaries/en_US/en_US.dic';
loadTypo('en_US', aff, dic).then(typo => window.typo=typo);

window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(""),
    plugins: exampleSetup({schema}).concat([spellcheckPlugin()])
  })
})