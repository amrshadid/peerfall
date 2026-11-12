import { hrefOf } from '@shared/navigation'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NotFoundContainer } from './NotFoundContainer'

describe('NotFoundContainer', () => {
  it('says the page does not exist and links back to the title', () => {
    const html = renderToStaticMarkup(<NotFoundContainer />)
    expect(html).toContain('No such page')
    expect(html).toContain(`href="${hrefOf({ name: 'title' })}"`)
  })
})
