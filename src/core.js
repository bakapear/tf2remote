/* global bot, tf, cfg */
let chalk = require('chalk')
let log = str => console.info(str)
let error = str => console.error(chalk.red(str))
let write = str => {
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(str)
}

log(`${chalk.blue('-----')} ${chalk.magenta(bot.user.username + '#' + bot.user.discriminator)} listening on ${chalk.yellow(tf.port)} ${chalk.blue('-----')}`)

let channel = bot.channels.cache.find(x => x.id === cfg.channel)
let stats = { sent: 0, received: 0, disabled: false }
let zero = '​' // zero-width space

if (!cfg.channel) error('No default channel specified. Not receiving messages.')
else if (!channel) error('Invalid channel ID provided. Not receiving messages.')
else update()

function receive (msg) {
  let str = msg.content
  let regex = /<@!?(\d+)>/
  let match = null
  do {
    match = regex.exec(str)
    if (match) {
      let user = bot.users.cache.find(x => x.id === match[1])
      if (user) str = str.substring(0, match.index) + `@${user.username}` + str.substring(match.index + match[0].length)
    }
  } while (match)
  if (msg.attachments.size) str += ` [ ${msg.attachments.size} Attachment${msg.attachments.size === 1 ? '' : 's'} ]`
  if (msg.embeds.length) str += ` [ ${msg.embeds.length} Embed${msg.embeds.length === 1 ? '' : 's'} ]`
  tf.party(str.split('\n').map(x => `${zero}[${msg.author.username}]: ${x}`))
  update(++stats.received)
}

function update () {
  write([
      `${chalk.gray('#' + channel.name)}`,
  `[${chalk.yellow(stats.received)} msg${stats.received === 1 ? '' : 's'} received | ${chalk.yellow(stats.sent)} msg${stats.sent === 1 ? '' : 's'} sent]`,
  stats.disabled ? chalk.red('[DISABLED]') : ''
  ].join(' ').trim())
}

function parse (str) {
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

function send (str) {
  if (channel) {
    let regex = /(^|[^<])@(\w+)/
    let match = null
    do {
      match = regex.exec(str)
      if (match) {
        let user = bot.users.cache.find(x => x.username.toLowerCase() === match[2].toLowerCase())
        if (user) str = str.substring(0, match.index) + `<@${user.id}>` + str.substring(match.index + match[0].length)
      }
    } while (match)
    channel.send(str)
    update(++stats.sent)
  }
}

function command (str = '') {
  let args = str.split(' ')
  let cmd = args.shift()
  switch (cmd) {
    case 'channel': {
      if (channel) tf.party(zero + `Connected to #${channel.name}`)
      else tf.party(zero + 'Not connected to a channel')
      break
    }
    case 'status': {
      tf.party(zero + 'Discord hook is ' + (stats.disabled ? 'OFF' : 'ON'))
      break
    }
    case 'enable': case 'on': {
      if (!stats.disabled) tf.party(zero + 'Discord hook already enabled')
      else {
        stats.disabled = false
        tf.party(zero + 'Discord hook enabled')
      }
      break
    }
    case 'disable': case 'off': {
      if (stats.disabled) tf.party(zero + 'Discord hook already disabled')
      else {
        stats.disabled = true
        tf.party(zero + 'Discord hook disabled')
      }
      break
    }
    default: tf.party(zero + `Unknown command "${cmd}"`)
  }
  update()
}

bot.on('message', msg => {
  if (msg.channel === channel && !stats.disabled) receive(msg)
})

tf.on('line', line => {
  line = parse(line)
  if (line.party && line.party.msg[0] !== zero) {
    if (line.party.msg[0] === cfg.prefix.cmd) command(line.party.msg.substr(1))
    else if (line.party.user === cfg.steam && line.party.msg.startsWith(cfg.prefix.chat) && !stats.disabled) {
      send(line.party.msg.substr(cfg.prefix.chat.length))
    }
  }
})
