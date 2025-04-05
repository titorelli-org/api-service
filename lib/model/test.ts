import path from 'node:path'
import pino from 'pino'

import { LolsAntispam } from './lib/cas/Lols'

const lolsAntispam = async () => {
  const lols = new LolsAntispam(path.join(__dirname, 'lols-test.sqlite3'), pino())

  {
    const isBanned = await lols.has(8064601006)

  if (isBanned === false)
    throw new Error('User with id 8064601006 is known spammer, but have undetected')
  }

  {
    const isBanned = await lols.has(351570844)
    
    if (isBanned === true)
      throw new Error('User with id 350570845 are not spammer')
  }
}

lolsAntispam()
  .catch(console.error.bind(console, 'error ='))

// import { GptRequestQueue } from './lib/GptRequestQueue'

// const gptRequestQueue = async () => {
//   const q = new GptRequestQueue(1.5, pino())

//   const makeRequest = async (requestId: number) => {
//     const resp = await q.fetch('https://functions.yandexcloud.net/d4etdrmsgg1gpc690t7l', {
//       method: 'POST',
//       body: JSON.stringify({
//         modelId: 'react_ru',
//         text: 'Это спам'
//       }),
//       headers: {
//         'Content-Type': "application/json"
//       }
//     })
    
//     const text = await resp?.text()
  
//     return text
//   }

//   console.time('parallel requests')

//   console.log(
//     await Promise.all([
//       makeRequest(1),
//       makeRequest(2),
//       makeRequest(3),
//       makeRequest(4),
//     ])
//   )

//   console.timeEnd('parallel requests')
// }

// gptRequestQueue()
//   .catch(console.error.bind(console, 'error ='))

// import path from 'node:path'
// import { unlinkSync } from 'node:fs'
// import { Totems } from './lib/Totems'
// import { ExactMatchModel } from './lib/models/ExactMatch'
// import type { LabeledExample } from './types'

// const totems = async () => {
//   const testFilename = path.join(__dirname, `totems-test_model.sqlite3`)

// const main = async () => {
//   const totems = new Totems(__dirname, 'test_model')

//   await totems.add(8888)
//   await totems.add(9999)

//   if ((await totems.has(8888)) !== true)
//     throw new Error('Totem has not be saved somehow')

//   if ((await totems.has(1010)) !== false)
//     throw new Error('Non-existing totems still exists somehoe')

//   await totems.revoke(9999)

//   if ((await totems.has(9999)) !== false)
//     throw new Error('Totem has not be removed')

//   unlinkSync(testFilename)
// }

// const performance = async () => {
//   console.group('performance testing')

//   const totems = new Totems(__dirname, 'test_model')

//   console.time('insertion')
//   for (let i = 0; i < 100000; i++) {
//     await totems.add(i)
//   }
//   console.timeEnd('insertion')

//   console.time('read')
//   for (let i = 0; i < 100000; i++) {
//     await totems.has(i)
//   }
//   console.timeEnd('read')

//   unlinkSync(testFilename)

//   console.groupEnd()
// }

// await main()
//   .catch(e => console.error(e))
//   // .then(performance)
//   .catch(e => console.error(e))
// }

// const exact = async () => {
//   const modelFilename = path.join(__dirname, 'test.sqlite3')

// const EXAMPLES: LabeledExample[] = [
//   { text: 'This is certanly a spam', label: 'spam' },
//   { text: 'This is absolutely a ham', label: 'ham' },
//   {
//     text: `Very long text to see if hash fits column. You want it, you know you want it, and you know you want me to give it to you. Right, gimme a Pepsi free. You got a permit for that? The hell you doing to my car? What's the meaning of this.

// Wow, ah Red, you look great. Everything looks great. 1:24, I still got time. Oh my god. No, no not again, c'mon, c'mon. Hey. Libyans. My name's Lorraine, Lorraine Baines. Oh, what I meant to day was- Hi. Precisely.

// he's an idiot, comes from upbringing, parents were probably idiots too. Lorraine, if you ever have a kid like that, I'll disown you. C'mon. We never would have fallen in love. No. Marty, such a nice name.

// That's good advice, Marty. Look, there's a rhythmic ceremonial ritual coming up. Good evening, I'm Doctor Emmet Brown, I'm standing here on the parking lot of- Time machine, I haven't invented any time machine. Okay, alright, Saturday is good, Saturday's good, I could spend a week in 1955. I could hang out, you could show me around.

// Yeah, yeah what are you wearing, Dave. Roads? Where we're going we don't need roads. Leave her alone, you bastard. Unfortunately no, it requires something with a little more kick, plutonium. Hey, Doc, we better back up, we don't have enough roads to get up to 88.

// Okay, alright, I'll prove it to you. Look at my driver's license, expires 1987. Look at my birthday, for crying out load I haven't even been born yet. And, look at this picture, my brother, my sister, and me. Look at the sweatshirt, Doc, class of 1984. Alright, I'm ready. Hey McFly, what do you think you're doing. What a nightmare. Why is she gonna get angry with you?

// Yeah, you got my homework finished, McFly? Aw yeah, everything is great. George, aren't you gonna kiss me? Um, yeah well I might have sort of ran into my parents. Pa, what is it? What is it, Pa?

// Because, you might regret it later in life. No. No, get out of town, my mom thinks I'm going camping with the guys. Well, Jennifer, my mother would freak out if she knew I was going up there with you. And I get this standard lecture about how she never did that kind of stuff when she was a kid. Now look, I think she was born a nun. Who is that guy. Give me a hand, Lorenzo. Ow, dammit, man, I sliced my hand.

// I'll get it back to you, alright? Did you hurt your head? Yeah, who are you? I'm gonna ram him. That's right, he's gonna be mayor.

// Okay, but I don't know what to say. What kind of date? I don't know, what do kids do in the fifties? Uncle Jailbird Joey? You okay, is everything alright? It's already mutated into human form, shoot it.

// Uh, well, okay Biff, uh, I'll finish that on up tonight and I'll bring it over first thing tomorrow morning. You have this thing hooked up to the car? Doc, you gotta help- Wow, you must be rich. Jesus.

// Mother, with Marty's parents out of town, don't you think he oughta spend the night, after all, Dad almost killed him with the car. We do now. Well, she's not doing a very good job. No, no, George, look, it's just an act, right? Okay, so 9:00 you're strolling through the parking lot, you see us struggling in the car, you walk up, you open the door and you say, your line, George. So tell me, future boy, who's president of the United States in 1985?

// Wow, you must be rich. I gotta go, uh, I gotta go. Thanks very much, it was wonderful, you were all great. See you all later, much later. Lorraine, are you up there? Uh, well, I haven't finished those up yet, but you know I figured since they weren't due till- George, buddy. remember that girl I introduced you to, Lorraine. What are you writing?

// Yeah. Don't worry. As long as you hit that wire with the connecting hook at precisely 88 miles per hour, the instance the lightning strikes the tower, everything will be fine. Where? Of course, the Enchantment Under The Sea Dance they're supposed to go to this, that's where they kiss for the first time. Right.

// Never mind that, never mind that now, never mind that, never mind- Whoa, wait, Doc. Uh, Lorraine. How did you know I was here? What did you say? Um, well it's a delorean, right?

// Hey Dad, George, hey, you on the bike. Uh, you mean nobody's asked you? Marty, one rejection isn't the end of the world. Give me a hand, Lorenzo. Ow, dammit, man, I sliced my hand. I haven't

// You want it, you know you want it, and you know you want me to give it to you. What the hell is a gigawatt? That's for messing up my hair. Well, they're your parents, you must know them. What are their common interests, what do they like to do together? Re-elect Mayor Goldie Wilson. Progress is his middle name.

// That Biff, what a character. Always trying to get away with something. Been on top of Biff ever since high school. Although, if it wasn't for him- Marty, that was very interesting music. Breakfast. Erased from existence. Excuse me.

// Why not? Hello, Jennifer. Yeah. That's George McFly? Ho ho ho, look at it roll. Now we could watch Jackie Gleason while we eat.

// Can I go now, Mr. Strickland? Ronald Reagon, the actor? Then who's vice president, Jerry Lewis? I suppose Jane Wymann is the first lady. Thank god I found you. Listen, can you meet me at Twin Pines Mall tonight at 1:15? I've made a major breakthrough, I'll need your assistance. Well, uh, listen, uh, I really- Jennifer, oh are you a sight for sore eyes. Let me look at you.

// Yeah well look, Marvin, Marvin, you gotta play. See that's where they kiss for the first time on the dance floor. And if there's no music, they can't dance, and if they can't dance, they can't kiss, and if they can't kiss, they can't fall in love and I'm history. Oh yes sir. Right. Whoa, wait, Doc. About how far ahead are you going?

// George McFly? Oh, he's kinda cute and all, but, well, I think a man should be strong, so he could stand up for himself, and protect the woman he loves. Don't you? Yeah Mom, we know, you've told us this story a million times. You felt sorry for him so you decided to go with him to The Fish Under The Sea Dance. That's a great idea. I'd love to park. Yeah, sure, okay. Yeah I know, If you put your mind to it you could accomplish anything.

// Yeah man, that was good. Let's do another one. Whoa, wait, Doc. Chuck, Chuck, its' your cousin. Your cousin Marvin Berry, you know that new sound you're lookin for, well listen to this. On the night I go back in time, you get- Doc. Really.

// I have to tell you about the future. Which one's your pop? You got a real attitude problem, McFly. You're a slacker. You remind me of you father when he went her, he was a slacker too. Doc, Doc. Oh, no. You're alive. Bullet proof vest, how did you know, I never got a chance to tell you. About all that talk about screwing up future events, the space time continuum. Hello.`,
//     label: 'ham'
//   },
// ]

// const main = async () => {
//    const modelFilename = path.join(__dirname, "exact-match-test_model")
  
//   const model = new ExactMatchModel('test_model', modelFilename)

//   await model.trainBulk(EXAMPLES)

//   for (const e of EXAMPLES) {
//     const p = await model.predict(e)

//     if (!p)
//       throw new Error('Prediction not maked')

//     if (p.value !== e.label)
//       throw new Error('Predicted incorrect labelss')
//   }

//   const p2 = await model.predict({ text: 'This is non-example' })

//   if (p2 != null)
//     throw new Error('Non-example makes prediction')
// }
// }
