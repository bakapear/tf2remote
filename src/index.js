let Controller = require('./mods/Controller')
let Discord = require('./mods/Discord')
let cfg = require('./settings.json')
let dig = require('gamedig')
let chalk = require('chalk')
let psls = require('process-list')

let tf = new Controller(cfg)
let bot = new Discord(cfg.token)
let stats = {}

let regex = {
  server: /^Connected to ([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}):?([0-9]{1,5})?/m
}

let channel = null

bot.on('ready', async () => {
  channel = bot.channels.cache.get(cfg.channel)
  if (!(await psls.snapshot('name')).find(x => x.name === 'hl2.exe')) throw new Error('TF2 is not running!')
  if (channel) {
    console.info(`Connected to ${chalk.blue('#' + channel.name)}`)
    tf.input(`tf_party_chat "\\ [tf2remote] #${channel.name}"`)
    bot.on('message', msg => {
      if (msg.channel === channel) {
        if (!stats.disabled) {
          if (msg.attachments.size) msg.content += ` [ ${msg.attachments.size} Attachment${msg.attachments.size === 1 ? '' : 's'} ]`
          if (msg.embeds.length) msg.content += ` [ ${msg.embeds.length} Embed${msg.embeds.length === 1 ? '' : 's'} ]`
          tf.input(`tf_party_chat "[${msg.author.username}]: ${msg.content}"`)
        }
      }
    })
    tf.on('line', line => {
      line = trimTime(line)
      if (line.startsWith(`[PartyClientDbg] [Chat] ${cfg.steam} [k_eTFPartyChatType_MemberChat (1)]:`)) {
        let msg = line.substr(line.indexOf(']:') + 2).trim()
        if (!msg.match(/\[.*\]:/) && !msg.startsWith('\\')) {
          msg = mentions(msg)
          if (msg.startsWith('/')) msg = commands(msg)
          if (msg && msg.trim() && !stats.disabled) channel.send(msg)
        }
      }
      if (line === 'Disconnecting from abandoned match server') {
        console.info('Disconnected from server.')
        stats.ip = null
        stats.port = null
        stats.text = null
      }
      let server = line.match(regex.server)
      if (server) {
        stats.ip = server[1]
        stats.port = server[2]
        getServerData(stats.ip, stats.port, (err, res) => {
          if (err) console.error(err)
          console.info('Connected to ' + `'${chalk.green(res.name)}' ${res.players.length}/${res.maxplayers} [${res.map}] (${chalk.yellow(res.connect)})`)
          stats.text = `\`${res.name}\` ${res.players.length}/${res.maxplayers} [${res.map}]\n${res.connect}`
        })
      }
      if (line === 'CTFGCClientSystem::ShutdownGC') kill()
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
    case 'channels': {
      let channels = channel.guild.channels.cache.array().filter(x => x.type === 'text').map((x, i) => `${i + 1}. ${x.name}`)
      tf.input(channels.map(x => `tf_party_chat "\\ ${x}"`))
      break
    }
    case 'channel': {
      if (!args.length) tf.input(`tf_party_chat "\\ Currently connected to: #${channel.name}"`)
      else {
        let chan = channel.guild.channels.cache.filter(x => x.type === 'text').find(x => x.name === args[0])
        if (chan) {
          channel = chan
          tf.input(`tf_party_chat "\\ Switched to #${chan.name}"`)
          console.info(`Switched to ${chalk.blue('#' + chan.name)}`)
        } else {
          tf.input(`tf_party_chat "\\ Invalid text channel: '${args[0]}'"`)
        }
      }
      break
    }
    case 'server': {
      msg = stats.text
      if (!msg) tf.input('tf_party_chat "\\ No Server information yet!"')
      break
    }
    case 'enable': {
      if (stats.disabled) console.info('Enabled Discord Hook')
      stats.disabled = false
      tf.input('tf_party_chat "\\ Discord Hook ENABLED"')
      break
    }
    case 'disable': {
      if (!stats.disabled) console.info('Disabled Discord Hook')
      stats.disabled = true
      tf.input('tf_party_chat "\\ Discord Hook DISABLED"')
      break
    }
    case 'status': {
      tf.input(`tf_party_chat "\\ Discord Hook is currently ${stats.disabled ? 'DISABLED' : 'ENABLED'}"`)
      break
    }
    default: {
      tf.input('tf_party_chat "\\ Unknown command!"')
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

process.on('unhandledRejection', e => {
  console.error(chalk.red(`Error: ${e.message}`))
  kill()
})

process.on('SIGINT', kill)
process.on('SIGHUP', kill)

function kill () {
  tf.input('tf_party_chat "\\ [tf2remote] Shutting down."')
  console.info('Shutting down.')
  setTimeout(() => {
    bot.destroy()
    process.exit()
  }, 100)
}
