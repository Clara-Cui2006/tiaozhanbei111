import 'dotenv/config'
import * as lark from '@larksuiteoapi/node-sdk'
import { handleMessage } from './handlers/message'
import { startScheduledTasks } from './handlers/scheduled'

const appId = process.env.FEISHU_APP_ID!
const appSecret = process.env.FEISHU_APP_SECRET!

// 飞书 API 客户端（全局导出）
export const client = new lark.Client({ appId, appSecret, appType: lark.AppType.SelfBuild })

// 事件分发器
const dispatcher = new lark.EventDispatcher({}).register({
  'im.message.receive_v1': async (data: any) => {
    try {
      await handleMessage(data)
    } catch (e) {
      console.error('[消息处理失败]', e)
    }
  },
})

// 长连接启动
const wsClient = new lark.WSClient({ appId, appSecret, loggerLevel: lark.LoggerLevel.info })

wsClient.start({ eventDispatcher: dispatcher })
console.log('🤖 飞书机器人已启动（长连接模式）')

// 启动定时推送
startScheduledTasks()
