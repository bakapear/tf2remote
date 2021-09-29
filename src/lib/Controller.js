let Rcon = require('./rcon')
let child = require('child_process')
let ph = require('path')
let fs = require('fs')
let util = require('./util')
let OWNER = ph.resolve(__dirname, '..', 'owner')

require('util').inherits(Controller, require('events').EventEmitter)

function Controller (exe) {
  this.exe = exe
  this.log = ph.join(ph.dirname(exe), 'tf', 'console.log')
  this.pass = Math.random().toString(32).substr(2)
  this.owner = fs.existsSync(OWNER) ? fs.readFileSync(OWNER, 'utf-8') : null
  this.server = null
}

Controller.prototype.exec = function (args) {
  if (!Array.isArray(args)) args = [args]
  child.execFile(this.exe, ['-hijack', ...args])
}

Controller.prototype.init = async function () {
  fs.watchFile(this.log, { persistent: true, interval: 0 }, (curr, prev) => {
    if (curr.mtime <= prev.mtime) return
    let diff = curr.size - prev.size
    let buffer = Buffer.alloc(diff)
    let fd = fs.openSync(this.log, 'r')
    fs.readSync(fd, buffer, 0, diff, prev.size)
    fs.closeSync(fd)
    this.emit('log', buffer.toString())
  })

  this.exec([
    '+tf_mm_partyclient_debug', '1',
    '+con_logfile', ph.basename(this.log),
    '+con_timestamp', '1',
    '+rcon_password', this.pass,
    '+con_filter_enable', '1',
    '+con_filter_text', 'cheeseburger',
    '+con_filter_text_out', '[PartyClientDbg]'
  ])
  this.exec('+net_status')

  return new Promise((resolve, reject) => {
    this.on('log', line => {
      line = parseChat(line)
      if (!this.server) {
        let match = line.value.match(/(?:host (.*?):.*Server (.*?),|IP (.*?),.*ports (.*?) )/s)
        if (match) {
          let [ip, port] = match.slice(1).filter(x => x)
          if (!Number(port)) this.exec('+net_start')
          else {
            this.server = new Rcon(ip, port, this.pass)
            this.server.connect()
            this.server.once('error', e => {
              reject(e)
            })
            this.server.once('auth', async () => {
              await this.run('con_filter_text ""')
              resolve()
            })
          }
        }
      } else if (line.party && (!this.owner || this.owner === line.party.user)) this.emit('message', line.party)
    })
  })
}

Controller.prototype.run = async function (args) {
  if (!Array.isArray(args)) args = [args]
  let end = Math.random().toString(32).substr(2)
  this.server.send(args.join('\n') + `; echo ${end}`)
  return new Promise(resolve => {
    let res = []
    let listening = true

    let fn = async data => {
      data = data.trim()
      if (data.endsWith(end)) {
        listening = false
        data = data.slice(0, -end.length).trim()
        res.push(data)
        this.server.removeListener('response', fn)
        resolve(res.join('\n'))
      } else res.push(data)
    }

    this.server.on('response', fn)
    setTimeout(() => {
      if (listening) {
        console.log('FAILED:', args)
        this.server.removeListener('response', fn)
        resolve(null)
      }
    }, 1000)
  })
}

Controller.prototype.party = async function (args) {
  if (!Array.isArray(args)) args = [args]
  return this.run(args.map(x => `tf_party_chat "${x.toString().replace(/"/g, "'")}"`).join('\n'))
}

Controller.prototype.close = async function () {
  this.server.disconnect()
  return new Promise(resolve => this.server.once('end', resolve))
}

Controller.prototype.getPlayers = async function () {
  let data = await this.run('status')
  let lines = data.split('\n')
  let players = []
  for (let line of lines) {
    line = parseChat(line).value
    if (line[0] !== '#') continue
    let point = line.lastIndexOf('"')
    let name = line.substring(line.indexOf('"') + 1, point)
    let uid = line.substring(line.indexOf('[', point) + 1, line.indexOf(']', point))
    if (uid) players.push({ name, uid, id: util.convertSteamID(uid) })
  }
  return players
}

module.exports = Controller

function parseChat (str) {
  let block = { value: str }
  util.match(block.value, /\d\d\/\d\d\/\d\d\d\d - \d\d:\d\d:\d\d: /, m => {
    block.time = new Date(m[0].replace(/( - |:$)/g, ' '))
    block.value = str.substr(m[0].length)
  })
  util.match(block.value, /^\[PartyClientDbg] \[Chat] (.+?) \[k_eTFPartyChatType_MemberChat \(1\)]: (.*)/, m => {
    block.party = { user: m[1], msg: m[2] }
  })
  return block
}
