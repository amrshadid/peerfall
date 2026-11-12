// The game's network on a Linux host. Usage, from the repository root, under Node 22:
//   node lab/lab.ts up               build and start the container, build the network, wait for OSPF
//   node lab/lab.ts fault on|off     drop every packet on the link the mission breaks, or stop
//   node lab/lab.ts capture [name…]  run the mission's scenarios and write lab/captures/
//   node lab/lab.ts lines            print the lines `up` and `fault` run, without running them
//   node lab/lab.ts down             stop and remove the container
import { capture, SCENARIOS } from '#lab/capture'
import {
  down,
  FAULT_ENDS,
  fault,
  faultLine,
  ROUTERS,
  requireRunning,
  routeAcross,
  setupLines,
  up,
  vtysh,
} from '#lab/network'

const [command, ...rest] = process.argv.slice(2)

function usage(): never {
  console.error(`usage: node lab/lab.ts up | fault on|off | capture [${SCENARIOS.join('|')}]… | lines | down`)
  process.exit(2)
}

async function main(): Promise<void> {
  switch (command) {
    case 'up': {
      await up()
      for (const router of ROUTERS) {
        console.log(`\n${router}# show ip ospf neighbor\n${vtysh(router, 'show ip ospf neighbor').output.trim()}`)
      }
      return
    }
    case 'fault': {
      const [state] = rest
      if (state !== 'on' && state !== 'off') {
        usage()
      }
      requireRunning()
      fault(state === 'on')
      for (const end of FAULT_ENDS) {
        console.log(`${end.router}: ${routeAcross(end)}`)
      }
      return
    }
    case 'capture': {
      const unknown = rest.filter((name) => !SCENARIOS.includes(name))
      if (unknown.length > 0) {
        usage()
      }
      await capture(rest.length > 0 ? rest : SCENARIOS)
      return
    }
    case 'lines': {
      console.log([...setupLines(), '', '# fault on', faultLine(true), '', '# fault off', faultLine(false)].join('\n'))
      return
    }
    case 'down': {
      down()
      return
    }
    default:
      usage()
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
