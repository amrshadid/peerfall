/** FRR's source tree at the release the Machine runs, so a card's paths show the code that really ran. */
export const FRR_SOURCE_BASE = 'https://github.com/FRRouting/frr/blob/frr-10.6.1/'

/** How the Field Guide says where a command is typed. */
export const FIELD_GUIDE_WHERE: Readonly<Record<'vtysh' | 'shell', string>> = {
  vtysh: 'vtysh',
  shell: 'Linux shell',
}
