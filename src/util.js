"use strict"
import fs from "fs"

export function saveAuthToken(cookie) {
  console.log(cookie)
  let s = JSON.stringify(cookie)
  console.log(s)
  fs.writeFileSync("sophia_auth_token.json", s, "utf8")
}

export function loadAuthToken() {
  if (fs.existsSync("sophia_auth_token.json")) {
    let json = fs.readFileSync("sophia_auth_token.json", "utf8")
    return JSON.parse(json)
  }

  return null
}
