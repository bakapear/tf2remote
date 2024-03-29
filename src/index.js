let Controller = require('./lib/controller')
let util = require('./lib/util')

async function findTF2 () {
  let procs = await util.listProcesses()
  return procs.find(x => x.path.endsWith('steamapps\\common\\Team Fortress 2\\hl2.exe'))
}

async function kill (e) {
  if (e.message) console.error(e.stack.split('\n').slice(0, 2).map(x => x.trim()).join('\n'))
  if (global.controller) await global.controller.close()
  process.exit()
}

async function main () {
  let game = await findTF2()
  if (!game) util.die('TF2 is not running!')
  if (!util.splitArgs(game.cmd).includes('-usercon')) util.die('Missing "-usercon" launch parameter!')

  let controller = new Controller(game.path)
  await controller.init()

  console.info('[TF2remote] Started!')
  global.controller = controller

  require('./core')
}

main()

process.on('SIGINT', kill)
process.on('SIGHUP', kill)
process.on('unhandledRejection', kill)
process.on('uncaughtException', kill)
