// Fixed errors and stuff tho

/*!
 * node-rcon
 * Copyright(c) 2012 Justin Li <j-li.net>
 * MIT Licensed
 */

let util = require('util')
let events = require('events')
let net = require('net')
let dgram = require('dgram')
let Buffer = require('buffer').Buffer

let PacketType = {
  COMMAND: 0x02,
  AUTH: 0x03,
  RESPONSE_VALUE: 0x00,
  RESPONSE_AUTH: 0x02
}

/**
 * options:
 *   tcp - true for TCP, false for UDP (optional, default true)
 *   challenge - if using UDP, whether to use the challenge protocol (optional, default true)
 *   id - RCON id to use (optional)
 */
function Rcon (host, port, password, options) {
  if (!(this instanceof Rcon)) return new Rcon(host, port, password, options)
  options = options || {}

  this.host = host
  this.port = port
  this.password = password
  this.rconId = options.id || 0x0012D4A6 // This is arbitrary in most cases
  this.hasAuthed = false
  this.outstandingData = null
  this.tcp = options.tcp == null ? true : options.tcp
  this.challenge = options.challenge == null ? true : options.challenge

  events.EventEmitter.call(this)
};

util.inherits(Rcon, events.EventEmitter)

Rcon.prototype.send = function (data, cmd, id) {
  let sendBuf
  if (this.tcp) {
    cmd = cmd || PacketType.COMMAND
    id = id || this.rconId

    let length = Buffer.byteLength(data)
    sendBuf = Buffer.alloc(length + 14)
    sendBuf.writeInt32LE(length + 10, 0)
    sendBuf.writeInt32LE(id, 4)
    sendBuf.writeInt32LE(cmd, 8)
    sendBuf.write(data, 12)
    sendBuf.writeInt16LE(0, length + 12)
  } else {
    if (this.challenge && !this._challengeToken) {
      this.emit('error', new Error('Not authenticated'))
      return
    }
    let str = 'rcon '
    if (this._challengeToken) str += this._challengeToken + ' '
    if (this.password) str += this.password + ' '
    str += data + '\n'
    sendBuf = Buffer.alloc(4 + Buffer.byteLength(str))
    sendBuf.writeInt32LE(-1, 0)
    sendBuf.write(str, 4)
  }
  this._sendSocket(sendBuf)
}

Rcon.prototype._sendSocket = function (buf) {
  if (this._tcpSocket) {
    this._tcpSocket.write(buf.toString('binary'), 'binary')
  } else if (this._udpSocket) {
    this._udpSocket.send(buf, 0, buf.length, this.port, this.host)
  }
}

Rcon.prototype.connect = function () {
  let self = this

  if (this.tcp) {
    this._tcpSocket = net.createConnection(this.port, this.host)
    this._tcpSocket.on('data', function (data) { self._tcpSocketOnData(data) })
      .on('connect', function () { self.socketOnConnect() })
      .on('error', function (err) { self.emit('error', err) })
      .on('end', function () { self.socketOnEnd() })
  } else {
    this._udpSocket = dgram.createSocket('udp4')
    this._udpSocket.on('message', function (data) { self._udpSocketOnData(data) })
      .on('listening', function () { self.socketOnConnect() })
      .on('error', function (err) { self.emit('error', err) })
      .on('close', function () { self.socketOnEnd() })
    this._udpSocket.bind(0)
  }
}

Rcon.prototype.disconnect = function () {
  if (this._tcpSocket) this._tcpSocket.end()
  if (this._udpSocket) this._udpSocket.close()
}

Rcon.prototype.setTimeout = function (timeout, callback) {
  if (!this._tcpSocket) return

  let self = this
  this._tcpSocket.setTimeout(timeout, function () {
    self._tcpSocket.end()
    if (callback) callback()
  })
}

Rcon.prototype._udpSocketOnData = function (data) {
  let a = data.readUInt32LE(0)
  if (a === 0xffffffff) {
    let str = data.toString('utf-8', 4)
    let tokens = str.split(' ')
    if (tokens.length === 3 && tokens[0] === 'challenge' && tokens[1] === 'rcon') {
      this._challengeToken = tokens[2].substr(0, tokens[2].length - 1).trim()
      this.hasAuthed = true
      this.emit('auth')
    } else {
      this.emit('response', str.substr(1, str.length - 2))
    }
  } else {
    this.emit('error', new Error('Received malformed packet'))
  }
}

Rcon.prototype._tcpSocketOnData = function (data) {
  if (this.outstandingData != null) {
    data = Buffer.concat([this.outstandingData, data], this.outstandingData.length + data.length)
    this.outstandingData = null
  }

  while (data.length) {
    let len = data.readInt32LE(0)
    if (!len) return

    let id = data.readInt32LE(4)
    let type = data.readInt32LE(8)

    let str

    if (len >= 10 && data.length >= len + 4) {
      if (id === this.rconId) {
        if (!this.hasAuthed && type === PacketType.RESPONSE_AUTH) {
          this.hasAuthed = true
          this.emit('auth')
        } else if (type === PacketType.RESPONSE_VALUE) {
          // Read just the body of the packet (truncate the last null byte)
          // See https://developer.valvesoftware.com/wiki/Source_RCON_Protocol for details
          str = data.toString('utf8', 12, 12 + len - 10)

          if (str.charAt(str.length - 1) === '\n') {
            // Emit the response without the newline.
            str = str.substring(0, str.length - 1)
          }

          this.emit('response', str)
        }
      } else if (id === -1) {
        this.emit('error', new Error('Authentication failed'))
      } else {
        // ping/pong likely
        str = data.toString('utf8', 12, 12 + len - 10)

        if (str.charAt(str.length - 1) === '\n') {
          // Emit the response without the newline.
          str = str.substring(0, str.length - 1)
        }

        this.emit('server', str)
      }

      data = data.slice(12 + len - 8)
    } else {
      // Keep a reference to the chunk if it doesn't represent a full packet
      this.outstandingData = data
      break
    }
  }
}

Rcon.prototype.socketOnConnect = function () {
  this.emit('connect')

  let sendBuf

  if (this.tcp) {
    this.send(this.password, PacketType.AUTH)
  } else if (this.challenge) {
    let str = 'challenge rcon\n'
    sendBuf = Buffer.alloc(str.length + 4)
    sendBuf.writeInt32LE(-1, 0)
    sendBuf.write(str, 4)
    this._sendSocket(sendBuf)
  } else {
    sendBuf = Buffer.alloc(5)
    sendBuf.writeInt32LE(-1, 0)
    sendBuf.writeUInt8(0, 4)
    this._sendSocket(sendBuf)

    this.hasAuthed = true
    this.emit('auth')
  }
}

Rcon.prototype.socketOnEnd = function () {
  this.emit('end')
  this.hasAuthed = false
}

module.exports = Rcon
