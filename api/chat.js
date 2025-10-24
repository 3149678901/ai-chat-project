// 引入依赖（确保package.json中已包含这些依赖）
const express = require('express');
const cors = require('cors');
const app = express();

// 中间件配置（处理跨域和JSON请求）
app.use(cors({
  origin: true, // 允许所有前端域名访问（生产环境可改为具体域名，如"https://你的Netlify地址.netlify.app"）
  methods: ['POST'],
  credentials: true
}));
app.use(express.json()); // 解析JSON请求体


// 核心：处理AI对话请求（POST /api/chat）
app.post('/chat', async (req, res) => {
  try {
    // 1. 验证请求参数
    const { message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: "请输入消息内容" });
    }

    // 2. 根据配置调用对应的AI服务（智谱或OpenAI）
    const aiService = process.env.AI_SERVICE || 'zhipu'; // 从环境变量获取AI服务类型
    let aiResponse = '';

    if (aiService === 'zhipu') {
      // 调用智谱AI（需在Vercel配置ZHIPU_API_KEY）
      const ZhipuAI = require('zhipuai'); // 智谱官方SDK
      const client = new ZhipuAI({ apiKey: process.env.ZHIPU_API_KEY });

      // 构造对话历史（包含上下文）
      const messages = [
        ...history.map(item => ({
          role: item.role, // 角色：user/assistant
          content: item.content // 内容
        })),
        { role: 'user', content: message } // 最新用户消息
      ];

      // 调用智谱glm-4模型（可替换为其他模型）
      const response = await client.chat.completions.create({
        model: 'glm-4',
        messages: messages,
        temperature: 0.7 // 生成随机性（0-1，值越高越随机）
      });

      aiResponse = response.choices[0]?.message?.content || '抱歉，未获取到回复';
    } 
    else if (aiService === 'openai') {
      // 调用OpenAI（需在Vercel配置OPENAI_API_KEY）
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // 构造对话历史
      const messages = [
        ...history.map(item => ({ role: item.role, content: item.content })),
        { role: 'user', content: message }
      ];

      // 调用gpt-3.5-turbo模型
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7
      });

      aiResponse = response.choices[0]?.message?.content || '抱歉，未获取到回复';
    } 
    else {
      return res.status(500).json({ error: "未配置有效的AI服务（请在环境变量设置AI_SERVICE为zhipu或openai）" });
    }

    // 3. 返回AI回复（包含上下文历史，方便前端展示）
    res.json({
      success: true,
      response: aiResponse,
      history: [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ]
    });

  } catch (error) {
    // 错误处理（打印日志+返回错误信息）
    console.error('AI对话出错：', error);
    res.status(500).json({ 
      error: "对话失败，请重试", 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});


// Vercel Serverless函数需要导出Express应用
module.exports = app;