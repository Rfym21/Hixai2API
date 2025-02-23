const crypto = require('crypto')

const uuid = () => {
  return crypto.randomUUID()
}

const isJson = (str) => {
  try {
    JSON.parse(str)
    return true
  } catch (error) {
    return false
  }
}

const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = { uuid, isJson, sleep }
