import { tokenizeInline } from '@shared/utils/text'

export interface InlineTextProps {
  text: string
}

/** Game text with real terms set in the code face, so players learn to spot real names. */
export function InlineText({ text }: InlineTextProps) {
  return (
    <>
      {tokenizeInline(text).map((token, index) => {
        // Tokens of one string never reorder.
        const key = `${index}-${token.kind}`
        switch (token.kind) {
          case 'code':
            return <code key={key}>{token.text}</code>
          case 'strong':
            return <b key={key}>{token.text}</b>
          case 'em':
            return <em key={key}>{token.text}</em>
          default:
            return <span key={key}>{token.text}</span>
        }
      })}
    </>
  )
}
