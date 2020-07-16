let fs = require('fs')
let Events = require('events')
let child = require('child_process')
let RCON = require('./Rcon')
let path = require('path')
let Tail = require('tail').Tail

module.exports = class extends Events {
  constructor (dir) {
    if (!fs.existsSync(dir) || !fs.existsSync(path.join(dir, 'hl2.exe'))) throw new Error(`'${dir}' is not a valid TF2 Directory.`)
    super()
    this.log = 'console.log'
    this.address = '127.0.0.1'
    this.port = Math.floor(Math.random() * (20000)) + 40000
    this.pass = Math.random().toString(32).substr(2)
    let server = new RCON({ host: this.address, port: this.port, pass: this.pass })
    this.disconnect = async () => server.close()
    this.exec = str => child.exec(`"${dir}/hl2.exe" -game -tf -hijack ${Array.isArray(str) ? str.join(' ') : str}`)
    let watcher = new Tail(path.join(dir, 'tf', this.log), { useWatchFile: true, fsWatchOptions: { interval: 100 } })
    watcher.on('line', data => this.emit('line', data))
    this.input = async str => server.exec(str)
    this.party = str => {
      if (!Array.isArray(str)) str = [str]
      this.input(str.map(x => `tf_party_chat "${x.replace(/"/g, "'")}"`).join(';'))
    }
    this.init = async () => {
      this.exec([
        '+tf_mm_partyclient_debug', '1',
        '+con_logfile', this.log,
        '+con_timestamp', '1',
        '+ip', '0.0.0.0',
        '+hostport', this.port,
        '+rcon_password', this.pass,
        '+net_start'
      ])
      await server.auth()
    }
  }
}
