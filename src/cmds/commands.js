/* global controller, CMDS */

module.exports = {
  name: 'commands',
  aliases: ['cmds'],
  description: 'List all available commands.',
  async exec (cmd, args) {
    controller.party(CMDS.map(x => x.name).join(', '))
  }
}
