import { define } from 'gunshi'

import { renderCommand } from './commands/render'
import { runCli } from './run'

const entry = define({
  run: () => {
    console.log('run "serenity-emoji --help" for available commands')
  },
})

await runCli(process.argv.slice(2), entry, { subCommands: { render: renderCommand } })
