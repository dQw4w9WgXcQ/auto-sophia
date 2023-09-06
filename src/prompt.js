"use strict"
import dotenv from "dotenv"
import { Configuration, OpenAIApi } from "openai"

dotenv.config()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_API_KEY) throw new Error("no OPENAI_API_KEY in .env")

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export async function prompt(content, gpt4) {
  let model
  if (true || gpt4) {
    model = "gpt-4"
  } else {
    model = "gpt-3.5-turbo"
  }

  let chatCompletion = await openai.createChatCompletion({
    model,
    max_tokens: 2,
    temperature: 0,
    messages: [{ role: "user", content }],
  })

  return chatCompletion.data.choices[0].message.content
}

export async function getAnswer(questionHtml, answerHtmls, gpt4) {
  let possiblyNotEnoughInfo = questionHtml.includes("https://postgres.sophia.org/")

  let encoded = encode(questionHtml, answerHtmls, possiblyNotEnoughInfo)
  let res1 = prompt(encoded, gpt4)
  // let res2 = prompt(encoded, gpt4)

  let decoded1 = decode(await res1)
  return decoded1
  let decoded2 = decode(await res2)

  if (decoded1 !== decoded2) {
    throw new Error(`decoded mismatch ${decoded1} ${decoded2}`)
  }

  console.log("decoded: " + decoded1)

  return decoded1
}

let lastPrompt = null

function encode(questionHtml, answerHtmls, possiblyNotEnoughInfo) {
  let prompt = `${parseHtml(questionHtml)}

${encodeAnswer("A", answerHtmls[0])}

${encodeAnswer("B", answerHtmls[1])}

${encodeAnswer("C", answerHtmls[2])}

${encodeAnswer("D", answerHtmls[3])}`

  if (possiblyNotEnoughInfo) {
    prompt += `

E. Not enough information`
  }

  console.log("PROMPT:")
  console.log(prompt)

  if (lastPrompt === prompt)
    throw new Error("last prompt === prompt (prob stuck in loop answering same question)")

  lastPrompt = prompt

  return prompt
}

function encodeAnswer(letter, answerHtml) {
  if (answerHtml === undefined) {
    return ""
  }
  return letter + ". \n" + parseHtml(answerHtml) + "\n"
}

function parseHtml(html) {
  if (
    html.includes("data-mathml=") ||
    html.includes("<figure>") ||
    html.includes('<table class="redactable">')
  ) {
    let s = html
    s = s.replaceAll("<br>", "")
    s = s.replaceAll("</br>", "")
    s = s.replaceAll("<p>", "")
    s = s.replaceAll("</p>", "")
    s = s.replaceAll("&nbsp;", " ")
    return s
  }

  // return html
  let s = html
  s = s.replaceAll("<br>", "\n")
  s = s.replaceAll("</p>", "\n")
  s = s.replaceAll("&nbsp;", " ")
  s = s.replaceAll(/(<([^>]+)>)/gi, "") //https://www.geeksforgeeks.org/how-to-strip-out-html-tags-from-a-string-using-javascript/#
  return s.trim()
}

function decode(response) {
  console.log("RESPONSE:")
  console.log(response)

  if (!response.includes(".")) throw new DecodeError(`no '.' found in response: ${response}`)

  let s = response
  s = s.substring(0, s.indexOf("."))
  s = s.replace(new RegExp("[^a-zA-Z0-9 -]"), "").trim()

  switch (s) {
    case "A":
      return 0
    case "B":
      return 1
    case "C":
      return 2
    case "D":
      return 3
    default:
      throw new DecodeError("cant parse answer from: " + s)
  }
}

export class DecodeError extends Error {
  constructor(message) {
    super(message)
  }
}
