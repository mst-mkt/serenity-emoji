import { define } from 'gunshi'

import { ansiCommand } from './render/ansi'
import { csvCommand } from './render/csv'
import { icoCommand } from './render/ico'
import { imageCommand } from './render/image'
import { jsonCommand } from './render/json'
import { pngCommand } from './render/png'
import { svgCommand } from './render/svg'

export const renderCommand = define({
  name: 'render',
  description: 'Render an emoji in various formats',
  subCommands: {
    ansi: ansiCommand,
    csv: csvCommand,
    ico: icoCommand,
    image: imageCommand,
    json: jsonCommand,
    png: pngCommand,
    svg: svgCommand,
  },
  run: () => {
    console.log('run "serenity-emoji render --help" for available formats')
  },
})
