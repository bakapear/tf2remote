let Discord = require('discord.js')

module.exports = class extends Discord.Client {
  constructor (token) {
    super()
    this.login(token)
  }
}
