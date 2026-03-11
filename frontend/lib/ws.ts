// WebSocket is not used in crontab mode
// All communication is via HTTP API

export const ws = {
  connect: () => {
    console.log('WebSocket not used in crontab mode');
  },
  disconnect: () => {},
  onLog: (_callback: (content: string) => void) => {},
};
