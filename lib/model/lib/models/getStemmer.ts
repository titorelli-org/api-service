import type { StemmerLanguage } from "../../types";
import {
  PorterStemmer,
  PorterStemmerEs,
  PorterStemmerFa,
  PorterStemmerFr,
  PorterStemmerIt,
  PorterStemmerNl,
  PorterStemmerNo,
  PorterStemmerPt,
  PorterStemmerRu,
  PorterStemmerSv,
} from 'natural'

export const getStemmer = (lang: StemmerLanguage) => {
  switch (lang) {
    case 'es': return PorterStemmerEs
    case 'fa': return PorterStemmerFa
    case 'fr': return PorterStemmerFr
    case 'it': return PorterStemmerIt
    case 'nl': return PorterStemmerNl
    case 'no': return PorterStemmerNo
    case 'pt': return PorterStemmerPt
    case 'ru': return PorterStemmerRu
    case 'sv': return PorterStemmerSv
    default: return PorterStemmer
  }
}
