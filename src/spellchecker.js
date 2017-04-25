const { Decoration, DecorationSet } = require("prosemirror-view")
const { Plugin, Selection } = require("prosemirror-state")

function addCSSclass(rules) {
	var style = document.createElement("style");
	style.appendChild(document.createTextNode("")); // WebKit hack :(
	document.head.appendChild(style);
	var sheet = style.sheet;

	rules.forEach((rule, index) => {
		try {
			if ("insertRule" in sheet) {
				sheet.insertRule(rule.selector + "{" + rule.rule + "}", index);
			} else if ("addRule" in sheet) {
				sheet.addRule(rule.selector, rule.rule, index);
			}
		} catch (e) {
			// firefox can break here          
		}
	})
}

function getSbox() {
	// create suggestions widget
	let sbox = document.getElementById('suggestBox');
	if (sbox) return sbox;

	addCSSclass([{
		selector: '.spell-error',
		rule: 'background-image: url("data:image/gif;base64,R0lGODlhBAADAIABAP8AAP///yH5BAEAAAEALAAAAAAEAAMAAAIFRB5mGQUAOw=="); background-position: bottom; background-repeat: repeat-x;'
	}, {
		selector: '#suggestBox',
		rule: 'display:inline-block; overflow:hidden; border:solid black 1px;'
	}, {
		selector: '#suggestBox > select',
		rule: 'padding:10px; margin:-5px -20px -5px -5px;'
	}, {
		selector: '#suggestBox > select > option:hover',
		rule: 'box-shadow: 0 0 10px 100px #4A8CF7 inset; color: white;'
	}]);

	sbox = document.createElement('div');
	sbox.style.zIndex = 100000;
	sbox.id = 'suggestBox';
	sbox.style.position = 'fixed';
	sboxHide(sbox);

	let selwidget = document.createElement('select');
	selwidget.multiple = 'yes';
	sbox.appendChild(selwidget);

	/*sbox.onmouseout = (e => {
		let related = (e.relatedTarget ? e.relatedTarget.tagName : null);
		console.log(related)
		if (related !== 'SELECT' && related !== 'OPTION') sboxHide(sbox)
	});*/

	document.body.appendChild(sbox);
	return sbox;
}

function sboxShow(sbox, viewDom, token, screenPos, items, hourglass, correctFunc) {
	let selwidget = sbox.children[0];

	var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 && navigator.userAgent && !navigator.userAgent.match('CriOS');
	let separator = (!isSafari && (hourglass || items.length > 0)); // separator line does not work well on safari

	let options = '';
	items.forEach(s => options += '<option value="' + s + '">' + s + '</option>');
	if (hourglass) options += '<option disabled="disabled">&nbsp;&nbsp;&nbsp;&#8987;</option>';
	if (separator) options += '<option style="min-height:1px; max-height:1px; padding:0; background-color: #000000;" disabled>&nbsp;</option>';
	options += '<option value="##ignoreall##">Ignore&nbsp;All</option>';

	let indexInParent = [].slice.call(selwidget.parentElement.children).indexOf(selwidget);
	selwidget.innerHTML = options;
	selwidget = selwidget.parentElement.children[indexInParent];

	let fontSize = window.getComputedStyle(viewDom, null).getPropertyValue('font-size');
	selwidget.style.fontSize = fontSize;
	selwidget.size = selwidget.length;
	if (separator) selwidget.size--;
	selwidget.value = -1;

	// position widget
	let viewrect = viewDom.getBoundingClientRect();
	let widgetRect = sbox.getBoundingClientRect();
	if (screenPos.x+widgetRect.width > viewrect.right) screenPos.x = (viewrect.right - widgetRect.width - 2) 
	if (screenPos.y+widgetRect.height > viewrect.bottom) screenPos.y = (viewrect.bottom - sbox.offsetHeight - 8) 
	if (screenPos.y < viewrect.top) screenPos.y = (viewrect.top + 2);

	sbox.style.left = screenPos.x + 'px';
	sbox.style.top = screenPos.y + 'px';
	sbox.focus()

	selwidget.onchange = (e => {
		sboxHide(sbox);
		let correction=e.target.value;
		if (correction == '##ignoreall##') {
			window.typo.ignore(token);
			correction=token;
		}
		correctFunc(correction);
	});
}

function sboxHide(sbox) {
	sbox.style.top = sbox.style.left = '-1000px';
	if (window.typo) window.typo.suggest(); // disable any running suggeations search
}

function rangeFromTransform(tr) {
	let from, to
	for (let i = 0; i < tr.steps.length; i++) {
		let step = tr.steps[i],
			map = step.getMap()
		let stepFrom = map.map(step.from || step.pos, -1)
		let stepTo = map.map(step.to || step.pos, 1)
		from = from ? map.map(from, -1).pos.min(stepFrom) : stepFrom
		to = to ? map.map(to, 1).pos.max(stepTo) : stepTo
	}
	return { from, to }
}

/*
function getWordAt(str, pos) {
    str = String(str);
    pos = Number(pos) >>> 0;
    const start = str.slice(0, pos + 1).search(/\S+$/),
        right = str.slice(pos).search(/\s/);
    const word=right < 0 ? str.slice(start) : str.slice(start, right + pos);
    return { start, word };
}
*/

function spellcheckPlugin(typo) {
	 getSbox(); // create suggestion box

	return new Plugin({
		view(view) {
			view.dom.spellcheck = false;
			return {};
		},

		state: {
			init() {
				return { decos: DecorationSet.empty, cursorDeco: null }
			},
			apply(tr, prev, oldState, state) {
				sboxHide(getSbox());
				let { decos, cursorDeco } = this.getState(oldState)
				decos = decos.map(tr.mapping, tr.doc)

				if (cursorDeco) {
					decos = decos.add(state.doc, [cursorDeco]);
					cursorDeco = null;
				}

				let from, to;
				if (tr.docChanged)({ from, to } = rangeFromTransform(tr))
				if (from && to) {
					const $t = state.doc.resolve(to)

					let txt = $t.parent.textBetween(0, $t.end() - $t.start(), ' ');
					//console.log(txt)
					decos = decos.remove(decos.find($t.start(), $t.end()));

					const startp = $t.start();
					const reg = /\w+/g
					let match = null;
					while ((match = reg.exec(txt)) != null) {
						if (window.typo && !window.typo.check(match[0])) {
							const deco = Decoration.inline(startp + match.index, startp + reg.lastIndex, { class: 'spell-error' });
							if ($t.pos == startp + reg.lastIndex) {
								cursorDeco = deco;
							} else {
								decos = decos.add(state.doc, [deco]);
							}
						}
					}
				}

				return { decos, cursorDeco } //: decos.map(tr.mapping, tr.doc), cursorDeco }
			}
		},
		props: {
			decorations(state) {
				let { decos } = this.getState(state)
				return decos
			},

			handleContextMenu(view, pos, e) {
				if (!window.typo) return; 
				let { decos } = this.getState(view.state)
				let deco = decos.find(pos, pos)[0]
				if (!deco) return

				const $f = view.state.doc.resolve(deco.from),
					$t = view.state.doc.resolve(deco.to)
				let token = $f.parent.textBetween(deco.from - $f.start(), deco.to - $f.start(), ' ');
				if (!token) return; // sanity
				console.log(token)

				let viewDom = view.dom;
				let coords = view.coordsAtPos(pos);
				screenPos = { x: e.pageX, y: coords.bottom - 4 }

				function correct(correction) {
					let tr=view.state.tr.replaceWith(deco.from, deco.to, view.state.schema.text(correction));
					let $newPos= tr.doc.resolve(tr.mapping.map(deco.from+correction.length))
					tr = tr.setSelection(new Selection($newPos, $newPos))
					view.dispatch(tr);
					view.focus();
				}

				let sbox = getSbox();
				sboxShow(sbox, view.dom, token, screenPos, [], true, correct);

				var results = [];
				// async 
				window.typo.suggest(token, null, all => {
					//console.log('done');
					sboxShow(sbox, view.dom, token, screenPos, results, false, correct);
				}, next => {
					//console.log('found '+next);
					results.push(next);
					sboxShow(sbox, view.dom, token, screenPos, results, true, correct);
				});

				e.preventDefault();
				return false;
			}
		}
	});
}
exports.spellcheckPlugin = spellcheckPlugin
