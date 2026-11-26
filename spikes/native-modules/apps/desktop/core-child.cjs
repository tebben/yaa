'use strict';
// Runs in an Electron utilityProcess, the proposed home of core.
const { probeAll } = require('@spike/core');
probeAll().then((r) => process.parentPort.postMessage(r));
