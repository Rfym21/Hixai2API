const axios = require('axios')

class Chat {
  constructor() {
  }

  async createChat(token) {

    try {
      const response = await axios.post(`https://hix.ai/api/trpc/hixChat.createChat?batch=1`,
        {
          "0": {
            "json": {
              "title": `${new Date().toLocaleString()} New Chat`,
              "botId": 85426
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `__Secure-next-auth.session-token=${token}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
            'Referer': 'https://hix.ai/',
            'Origin': 'https://hix.ai',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site'
          }
        }
      )
      return response.data[0].result.data.json.id
    } catch (error) {
      console.log("Token可能已失效，创建聊天失败!!!")
      return null
    }
  }

  async parserMessagesMode(messages) {
    try {
      const userMessages = messages.filter(item => item.role === 'user' || item.role === 'assistant')
      const assistantMessages = messages.filter(item => item.role === 'assistant')
      const systemMessages = messages.filter(item => item.role === 'system').map(item => item.content).join('\n')
      if (userMessages.length === 1) {
        let newMessage = `
      ${systemMessages ? `<system>\n${systemMessages}</system>\n` : ''}

      ${JSON.stringify(userMessages[userMessages.length - 1].content)}
      `
        return {
          status: 200,
          message: newMessage,
          chatId: null,
        }
      } else {
        const signRegex = /\[ChatID: (.*?)\]/
        const sign = assistantMessages[assistantMessages.length - 1].content.match(signRegex)
        if (sign) {
          const chatId = sign[1].replace('[ChatID: ', '').replace(']', '')
          return {
            status: 200,
            message: userMessages[userMessages.length - 1].content,
            chatId: chatId,
          }
        } else {
          return this.createForgeChat(messages)
        }
      }
    } catch (error) {
      return {
        status: 500,
        message: null,
        chatId: null,
      }
    }
  }

  async createForgeChat(messages) {
    let newMessage = `
    ${JSON.stringify(messages.filter(item => item.role === 'system').map(item => item.content).join('\n')) ? `<system>\n${JSON.stringify(messages.filter(item => item.role === 'system').map(item => item.content).join('\n'))}\n</system>\n` : ''}

    <history>
    ${JSON.stringify(messages.filter(item => item.role === 'user' || item.role === 'assistant').map(item => item.content).join('\n'))}
    </history>

    ${messages[messages.length - 1].content}
  `
    return {
      status: 200,
      message: newMessage,
      chatId: null,
    }
  }

  async sendMessage(chatId, message, token) {
    console.log(chatId)
    try {
      const response = await axios.post(`https://hix.ai/api/hix/chat`,
        {
          "chatId": chatId,
          "question": message,
          "fileUrl": "",
          "answer": "",
          "relatedQuestions": []
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `__Secure-next-auth.session-token=${token}`
          },
          responseType: 'stream'
        }
      )
      return {
        response: response.data,
        status: 200,
      }
    } catch (error) {
      if (error.response.status === 403) {
        return {
          response: null,
          status: 403
        }
      }
      return {
        response: null,
        status: error.response.status
      }
    }
  }

}

module.exports = Chat
