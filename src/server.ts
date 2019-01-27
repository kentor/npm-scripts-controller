import * as net from 'net';
import {spawn, ChildProcess} from 'child_process';
import {PayloadExtractor, Payload} from './types';
import {WSAEINVALIDPROCTABLE} from 'constants';

export function init(initPayload?: Payload) {
  const processes = new Map<
    string,
    {child: ChildProcess; promise: Promise<void>}
  >();

  if (initPayload) {
    handleStart(initPayload);
  }

  const server = net.createServer((c) => {
    console.log('[debug] client connected');

    c.on('data', (data) => {
      // TODO: handle json failures
      const json = JSON.parse(data.toString('utf8'));
      const payloadExtraction = PayloadExtractor.decode(json);
      if (payloadExtraction.isLeft()) {
        // TODO: Make this better
        console.log(
          `[debug] i dunno how to handle this ${JSON.stringify(
            json,
            null,
            '  ',
          )}`,
        );
      } else {
        const payload = payloadExtraction.value;
        switch (payload.command) {
          case 'start':
            return handleStart(payload);
          case 'stop':
            return handleStop(payload);
          case 'restart':
            return handleRestart(payload);
          case 'init':
            // Do nothing.. init shouldn't come to this point.
            return;
          default:
            ((x: never) => {})(payload.command);
        }
      }
    });

    c.on('end', () => {
      console.log('[debug] client disconnected');
    });
  });

  function handleStart(payload: Payload) {
    payload.args.forEach(start);
  }

  function handleStop(payload: Payload) {
    payload.args.forEach(stop);
  }

  function handleRestart(payload: Payload) {
    payload.args.forEach(restart);
  }

  function start(script: string) {
    if (processes.has(script)) {
      return;
    }

    console.log(`[debug] starting ${script}`);

    const child = spawn('npm', ['run', script]);

    const redirect = (data: Buffer) => {
      const lines = data
        .toString('utf8')
        .split('\n')
        .slice(0, -1);

      lines.forEach((line) => {
        console.log(`[${script}] ${line}`);
      });
    };
    child.stdout.on('data', redirect);
    child.stderr.on('data', redirect);

    child.on('exit', () => {
      console.log(`[debug] exiting ${script}`);
      processes.delete(script);
    });

    const promise = new Promise<void>((resolve, _reject) => {
      // TODO: Possibly insecure and dangerous?
      // TODO: Check that script exists in cwd's package json before running it
      child.on('exit', () => {
        resolve();
      });
    });

    processes.set(script, {
      child,
      promise,
    });
  }

  function stop(script: string) {
    const wrapper = processes.get(script);
    if (wrapper) {
      wrapper.child.kill();
    }
  }

  async function restart(script: string) {
    const wrapper = processes.get(script);
    if (wrapper) {
      stop(script);
      await wrapper.promise;
      start(script);
    } else {
      start(script);
    }
  }

  server.on('error', (err) => {
    throw err;
  });

  // TODO: Bind to a random port instead of 8124
  server.listen('8124', () => {
    console.log('[debug] server started');
  });
}

if (require.main === module) {
  init();
}
