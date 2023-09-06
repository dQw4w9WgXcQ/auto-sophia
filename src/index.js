"use strict"
import puppeteer from "puppeteer-extra"
import dotenv from "dotenv"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import ReplPlugin from "puppeteer-extra-plugin-repl"
import { loadAuthToken, saveAuthToken } from "./util.js"
import { DecodeError, getAnswer } from "./prompt.js"

dotenv.config()

export const COURSE_NAME = process.env.COURSE_NAME
if (!COURSE_NAME) throw new Error("no COURSE_NAME in .env")

puppeteer.use(StealthPlugin())
puppeteer.use(ReplPlugin())

// let chromePath
// if (process.platform === "win32") {
//   chromePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
// } else {
//   chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
// }

let browser = await puppeteer.launch({
  headless: false,
  // executablePath: chromePath,
})
let page = await browser.newPage()
page.setDefaultTimeout(7500)

let authToken = loadAuthToken()
if (authToken) {
  console.log(authToken)
  await page.setCookie(authToken)
}

try {
  while (true) {
    await page.goto("https://app.sophia.org/")

    if ((await page.title()).includes("Sign In")) {
      await login()
    }

    await page.goto(`https://app.sophia.org/spcc/${COURSE_NAME}`)

    await sleep(2000)

    if (!(await openNextSection())) {
      await page.waitForSelector(".assessment-player", { timeout: 60000 })
      console.log("found assessment player")
    }

    switch (await getSectionType()) {
      case "milestone": {
        while (true) {
          await sleep(1000 + Math.floor(Math.random() * 1000))

          if (await isCompleteMilestone()) {
            console.log("milestone complete")
            continue
          }

          let questionHtml = await getMilestoneQuestionHtml()
          console.log(questionHtml)

          let answerHtmls = await getMilestoneAnswerHtmls()
          console.log(answerHtmls)

          let answerIdx
          try {
            answerIdx = await getAnswer(questionHtml, answerHtmls, true)
          } catch (e) {
            if (!(e instanceof DecodeError)) {
              throw e
            }

            console.log("failed to answer, going to next question")
            let nextQuestionArrow = await (
              await page.waitForSelector(
                ".flexible-assessment-header__navigator-right-arrow-assessment"
              )
            ).waitForSelector(".right-arrow")
            await click(nextQuestionArrow)
            continue
          }

          await selectAnswerMilestone(answerIdx)

          await submitAnswerMilestone()
        }

        break
      }

      case "challenge": {
        await sleep(1000) //idk if needed

        while (true) {
          await sleep(2000 + Math.floor(Math.random() * 1000))

          if (await isCompleteChallenge()) {
            console.log("challenge complete")
            break
          }

          if (await isAlreadyAnswered()) {
            console.log("already answered")
            await nextQuestion()
          } else {
            let questionHtml = await getChallengeQuestionHtml()
            console.log(questionHtml)

            let answerHtmls = await getChallengeAnswerHtmls()
            console.log(answerHtmls)
            try {
              let answerIdx = await getAnswer(questionHtml, answerHtmls, true)
              console.log(answerIdx)
              await selectAnswer(answerIdx)
            } catch (e) {
              if (!(e instanceof DecodeError)) {
                throw e
              }

              console.log("failed to answer, selecting B")
              await selectAnswer(1)
            }

            await submitAnswer()
          }
        }
      }
    }
  }
} catch (e) {
  console.log(e)
}

async function login() {
  while ((await page.title()) !== "Welcome to Sophia Learning") {
    await page.waitForNavigation({ timeout: 0 })
  }

  console.log("logged in")

  let currCookies = await page.cookies()
  currCookies.forEach((x) => {
    console.log(JSON.stringify(x, null, 4))
  })

  let authCookie = currCookies.find((it) => it.name === "auth_token")
  if (authCookie) {
    console.log("saving auth token " + JSON.stringify(authCookie))
    saveAuthToken(authCookie)
  } else {
    console.log("didn't find auth cookie")
  }
}

async function openNextSection() {
  let units = await page.$$(".competency-left-col")
  console.log(`found ${units.length} units`)

  for (let unit of units) {
    console.log()

    let assessments = await unit.$$(".assessment-item-wrapper")
    console.log(`${assessments.length} assessments`)

    for (let assessment of assessments) {
      console.log()

      let className = await (await assessment.getProperty("className")).jsonValue()

      console.log(`class name: ${className}`)

      if (!className.includes("assessment-item-wrapper")) {
        continue
      }

      let dataKmValue = await getAttribute(assessment, "data-km-value")
      console.log(`data-km-value: ${dataKmValue}`)

      if (!dataKmValue) {
        //milestone not open yet
        continue
      }

      if (dataKmValue.startsWith("challenge-")) {
        if (className.includes("visited")) {
          let attemptedIndicator = await assessment.waitForSelector(".svg-attempted-indicator")
          let attempted = await getAttribute(attemptedIndicator, "data-attempted")
          let total = await getAttribute(attemptedIndicator, "data-total-questions")

          console.log(`${attempted}/${total}`)

          if (attempted === total) {
            continue
          }
        } else {
          console.log("not visited")
        }

        let href = await getAttribute(assessment, "href")
        await page.goto(`https://app.sophia.org${href}`)
        return true
      }

      //gave up on trying to automate this.  open milestones manually
      // if (dataKmValue.startsWith("milestone-")) {
      //   let clazz = await getAttribute(assessment, "class")
      //   if (!clazz.includes("milestone-open-link")) continue
      //   let href = await getAttribute(assessment, "href")
      //   // await page.goto(`https://app.sophia.org${href}`)
      //   // await click(assessment)
      //   // await sleep(5000)
      //
      //   return false
      // }

      // if (dataKmValue.startsWith("practice-milestone-")) {
      //   let href = await getAttribute(assessment, "href")
      //   await page.goto(`https://app.sophia.org${href}`)
      //   return
      // }
    }
  }

  console.log("class done or need to open manually")
  return false
}

async function getSectionType() {
  let assessmentPlayerDiv = await page.waitForSelector(".assessment-player")

  if (await assessmentPlayerDiv.$(".milestone-two-cols-wrapper")) {
    return "milestone"
  }

  if (await assessmentPlayerDiv.$("#challenge-quiz-region")) {
    return "challenge"
  }

  throw new Error("cant determine section type")
}

//challenge
async function getChallengeQuestionHtml() {
  let questionSlideDiv = await page.$(".question-slide")
  let ele
  if (questionSlideDiv) {
    ele = await questionSlideDiv.$("#demo-bubble-1")
  } else {
    ele = await page.$(".question")
  }

  return await getInnerHTML(ele)
}

/**
 * @returns {Promise<string[]>}
 */
async function getChallengeAnswerHtmls() {
  let answerUl = await page.waitForSelector(".challenge-v2-answer__list")
  let answerLis = await answerUl.$$("li")
  let answerIsCorrectDivPromises = answerLis.map(async (answerLi) => {
    return await answerLi.waitForSelector(".challenge-v2-answer__iscorrect")
  })
  let answerIsCorrectDivs = await Promise.all(answerIsCorrectDivPromises)
  let answerHtmls = []
  for (let answerIsCorrectDiv of answerIsCorrectDivs) {
    let answerTextDiv = await answerIsCorrectDiv.waitForSelector(".challenge-v2-answer__text")
    // let letter = await getInnerText(await answerTextDiv.waitForSelector("span[class=letter]"))
    // console.log("letter: " + letter)

    let answerText = await getInnerHTML(await answerTextDiv.waitForSelector("div"))

    answerHtmls.push(answerText)
  }

  return answerHtmls
}

async function selectAnswer(idx) {
  let label = await page.waitForSelector(`label[for=answer-${idx}]`)
  let input = await label.waitForSelector("input[type=radio]")
  await click(input)
}

async function submitAnswer() {
  let container = await page.waitForSelector(".control-section")
  let submitButton = await container.waitForSelector(".f-button")
  await click(submitButton)
  await page.waitForSelector(".challenge-v2-answered-block")
}

async function isAlreadyAnswered() {
  let answeredBlockDiv = await page.$(".challenge-v2-answered-block")
  return answeredBlockDiv != null
}

async function nextQuestion() {
  let container = await page.waitForSelector(".control-section")
  let nextButton = await container.waitForSelector(".f-button")
  await click(nextButton)
}

async function isCompleteChallenge() {
  let wellDoneBannerBlock = await page.waitForSelector(".well-done-banner-flexible-block")
  let classAttribute = await getAttribute(wellDoneBannerBlock, "class")
  return classAttribute.includes("showed")
}

//milestone
async function getMilestoneQuestionHtml() {
  let asdf = await page.$(".assessment-question-block")
  let questionDiv = await asdf.$(".question")
  return await getInnerHTML(questionDiv)
}

async function getMilestoneAnswerHtmls() {
  let ul = await page.waitForSelector(".multiple-choice-answer-fields")
  let lis = await ul.$$("li")
  let eles = lis.map(async (li) => {
    let answerInputLabel = await li.waitForSelector(".milestone-answer__input")
    let div = await answerInputLabel.$("div")
    return div
  })

  let answerHtmls = []
  for (let elePromise of eles) {
    let ele = await elePromise
    let html = await getInnerHTML(ele)
    answerHtmls.push(html)
  }

  return answerHtmls
}

async function selectAnswerMilestone(idx) {
  let label = await page.waitForSelector(`label[for=answer_cb_${idx}]`)
  let input = await label.waitForSelector("input[type=radio]")
  await click(input)
}

async function submitAnswerMilestone() {
  let container = await page.waitForSelector(".submit_block")
  let submitButton = await container.waitForSelector(".f-button")
  await click(submitButton)
  await sleep(3000)
}

async function isCompleteMilestone() {
  try {
    await page.waitForSelector(".fancybox-is-open", { timeout: 1000 })
    return true
  } catch (e) {
    return false
  }
}

//util
async function getAttribute(ele, attributeName) {
  return await page.evaluate((x, y) => x.getAttribute(y), ele, attributeName)
}

async function getInnerText(ele) {
  return await page.evaluate((x) => x.innerText, ele)
}

async function getInnerHTML(ele) {
  return await page.evaluate((x) => x.innerHTML, ele)
}

async function click(ele) {
  await page.evaluate((x) => x.click(), ele)
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
