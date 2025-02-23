const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const Chat = require('./lib/chat.js')
const { uuid, isJson } = require('./lib/tools')


const ChatManager = new Chat()

app.use(bodyParser.json({ limit: '32mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '32mb' }))

app.get("/v1/models", async (req, res) => {
  res.json({
    object: "list",
    data: [{
      "id": "deepseek-reasoner",
      "object": "model",
      "created": 1686935002,
      "owned_by": "hixai"
    }],
    object: "list"
  })
})

app.post("/v1/chat/completions", async (req, res) => {

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) {
    res.status(401).json({
      error: "未提供Token!!!"
    })
    return
  }

  const stream = req.body.stream || false
  let { message, chatId, status } = await ChatManager.parserMessagesMode(req.body.messages)
  if (status === 500) {
    res.status(500).json({
      error: "服务器服务错误!!!"
    })
    return
  }

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
  } else {
    res.setHeader('Content-Type', 'application/json')
  }

  const returnResponse = async (response, req, res, stream, chatId) => {
    let reasoningStatus = false
    let notStreamContent = ''
    const decoder = new TextDecoder('utf-8')

    const signText = `\n\n\n[ChatID: ${chatId}]\n`

    const StreamTemplate = {
      "id": `chatcmpl-${uuid()}`,
      "object": "chat.completion.chunk",
      "created": new Date().getTime(),
      "choices": [
        {
          "index": 0,
          "delta": {
            "content": null
          },
          "finish_reason": null
        }
      ]
    }

    response.on('data', (chunk) => {
      const decodeText = decoder.decode(chunk)

      const lists = decodeText.split('\n').filter(item => item.trim() !== '')

      for (const item of lists) {
        try {
          if (!item.includes('data')) {
            continue
          }

          const decodeJson = isJson(item.replace(/^data: /, '')) ? JSON.parse(item.replace(/^data: /, '')) : null
          let content = ''
          if (decodeJson === null || (decodeJson.reasoning_content === undefined && decodeJson.content === undefined && decodeJson.thinking_time === undefined)) {
            continue
          }
          content = decodeJson.content || decodeJson.reasoning_content
          if (reasoningStatus === false && decodeJson.reasoning_content) {
            content = `<think>\n${decodeJson.reasoning_content}`
            reasoningStatus = true
          }
          if (decodeJson.thinking_time) {
            content = `\n</think>\n`
          }
          if (content === undefined) {
            continue
          }

          if (stream) {
            StreamTemplate.choices[0].delta.content = content
            res.write(`data: ${JSON.stringify(StreamTemplate)}\n\n`)
          } else {
            notStreamContent += content
          }

        } catch (error) {
          // console.log(error)
          res.status(500)
            .json({
              error: "服务错误!!!"
            })
        }
      }
    })

    response.on('end', () => {
      if (stream) {
        StreamTemplate.choices[0].delta.content = signText
        res.write(`data: ${JSON.stringify(StreamTemplate)}\n\n`)
        res.write(`data: [DONE]\n\n`)
        res.end()
      } else {
        notStreamContent += signText
        const bodyTemplate = {
          "id": `chatcmpl-${uuid()}`,
          "object": "chat.completion",
          "created": new Date().getTime(),
          "model": req.body.model,
          "choices": [
            {
              "index": 0,
              "message": {
                "role": "assistant",
                "content": notStreamContent
              },
              "finish_reason": "stop"
            }
          ],
          "usage": {
            "prompt_tokens": 1024,
            "completion_tokens": notStreamContent.length,
            "total_tokens": 1024 + notStreamContent.length
          }
        }
        res.json(bodyTemplate)
      }
    })
  }

  for (let i = 0; i < 3; i++) {
    try {

      if (!chatId) {
        chatId = await ChatManager.createChat(token)
        if (!chatId) {
          res.status(500).json({
            error: "创建聊天失败!!!"
          })
          return
        }
      }

      let { response, status } = await ChatManager.sendMessage(chatId, message, token, stream)
      if (status === 200 && response) {
        await returnResponse(response, req, res, stream, chatId)
        return
      } else if (status === 403) {
        message = await ChatManager.createForgeChat(req.body.messages)
        chatId = null
      } else {
        res.status(500).json({
          error: "请求发送失败!!!"
        })
        return
      }

    }
    catch (error) {
      res.status(500).json({
        error: "服务器服务错误!!!"
      })
      return
    }

  }

  res.status(500).json({
    error: "多次尝试后依旧失败!!!"
  })

})


app.listen(8999, () => {
  console.log('Server is running on port 8999')
})


