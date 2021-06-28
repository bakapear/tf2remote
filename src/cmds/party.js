/* global controller */

module.exports = [
  {
    name: 'invite',
    description: 'Invite a player to your party.',
    usage: '<player>',
    args: 1,
    async exec (cmd, args) {
      let players = await controller.getPlayers()

      let player = players.find(x => x.name.toLowerCase().indexOf(args[0].toLowerCase()) !== -1)
      if (!player) return controller.party('Invalid player.')

      controller.run(`tf_party_invite_user "${player.uid}"`)
    }
  },
  {
    name: 'join',
    description: 'Join a player\'s party.',
    usage: '<player>',
    args: 1,
    async exec (cmd, args) {
      let players = await controller.getPlayers()

      let player = players.find(x => x.name.toLowerCase().indexOf(args[0].toLowerCase()) !== -1)
      if (!player) return controller.party('Invalid player.')

      controller.run(`tf_party_request_join_user "${player.uid}"`)
    }
  },
  {
    name: 'leave',
    description: 'Leave a player\'s party.',
    async exec (cmd, args) {
      let state = await controller.run('tf_party_debug')
      if (state === 'Failed to find party shared object') return controller.party('Not in a party!')

      controller.run('tf_party_leave')
    }
  }
]
