/* global controller */
let dp = require('../lib/despair')

module.exports = {
  name: 'math',
  aliases: ['m', 'calc'],
  description: 'Evaluate a mathematical expression.',
  args: 1,
  usage: '<expression>',
  async exec (cmd, args) {
    let math = await doMath(args.join(' '))
    return controller.party(math)
  }
}

async function doMath (expression) {
  let body = await dp('https://api.mathjs.org/v4/', {
    query: { expr: expression }
  }).json().catch(e => e.body)
  return body.toString()
}
