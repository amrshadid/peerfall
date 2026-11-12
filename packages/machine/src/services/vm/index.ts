// vm.worker.ts is the worker's entry point, not a module to import: it starts a VM when loaded.
export {
  applyVmRouterConfig,
  connectVm,
  disconnectVm,
  onVmOutput,
  readVmMachineState,
  readVmRouterConfig,
  resizeVmTerminal,
  restartVmFrr,
  restoreVmHealthy,
  runVmControl,
  saveVmHealthy,
  selectVmRouter,
  sendToVm,
  setupVmNetwork,
  setVmFault,
  startVmProbe,
  stopVmProbe,
} from '#services/vm/vm-connection.service'
export { CONTROL_LOST, createVmControl } from '#services/vm/vm-control.service'
export { installVmFileCache, loadVmFile, resetVmFiles } from '#services/vm/vm-files.service'
export { readMachineState, restartRouterFrr } from '#services/vm/vm-inspect.service'
export { createVmSession } from '#services/vm/vm-session.service'
export { loadVmState, saveVmState } from '#services/vm/vm-state.service'
