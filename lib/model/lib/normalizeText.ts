import { PorterStemmerRu } from "natural"
import linkify from 'linkify-string'
import { replace as nodeEmojiReplace } from 'node-emoji'

/**
 * 1. Транслитерирует на русский
 * 2. Прогоняет текст через PorterStemmerRu
 * 3. Заменяет все ссылки на --link--
 * 4. Заменяет все юзернеймы на --mention--
 * 5. Заменяет эмоджи на --emoji--
 */
export const normalizeText = (text: string) => {
  const withoutEmojis = replaceEmojis(text)
  const withoutLinks = replaceLinks(withoutEmojis)
  const withoutMentions = replaceMentions(withoutLinks)
  const inRussian = withoutMentions
    .split(' ')
    .map(word => {
      switch (word) {
        case '--mention--': return word;
        case '--emoji--': return word;
        case '--link--': return word;
        default:
          return translitToRussian(word)
      }
    })
    .join(' ')

  const stemmed = PorterStemmerRu
    .tokenizeAndStem(inRussian)
    .map(word => word.replace(/(mention|emoji|link)/g, (_, g1) => `--${g1}--`))
    .join(' ')

  return stemmed
}

const replaceMentions = (text: string) => {
  return text.replace(/\B@(?=\w{5,32}\b)[a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)*/gm, '--mention--')
}

const replaceEmojis = (text: string) => {
  return nodeEmojiReplace(text, '--emoji-- ')
}

const replaceLinks = (text: string) => {
  return linkify(text, {
    render() {
      return '--link--'
    }
  })
}

const translitToRussian = (text: string) => {
  let out = ''

  for (const ch of text) {
    out += translitCharacter(ch)
  }

  return out
}

const translitCharacter = (ch: string) => {
  switch (ch) {
    case 'A': return 'А'
    case 'a': return 'а'
    case 'B': return 'Б'
    case 'b': return 'б'
    case 'V': return 'В'
    case 'v': return 'в'
    case 'G': return 'Г'
    case 'g': return 'г'
    case 'D': return 'Д'
    case 'd': return 'д'
    case 'E': return 'Е'
    case 'e': return 'е'
    case 'E': return 'Ё'
    case 'e': return 'ё'
    case 'Zh': return 'Ж'
    case 'zh': return 'ж'
    case 'Z': return 'З'
    case 'z': return 'з'
    case 'I': return 'И'
    case 'i': return 'и'
    case 'Y': return 'Й'
    case 'y': return 'й'
    case 'K': return 'К'
    case 'k': return 'к'
    case 'L': return 'Л'
    case 'l': return 'л'
    case 'M': return 'М'
    case 'm': return 'м'
    case 'N': return 'Н'
    case 'n': return 'н'
    case 'O': return 'О'
    case 'o': return 'о'
    case 'P': return 'П'
    case 'p': return 'п'
    case 'R': return 'Р'
    case 'r': return 'р'
    case 'S': return 'С'
    case 's': return 'с'
    case 'T': return 'Т'
    case 't': return 'т'
    case 'U': return 'У'
    case 'u': return 'у'
    case 'F': return 'Ф'
    case 'f': return 'ф'
    case 'Kh': return 'Х'
    case 'kh': return 'х'
    case 'Ts': return 'Ц'
    case 'ts': return 'ц'
    case 'Ch': return 'Ч'
    case 'ch': return 'ч'
    case 'Sh': return 'Ш'
    case 'sh': return 'ш'
    case 'Sch': return 'Щ'
    case 'sch': return 'щ'
    case ' ': return ' '
    case '': return ''
    case 'Y': return 'Ы'
    case 'y': return 'ы'
    case 'E': return 'Э'
    case 'e': return 'э'
    case 'Yu': return 'Ю'
    case 'yu': return 'ю'
    case 'Ya': return 'Я'
    case 'ya': return 'я'
    case 'H': return 'Х'
    case 'h': return 'х'
    case 'J': return 'Дж'
    case 'j': return 'дж'
    default:
      return ch
  }
}
