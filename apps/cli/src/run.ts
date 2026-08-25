import completion from '@gunshi/plugin-completion'
import { cli, isArgsValidationError, isCommandNotFoundError } from 'gunshi'
import type { CliOptions, Command, DefaultGunshiParams, GunshiParams } from 'gunshi'

import pkg from '../package.json' with { type: 'json' }
import { fail } from './libs/fail'

const isUsageFailure = (failure: unknown) => {
  return isArgsValidationError(failure) || isCommandNotFoundError(failure)
}

const usageFailuresOf = (error: unknown) => {
  if (!(error instanceof AggregateError)) return null

  const failures = error.errors.filter(isUsageFailure)
  return failures.length === error.errors.length ? failures : null
}

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
      renderHeader: null,
      renderValidationErrors: null,
      subCommands: options.subCommands,
      plugins: [completion()],
    })
  } catch (error) {
    const failures = usageFailuresOf(error)
    if (failures === null) throw error

    return fail(failures.map((failure) => failure.message).join('\n'))
  }
}
