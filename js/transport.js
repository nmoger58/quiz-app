/**
 * Transport Abstraction Layer
 * Supports Mode A (Local BroadcastChannel + localStorage events)
 * and Mode B (WebSocket for separate device synchronization)
 */

class QuizTransport {
  constructor() {
    this.sessionId = null;
    this.role = 'teacher'; // 'teacher' or 'projector'
    this.broadcastChannel = null;
    this.ws = null;
    this.wsConnected = false;
    this.localConnected = false;
    this.listeners = [];
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.heartbeatTimer = null;
  }

  connect(sessionId, role = 'teacher') {
    this.sessionId = sessionId;
    this.role = role;

    // 1. Setup Local BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.broadcastChannel) {
          this.broadcastChannel.close();
        }
        this.broadcastChannel = new BroadcastChannel(`kannada_quiz_${sessionId}`);
        this.broadcastChannel.onmessage = (event) => {
          this._handleIncomingMessage(event.data, 'broadcast');
        };
        this.localConnected = true;
      }
    } catch (e) {
      console.warn("BroadcastChannel not supported, using storage fallback", e);
    }

    // Storage fallback for cross-tab communication
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === `kannada_quiz_event_${sessionId}` && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this._handleIncomingMessage(data, 'storage');
          } catch (err) {}
        }
      });
    }

    // 2. Setup WebSocket for separate devices
    this._connectWebSocket();

    this._notifyStatusChange();
  }

  _connectWebSocket() {
    if (typeof window === 'undefined' || !window.location) return;

    // Determine WS URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // If running via file:// protocol, WS server is typically localhost:3000
    const wsUrl = host 
      ? `${protocol}//${host}/ws?sessionId=${this.sessionId}&role=${this.role}`
      : `ws://localhost:3000/ws?sessionId=${this.sessionId}&role=${this.role}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.wsConnected = true;
        this.reconnectAttempts = 0;
        this._notifyStatusChange();
        
        // Handshake
        this.ws.send(JSON.stringify({
          type: 'REGISTER',
          sessionId: this.sessionId,
          role: this.role,
          timestamp: Date.now()
        }));

        // Keepalive ping
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 15000);
      };

      this.ws.onmessage = (msgEvent) => {
        try {
          const data = JSON.parse(msgEvent.data);
          if (data.type === 'PONG') return;
          this._handleIncomingMessage(data, 'websocket');
        } catch (e) {
          console.warn("Invalid WS JSON", e);
        }
      };

      this.ws.onclose = () => {
        this.wsConnected = false;
        clearInterval(this.heartbeatTimer);
        this._notifyStatusChange();
        this._scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.wsConnected = false;
        this._notifyStatusChange();
      };
    } catch (e) {
      this.wsConnected = false;
      this._notifyStatusChange();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return; // Stop after max attempts to prevent thrashing
    }
    clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this._connectWebSocket();
    }, delay);
  }

  _handleIncomingMessage(message, source) {
    if (!message || message.sessionId !== this.sessionId) return;
    
    // Projector clients cannot accept control commands from other non-teacher clients
    this.listeners.forEach(cb => {
      try {
        cb(message, source);
      } catch (e) {
        console.error("Transport listener error:", e);
      }
    });
  }

  send(message) {
    if (!message) return;
    message.sessionId = this.sessionId;
    message.senderRole = this.role;
    message.timestamp = Date.now();

    // 1. Broadcast locally (for same browser tabs)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {}
    }

    // Storage fallback
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          `kannada_quiz_event_${this.sessionId}`,
          JSON.stringify({ ...message, _ts: Date.now() + Math.random() })
        );
      } catch (e) {}
    }

    // 2. Send via WebSocket if connected (for remote projector devices)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (e) {
        console.warn("WS send error", e);
      }
    }
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  getConnectionStatus() {
    let mode = 'local';
    let status = 'connected';

    if (this.wsConnected) {
      mode = 'websocket';
      status = 'connected';
    } else if (this.localConnected) {
      mode = 'local_tabs';
      status = 'connected';
    } else {
      status = 'disconnected';
    }

    return {
      mode,
      status,
      wsConnected: this.wsConnected,
      localConnected: this.localConnected,
      role: this.role,
      sessionId: this.sessionId
    };
  }

  _notifyStatusChange() {
    const status = this.getConnectionStatus();
    this.listeners.forEach(cb => {
      try {
        cb({ type: 'TRANSPORT_STATUS_CHANGED', payload: status });
      } catch (e) {}
    });
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeatTimer);
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsConnected = false;
    this.localConnected = false;
    this._notifyStatusChange();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { QuizTransport };
}
