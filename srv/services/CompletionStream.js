const { EventEmitter } = require('events');

class CompletionStream extends EventEmitter {
  constructor() {
    super();
  }
}

module.exports = CompletionStream;