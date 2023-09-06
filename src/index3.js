"use strict"
import mathmltolatex from "mathml-to-latex"
import he from "he"
import { JSDOM } from "jsdom"

// const { Mathml2latex } = require('mathml-to-latex');

const mathml = `
    <img class="Wirisformula" data-mathml="«math xmlns=¨http://www.w3.org/1998/Math/MathML¨»«mo»(«/mo»«mi»g«/mi»«mo»§#8728;«/mo»«mi»f«/mi»«mo»)«/mo»«mo»(«/mo»«mi»x«/mi»«mo»)«/mo»«mo»=«/mo»«mo»§#8208;«/mo»«mn»6«/mn»«msup»«mi»x«/mi»«mn»2«/mn»«/msup»«mo»-«/mo»«mn»7«/mn»«/math»" alt="left parenthesis g ring operator f right parenthesis left parenthesis x right parenthesis equals short dash 6 x squared minus 7" src="/download/ckeditor/formulas/228639/data/formula.png">
    `

let xdd = he.decode(
  "«math xmlns=¨http://www.w3.org/1998/Math/MathML¨»«mo»(«/mo»«mi»g«/mi»«mo»§#8728;«/mo»«mi»f«/mi»«mo»)«/mo»«mo»(«/mo»«mi»x«/mi»«mo»)«/mo»«mo»=«/mo»«mo»§#8208;«/mo»«mn»6«/mn»«msup»«mi»x«/mi»«mn»2«/mn»«/msup»«mo»-«/mo»«mn»7«/mn»«/math»"
)
console.log(xdd)

let weed = mathmltolatex.MathMLToLaTeX.convert(xdd)
console.log(weed)

let dom = new JSDOM(
  "«math xmlns=¨http://www.w3.org/1998/Math/MathML¨»«mo»(«/mo»«mi»g«/mi»«mo»§#8728;«/mo»«mi»f«/mi»«mo»)«/mo»«mo»(«/mo»«mi»x«/mi»«mo»)«/mo»«mo»=«/mo»«mo»§#8208;«/mo»«mn»6«/mn»«msup»«mi»x«/mi»«mn»2«/mn»«/msup»«mo»-«/mo»«mn»7«/mn»«/math»",
  { contentType: "text/xml" }
)
console.log(dom.window.document.querySelector("p").textContent) // "Hello world"
