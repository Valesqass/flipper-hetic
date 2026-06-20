import { encodeMessage, decodeMessage } from "./protocol.js";

/**
 * Client temps reel : facade minimale au-dessus du `WebSocket` natif du
 * navigateur, qui offre une API facon Socket.IO (`on` / `off` / `emit`) + une
 * reconnexion automatique.
 *
 * Evenements de cycle de vie emis localement :
 *   - "connect"        : connexion etablie
 *   - "disconnect"     : connexion fermee (une reconnexion est planifiee)
 *   - "connect_error"  : echec/erreur de connexion
 */
export function createRealtimeClient(url, { reconnectDelayMs = 1000 } = {}) {
  const listeners = new Map();
  let ws = null;
  let reconnectTimer = null;
  let closedByUser = false;

  function emitLocal(event, data) {
    const set = listeners.get(event);
    if (!set) return;
    for (const handler of [...set]) handler(data);
  }

  function scheduleReconnect() {
    if (reconnectTimer || closedByUser) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelayMs);
  }

  function connect() {
    ws = new WebSocket(url);
    ws.onopen    = () => emitLocal("connect");
    ws.onmessage = (event) => { const msg = decodeMessage(event.data); if (msg) emitLocal(msg.event, msg.data); };
    ws.onerror   = () => emitLocal("connect_error");
    ws.onclose   = () => { emitLocal("disconnect"); scheduleReconnect(); };
  }

  connect();

  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return this;
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
      return this;
    },
    emit(event, data) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(encodeMessage(event, data));
      return this;
    },
    disconnect() {
      closedByUser = true;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      ws?.close();
    },
  };
}
