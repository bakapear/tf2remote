let fs = require('fs')
let chalk = require('chalk')
let psls = require('process-list')
let Discord = require('./lib/Discord')
let Controller = require('./lib/Controller')
let core = () => require('./core')

function config (file) {
  if (!fs.existsSync(file)) throw new Error(`Config file missing: ${file}`)
  return JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }))
}

function kill () {
  setTimeout(() => {
    tf.disconnect()
    bot.destroy()
    process.exit()
  }, 100)
}

function error (e) {
  console.error(chalk.red(`Error: ${e.message}`))
  process.exit()
}

process.on('SIGINT', kill)
process.on('SIGHUP', kill)
process.on('unhandledRejection', error)
process.on('uncaughtException', error)

let cfg = config('settings.json')
let bot = new Discord(cfg.token)
let tf = new Controller(cfg.dir)

psls.snapshot('name', 'cmdline').then(async res => {
  let pro = res.find(x => x.name === 'hl2.exe' && x.cmdline.indexOf('tf_mm_partyclient_debug') < 0)
  if (!pro) throw new Error('TF2 is not running!')
  if (!pro.cmdline.split(' ').includes('-usercon')) throw new Error('TF2 is missing -usercon in its launch options!')
  tf.init().then(() => {
    let globals = { tf, bot, cfg }
    for (let obj in globals) global[obj] = globals[obj]
    bot.on('ready', core)
  })
})
