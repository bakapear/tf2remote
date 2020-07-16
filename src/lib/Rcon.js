let RCON = require('rcon')

module.exports = class extends RCON {
  constructor ({ host = '127.0.0.1', port, pass = '' }) {
    super(host, port, pass)
  }

  auth () {
    this.connect()
    return new Promise((resolve, reject) => {
      this.once('auth', resolve)
      this.once('error', reject)
    })
  }

  exec (str) {
    this.send(str)
    return new Promise(resolve => this.once('response', resolve))
  }

  close () {
    this.disconnect()
    return new Promise(resolve => this.once('end', resolve))
  }
}
