class Parser {
	constructor(){
		// id generator for the blocks, needs to be global because of the recusion
		this._increment = 0;
		// which things are reserved words
		this.defined = ['if', 'each', 'variable', 'echo'];
		// defines what commands need an {{/end}}
		this.needsEnd = ['if', 'each'];
	}

	// Precompiles the html and generates json-arrays
	parse(templateContent) {
		this._increment = 0;
		templateContent = this._escapeSpecials(templateContent);

		if(templateContent[0] == '{' && templateContent[1] == '{') {
			templateContent = templateContent.slice(2, templateContent.length);
		} else {
			templateContent = this._addEcho(templateContent);
		}
		// @TODO add check if open-blocks are the same as end-blocks
		var searches = templateContent.split('{{');
		return this._parseBlocks(searches).content;
	}

	// takes an array of commands
	_parseBlocks(blocks) {
		var result = [];
		var end    = null;
		while(blocks.length) {
			var block = this._parseBlock(blocks);
			if(block == 'end' || block == 'else') { // @TODO improve!
				end = block;
				break;
			} else if(block) {
				block.id = this._increment;
				result.push(block);
			}
			this._increment++;
		}
		return {content: result, end: end};
	}

	// parses one command and adds new ones if needed
	_parseBlock(blocks) {
		var block = blocks[0];
		var result = {};
		var end = this._getEnd(block);
		var type = block.slice(0, end).split(' ');
		if(type[0][0] == '/') {
			// @TODO add for debugging purpose a check if this was the one which was last opened
			result = 'end';
		} else if(type[0] == 'else') {
			result = 'else';
		} else if(this.defined.indexOf(type[0]) == -1) {
			result.type = 'variable';
			result.depending = [type[0]];
		} else {
			result.type    = type[0];
			type.shift();
			result.depending = type;
			if(result.type == 'echo') {
				result.content = block.slice(end + 2, block.length);
			}
		}
		blocks.shift();

		this._handleOverlength(block, blocks);
		this._handleElse(result, blocks);

		return result;
	}

	// Checks if an block-has the {{else}} possibility and adds elseContains
	_handleElse(result, blocks) {
		if(this.needsEnd.indexOf(result.type) != -1) {
			var contains = this._parseBlocks(blocks);
			if(contains) {
				result.contains = contains.content;
				if(contains.end == 'else') {
					result.elseContains = this._parseBlocks(blocks).content;
				} else {
					result.elseContains = [];
				}
			}
		}
	}

	// Checks if an block has an html-string behind it
	_handleOverlength(block, blocks) {
		var end = this._getEnd(block);
		if(block.length > end + 2 && block.slice(0, end) != 'echo') { // Handling of not-variable stuff
			blocks.unshift(this._addEcho(block.slice(end + 2, block.length)));
		}
	}

	// plain html without any variable
	_addEcho(echo) {
		return 'echo}}' +  echo;
	}

	// returns int on which position the }} are existent
	_getEnd(block) {
		return block.indexOf('}}');
	}

	// escaping backslashes, single quotes, and newlines
	_escapeSpecials(templateContent) {
		return templateContent.replace(/\\/g, '\\\\').replace(/\'/g, '\\\'').replace(/\n/g, '\\n').replace(/\r/g, '');
	}
}