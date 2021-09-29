let child = require('child_process')

module.exports = {
  splitArgs (str) {
    let regex = /[^\s"]+|"([^"]*)"/gi
    let arr = []

    let match = null
    do {
      match = regex.exec(str)
      if (match != null) arr.push(match[1] ? match[1] : match[0])
    } while (match != null)

    return arr
  },
  die (msg, code = 1) {
    console.info(msg)
    process.exit(code)
  },
  listProcesses () {
    let NAME = {
      Caption: ['name', String],
      ExecutablePath: ['path', String],
      CommandLine: ['cmd', String],
      ProcessId: ['id', Number]
    }
    return new Promise(resolve => {
      child.exec('WMIC path win32_process get Caption,ExecutablePath,CommandLine,ProcessId', (err, data) => {
        if (err) throw err
        let head = data.substr(0, data.indexOf('\n') + 1)
        let parts = head.split(/ (?=\w)/).map(x => {
          let name = NAME[x.trim()]
          return { key: name[0], type: name[1], length: x.length }
        })
        let pos = head.length
        let res = []
        while (pos < data.length) {
          let obj = {}
          for (let i = 0; i < parts.length; i++) {
            obj[parts[i].key] = parts[i].type(data.substr(pos, parts[i].length).trim())
            pos += parts[i].length
          }
          pos += parts.length - 1
          res.push(obj)
        }
        resolve(res)
      })
    })
  },
  match (str, regex, fn) {
    let match = str.match(regex)
    if (match) fn(match)
  },
  convertSteamID (id) {
    let args = id.split(':')
    let n = Number(args[2])
    let y, z

    if (n % 2 === 0) {
      y = 0
      z = (n / 2)
    } else {
      y = 1
      z = ((n - 1) / 2)
    }

    return '7656119' + ((z * 2) + (7960265728 + y))
  }
}
