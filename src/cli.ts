#!/usr/bin/env node
/**
 * 1) We want to launch a server if it's not launched
 * 2) Talk to the server given args
 * 3) Return a response from the server maybe?
 *
 * Maybe let's just focus on 2 first.
 */
import * as server from './server';
import {CommandExtractor, validCommands} from './types';
import {createConnection} from 'net';

const [_bin, _prog, commandFromCli, ...args] = process.argv;

const command = CommandExtractor.decode(commandFromCli).getOrElseL(() => {
  throw new Error(
    `${commandFromCli} is not a valid command. Need to use one of ${validCommands.join(
      ', ',
    )}`,
  );
});

const effectiveWorkingDirectory = process.cwd();
const payload = {
  cwd: effectiveWorkingDirectory,
  command,
  args,
};

if (command === 'init') {
  server.init(payload);
} else {
  // TODO: Check that args.length > 0 and then all of them are a corresponding key
  // in package.json's scripts.

  // Just use the current working directory as the effective working directory for
  // now. This might not always be the case if you're running this from deep in a
  // project.

  const c = createConnection(8124, 'localhost');
  c.on('connect', () => {
    c.write(JSON.stringify(payload));
    c.end();
  });
}
