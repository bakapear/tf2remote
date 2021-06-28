let fs = require('fs')
let ph = require('path')

let PREFIX = '/'
let { controller } = global

global.CMDS = []
let REQUIRED = ['name', 'exec']
let total = []

function loadCommands (path) {
  let dir = ph.resolve(__dirname, path)
  let files = fs.readdirSync(dir, 'utf-8')
  for (let i = 0; i < files.length; i++) {
    let path = ph.join(dir, files[i])
    if (fs.statSync(path).isDirectory()) path = path + '/main.js'
    let cmd = require(ph.resolve(path))
    if (!Array.isArray(cmd)) cmd = [cmd]
    for (let j = 0; j < cmd.length; j++) {
      cmd[j].path = ph.basename(path)
      cacheCMD(cmd[j])
    }
  }
}

function cacheCMD (cmd) {
  if (cmd.name) cmd.name = cmd.name.toLowerCase()
  if (!cmd.aliases) cmd.aliases = []
  if (!cmd.usage) cmd.usage = ''
  if (!cmd.args) cmd.args = 0

  let missing = REQUIRED.filter(x => !Object.keys(cmd).some(y => y === x))
  if (missing.length) return console.error(cmd.path, `The following required keys are missing: ${missing.map(x => `'${x}'`).join(', ')}`)

  let dupe = total.filter(x => x === cmd.name || cmd.aliases.some(y => y === x))
  if (dupe.length) return console.error(cmd.path, `The following keys are duplicate: ${dupe.map(x => `'${x}'`).join(', ')}`)

  total.push(cmd.name, ...cmd.aliases)
  global.CMDS.push(cmd)
}

loadCommands('cmds')

controller.on('message', chat => {
  if (chat.msg[0] !== PREFIX) return

  let args = chat.msg.substr(1).match(/[^"\s]+|"(?:\\"|[^"])+"/g) || []
  args = args.map(x => x[0] + x.slice(-1) === '""' ? x.slice(1, -1) : x)
  let cmd = args.shift()

  let command = global.CMDS.find(x => x.name === cmd || x.aliases.includes(cmd))

  if (command) {
    if (command.args > args.length) controller.party(`Usage: ${PREFIX}${command.name} ${command.usage}`)
    else command.exec(cmd, args)
  } else controller.party(`Unknown command: "${cmd}"`)
})
