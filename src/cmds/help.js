/* global controller, CMDS */

module.exports = {
  name: 'help',
  description: 'Find help about a command.',
  usage: '<command>',
  args: 1,
  async exec (cmd, args) {
    let command = CMDS.find(x => x.name === args[0] || x.aliases.includes(args[0]))
    if (!command) controller.party(`Command "${args[0]}" does not exist.`)
    else {
      controller.party([
        command.name ? `Name: ${command.name}` : '',
        command.aliases.length ? `Aliases: ${command.aliases}` : '',
        command.description ? `Description: ${command.description}` : '',
        command.usage ? `Usage: ${command.usage}` : ''
      ].filter(x => x))
    }
  }
}
