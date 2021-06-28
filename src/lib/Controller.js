let Rcon = require('./rcon')
let child = require('child_process')
let ph = require('path')
let fs = require('fs')
let util = require('util')
let events = require('events')

let ZERO = '​' // zero-width space

function Controller (exe) {
  this.exe = exe
  this.log = ph.join(ph.dirname(exe), 'tf', 'console.log')
  this.pass = Math.random().toString(32).substr(2)
  this.server = null
  this.owner = null
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
    '+net_status'
  ])

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
            this.server.once('error', reject)
            this.server.once('auth', async () => {
              resolve()
              let line = await this.party(ZERO)
              this.owner = parseChat(line).party.user
            })
          }
        }
      } else if (line.party && line.party.user === this.owner) this.emit('message', line.party)
    })
  })
}

Controller.prototype.run = async function (args) {
  if (!Array.isArray(args)) args = [args]
  this.server.send(args.join('\n'))
  return new Promise(resolve => {
    this.server.once('response', async data => {
      if (data) resolve(data)
      else {
        let timer = setTimeout(() => resolve(''), 100)
        this.once('log', data => {
          if (timer) {
            clearTimeout(timer)
            resolve(data)
          }
        })
      }
    })
  })
}

Controller.prototype.party = async function (args) {
  if (!Array.isArray(args)) args = [args]
  return this.run(args.map(x => `tf_party_chat "${x.replace(/"/g, "'")}"`).join('\n'))
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
    if (uid) players.push({ name, uid, id: convertSteamID(uid) })
  }
  return players
}

util.inherits(Controller, events.EventEmitter)

module.exports = Controller

function parseChat (str) {
  let block = { value: str }
  match(block.value, /\d\d\/\d\d\/\d\d\d\d - \d\d:\d\d:\d\d: /, m => {
    block.time = new Date(m[0].replace(/( - |:$)/g, ' '))
    block.value = str.substr(m[0].length)
  })
  match(block.value, /^\[PartyClientDbg] \[Chat] (.+?) \[k_eTFPartyChatType_MemberChat \(1\)]: (.*)/, m => {
    block.party = { user: m[1], msg: m[2] }
  })
  return block
}

function match (str, regex, fn) {
  let match = str.match(regex)
  if (match) fn(match)
}

function convertSteamID (id) {
  let args = id.split(':')
  let n = Number(args[2])
  let y, z

  if (n % 2 === 0) {
    y = 0
    z = (n / 2)
  } else {
    y = 1
    z = ((n - 1) / 2)
  }

  return '7656119' + ((z * 2) + (7960265728 + y))
}
