// @ts-check

/** @typedef {import('../../src/types.ts').ChatEvent} ChatEvent */
/** @typedef {import('../../src/types.ts').Platform} Platform */

/** @typedef {{ platform: Platform, channel: string }} ChannelRef */

/**
 * The parts of a Socket.IO client socket this module uses.
 * The page creates the real socket with autoConnect switched off.
 * @typedef {object} SocketLike
 * @property {(event: string, handler: (...args: any[]) => void) => unknown} on
 * @property {(event: string, ...args: unknown[]) => Promise<unknown>} emitWithAck
 * @property {() => unknown} connect
 * @property {() => unknown} disconnect
 */

/**
 * @typedef {object} ConnectionOptions
 * @property {SocketLike} socket
 * @property {readonly ChannelRef[]} channels
 * @property {(event: ChatEvent) => void} onEvent
 * @property {(live: boolean) => void} [onStatus]
 * @property {(message: string) => void} [onError]
 */

/** @param {ConnectionOptions} options */
export function startConnection(options) {
  const { socket, channels, onEvent } = options;
  const onStatus = options.onStatus ?? (() => undefined);
  const onError = options.onError ?? (() => undefined);

  /** @param {ChannelRef} ref */
  async function subscribe(ref) {
    const label = `${ref.platform}/${ref.channel}`;
    try {
      const reply = /** @type {{ ok: boolean, error?: string }} */ (
        await socket.emitWithAck('subscribe', ref)
      );
      if (!reply.ok) onError(`${label}: ${reply.error ?? 'refused'}`);
    } catch {
      onError(`${label}: no reply from the server`);
    }
  }

  socket.on('connect', () => {
    onStatus(true);
    // The server forgets subscriptions when a connection drops, so subscribe on every (re)connect
    for (const ref of channels) void subscribe(ref);
  });
  socket.on('disconnect', () => onStatus(false));
  socket.on('chat-event', (event) => onEvent(event));

  // Connect only after every handler is attached, so no early event is missed
  socket.connect();

  return {
    stop() {
      socket.disconnect();
    },
  };
}
