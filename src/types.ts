import * as t from 'io-ts';

const commands = {
  init: null,
  restart: null,
  start: null,
  stop: null,
};
export const CommandExtractor = t.keyof(commands);
export type Command = t.TypeOf<typeof CommandExtractor>;
export const validCommands = Object.keys(commands);

export const PayloadExtractor = t.type({
  args: t.array(t.string),
  command: CommandExtractor,
  cwd: t.string,
});
export type Payload = t.TypeOf<typeof PayloadExtractor>;
