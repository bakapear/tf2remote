let Controller = require('./mods/Controller')
let Discord = require('./mods/Discord')
let cfg = require('./settings.json')
let dig = require('gamedig')
let chalk = require('chalk')

let tf = new Controller(cfg)
let bot = new Discord(cfg.token)
let stats = {}

bot.on('ready', () => {
  let channel = bot.channels.cache.get(cfg.channel)
  if (channel) {
    console.log(`Connected to #${channel.name}`)
    bot.on('message', msg => {
      if (msg.channel === channel) {
        if (!stats.disabled) tf.input(`tf_party_chat "[${msg.author.username}]: ${msg.content}"`)
      }
    })
    tf.on('line', line => {
      line = trimTime(line)
      if (line.startsWith(`[PartyClientDbg] [Chat] ${cfg.steam} [k_eTFPartyChatType_MemberChat (1)]:`)) {
        let msg = line.substr(line.indexOf(']:') + 2).trim()
        if (!msg.match(/\[.*\]:/) && !msg.startsWith('\\')) {
          msg = mentions(msg)
          if (msg.startsWith('/')) msg = commands(msg)
          if (msg && msg.trim()) channel.send(msg)
        }
      }
      let server = line.match(/^Connected to ([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}):?([0-9]{1,5})?/m)
      if (server) {
        stats.ip = server[1]
        stats.port = server[2]
        getServerData(stats.ip, stats.port, (err, res) => {
          if (err) console.error(err)
          console.log('Connected to ' + `'${chalk.green(res.name)}' ${res.players.length}/${res.maxplayers} [${res.map}] (${chalk.yellow(res.connect)})`)
          stats.text = `\`${res.name}\` ${res.players.length}/${res.maxplayers} [${res.map}]\n${res.connect}`
        })
      }
    })
  } else throw new Error(`Not a valid channel: "${cfg.channel}"`)
})

function mentions (msg) {
  let regex = /@\w+/g
  let match = null
  do {
    match = regex.exec(msg)
    if (match) {
      let user = bot.users.cache.find(x => x.username.toLowerCase() === match[0].substr(1).toLowerCase())
      if (user) {
        msg = msg.substring(0, match.index) + `<@${user.id}>` + msg.substring(match.index + match[0].length)
      }
    }
  } while (match)
  return msg
}

function commands (msg) {
  let args = msg.split(' ')
  let cmd = args.shift().substr(1)
  msg = null
  switch (cmd) {
    case 'server': {
      msg = stats.text
      break
    }
    case 'enable': {
      stats.disabled = false
      tf.input('tf_party_chat "\\ Discord Hook ENABLED"')
      break
    }
    case 'disable': {
      stats.disabled = true
      tf.input('tf_party_chat "\\ Discord Hook DISABLED"')
    }
  }
  return msg
}

function trimTime (msg) {
  let match = msg.match(/\d\d\/\d\d\/\d\d\d\d - \d\d:\d\d:\d\d:/)
  if (match) msg = msg.substr(match[0].length).trim()
  return msg
}

function getServerData (ip, port, cb) {
  dig.query({
    type: 'tf2',
    host: ip,
    port: port || 27015
  }).then(r => cb(null, r)).catch(e => cb(e, null))
}
