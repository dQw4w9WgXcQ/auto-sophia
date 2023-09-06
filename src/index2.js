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

let context = `
Find the derivative of f left parenthesis x right parenthesis equals 3 x to the power of 5 sin x plus 8 cos x.


`

let res = await prompt(context, true)
console.log(res)

export async function prompt(content, gpt4) {
  let model
  if (gpt4) {
    model = "gpt-4"
  } else {
    model = "gpt-3.5-turbo"
  }

  let chatCompletion = await openai.createChatCompletion({
    model,
    // max_tokens: 2,
    temperature: 0,
    messages: [{ role: "user", content }],
  })

  return chatCompletion.data.choices[0].message.content
}
