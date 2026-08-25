import completion from '@gunshi/plugin-completion'
import { cli, isArgsValidationError, isCommandNotFoundError } from 'gunshi'
import type { CliOptions, Command, DefaultGunshiParams, GunshiParams } from 'gunshi'

import pkg from '../package.json' with { type: 'json' }

const isRenderedError = (error: unknown) =>
  error instanceof AggregateError &&
  error.errors.every((inner) => isArgsValidationError(inner) || isCommandNotFoundError(inner))

export const runCli = async <G extends GunshiParams = DefaultGunshiParams>(
  args: string[],
  entry: Command<G>,
  options: Pick<CliOptions<G>, 'subCommands'>,
) => {
  try {
    await cli(args, entry, {
      name: 'serenity-emoji',
      version: pkg.version,
      description: 'Toolbox for the SerenityOS emoji font',
      strict: true,
      subCommands: options.subCommands,
      plugins: [completion()],
    })
  } catch (error) {
    if (!isRenderedError(error)) throw error
    process.exit(1)
  }
}
