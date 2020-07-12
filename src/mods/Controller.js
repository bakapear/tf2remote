let Events = require('events')
let child = require('child_process')
let fs = require('fs')
let path = require('path')
let Tail = require('tail').Tail

module.exports = class extends Events {
  constructor (data) {
    super()
    this.exec = str => child.exec(`"${data.dir}/hl2.exe" -game tf -hijack ${str}`)
    this.echo = msg => this.exec(`+echo "${msg}"`)
    this.input = command => {
      if (Array.isArray(command)) command = command.join('\n')
      fs.writeFileSync(path.join(data.dir, 'tf', 'cfg', data.cfg), command)
      this.exec(`+exec ${data.cfg}`)
    }
    let log = path.join(data.dir, 'tf', data.log)
    let watcher = new Tail(log, { useWatchFile: true, fsWatchOptions: { interval: 1000 } })
    watcher.on('line', data => this.emit('line', data))
  }
}
