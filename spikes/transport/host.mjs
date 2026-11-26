// Stand-in plugin host: echoes pings from the core over a port main brokered.
process.parentPort.on('message', (e) => {
  const port = e.ports[0];
  port.on('message', (ev) => port.postMessage(ev.data));
  port.start();
});
