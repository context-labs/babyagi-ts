#!/usr/bin/env node

import fs from 'node:fs/promises';
import { Command } from 'commander';
import { spinnerError, stopSpinner } from './cli/spinner.js';
import { init } from './cli/commands/init/index.js';
import { run } from './cli/commands/run/index.js';
import { BabyAGIConfig } from './types.js';

const program = new Command();
program.description('BabyAGI CLI Tool');
program.version('0.0.3');

program
  .command('init')
  .description(
    'Initialize project by creating a `babyagi.config.json` file in the current directory.',
  )
  .action(async () => {
    try {
      const config: BabyAGIConfig = JSON.parse(
        await fs.readFile('./babyagi.config.json', 'utf8'),
      );
      init(config);
    } catch (e) {
      init();
    }
  });

program
  .command('run')
  .description('Run a BabyAGI Agent')
  .action(async () => {
    let config: BabyAGIConfig;
    try {
      config = JSON.parse(await fs.readFile('./babyagi.config.json', 'utf8'));
    } catch (e) {
      await init();
      config = JSON.parse(await fs.readFile('./babyagi.config.json', 'utf8'));
    }

    run(config);
  });

/**
 * Listen for unhandled promise rejections
 */
process.on('unhandledRejection', function (err: Error) {
  console.error(err.stack);

  spinnerError(); // show an error spinner
  stopSpinner(); // stop the spinner
  program.error('', { exitCode: 1 }); // exit with error code 1
});

program.parse();
