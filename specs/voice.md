# 语音前端对接说明

最后更新：2026-04-14

这份文档面向前端，描述语音能力的完整接口调用链路、返回结构和前端处理方式。

本说明只讲“怎么对接”，不讲底层表结构。

---

## 1. 语音能力总链路

语音能力分成三条链路：

1. 实时后文件归档链路
2. 实时转写链路
3. 笔记详情聚合链路

### 1.1 实时结束后的文件归档链路

前端流程：

1. 先完成实时转录
2. 转录完成或发生异常后，上传本次音频文件
3. 拿到 `fileId`
4. 若该文件来自某次实时会话，同时保留 `sessionId`
5. 后续访问文档详情时，通过 `sessionId` 和 `fileId` 还原页面关系

### 1.2 实时转写链路

前端流程：

1. 创建实时会话
2. 建立 WebSocket
3. 持续发送音频二进制流
4. 收到 partial 草稿
5. 静音后收 segment 卡片
6. 完成后调用 finish
7. 刷新笔记详情

### 1.3 笔记详情聚合链路

前端流程：

1. 拉取笔记详情
2. 读取 `voiceNote[]`
3. 读取 `voiceRealtimeSessions[]`
4. 用 `voiceNote[].sessionId` 关联对应的实时会话
5. 展示文件、会话和 cards
6. 按文件播放 / 按会话回放 / 按卡片展示

---

## 2. 统一概念

### 2.1 `fileId`

文件标识。

用途：

- 下载
- 播放
- 文件归档

### 2.2 `sessionId`

实时会话标识。

用途：

- 标识一次连续录音过程
- 标识该次实时转写的归属
- 标识该 session 下的卡片

### 2.3 `segmentIndex`

session 内第几张卡。

用途：

- 分段顺序
- 前端展示顺序
- 切卡定位

### 2.4 `transcript`

语音正文。

统一用于：

- 文件级文本
- session 最终文本
- card 文本
- partial 草稿

---

## 3. 文件上传链路

这条链路只负责“文件上传”。

### 3.1 上传文件

**POST** `/v1/note/voice-notes/upload`

#### 请求

- Query 参数：`noteId`
- Body：`multipart/form-data`
- 文件字段：`file`

#### 返回 `VoiceNoteUploadResponse`

```json
{
  "fileId": "f7d9b5a4-3c74-4b7f-8a0b-1f9a0d9a0e11",
  "url": "http://127.0.0.1:5002/files/f7d9b5a4-3c74-4b7f-8a0b-1f9a0d9a0e11",
  "duration": 12,
  "size": 442404,
  "storageType": "content"
}
```

#### 前端处理

1. 上传成功后保存 `fileId`
2. 不要在上传接口里期待转写结果
3. 上传完成后只做详情刷新或后续业务处理

### 3.2 获取文件内容

**GET** `/v1/note/voice-notes/files/{fileId}`

#### 返回

文件流，不是 JSON。

#### 前端处理

- 直接作为音频播放源
- 或作为下载链接

---

## 4. 实时转写链路

实时链路是长对话、连续录音的主入口。

### 4.1 创建实时会话

**POST** `/v1/note/voice-realtime/sessions`

#### 请求体 `CreateVoiceRealtimeSessionRequest`

```json
{
  "noteId": "4582f5c0-95fc-4587-bb54-e01d694038fa",
  "language": "zh_CN"
}
```

#### 请求字段

- `noteId`：关联笔记
- `language`：可选，推荐 `zh_CN` 或 `en_US`

#### 返回 `VoiceRealtimeSessionResponse`

```json
{
  "sessionId": "b1c1e90db722405589f70bb6d681bf70",
  "noteId": "4582f5c0-95fc-4587-bb54-e01d694038fa",
  "language": "zh_CN",
  "audioMimeType": "audio/webm",
  "status": "opened",
  "partialTranscript": null,
  "finalTranscript": null,
  "lastError": null,
  "receivedBytes": 0,
  "lastSequence": 0,
  "startedAt": "2026-04-14T10:00:00",
  "finishedAt": null,
  "createdAt": "2026-04-14T10:00:00",
  "updatedAt": "2026-04-14T10:00:00",
  "websocketPath": "/v1/note/voice-realtime/ws?sessionId=b1c1e90db722405589f70bb6d681bf70",
  "segmentSilenceMs": 1500
}
```

#### 前端处理

1. 拿到 `sessionId`
2. 拿到 `websocketPath`
3. 记住 `segmentSilenceMs`
4. 用 `sessionId` 建立 WebSocket

### 4.2 建立 WebSocket

**WS** `/v1/note/voice-realtime/ws`

#### 握手 Query 参数

```text
ws://127.0.0.1:5001/v1/note/voice-realtime/ws?sessionId={sessionId}&appId={appId}&userId={userId}&token={token}&mimeType=audio/webm
```

#### 参数说明

- `sessionId`：实时会话 ID
- `appId`：当前应用 ID
- `userId`：当前用户 ID
- `token`：当前登录态 token
- `mimeType`：音频流类型，建议与真实发送格式一致

#### 握手规则

- `appId/userId/token` 会做鉴权
- `sessionId` 必填
- `sessionId` 必须属于当前登录用户

### 4.3 发送音频二进制流

前端建立连接后，持续发送二进制音频帧。

#### 建议

- 单帧不要太大
- 保持连续发送
- `mimeType` 与实际采集格式一致

#### 服务端行为

- 收到二进制帧后进入内存缓冲
- 达到最小字节数后触发一次模型转写
- 转写结果以 `transcript.partial` 返回

### 4.4 暂停 / 恢复 / 结束

#### 暂停

**HTTP** `POST /v1/note/voice-realtime/sessions/{sessionId}/pause`

或 WebSocket 发送：

```json
{ "type": "pause" }
```

#### 恢复

**HTTP** `POST /v1/note/voice-realtime/sessions/{sessionId}/resume`

或 WebSocket 发送：

```json
{ "type": "resume", "mimeType": "audio/webm" }
```

#### 结束

**HTTP** `POST /v1/note/voice-realtime/sessions/{sessionId}/finish`

或 WebSocket 发送：

```json
{ "type": "finish" }
```

#### 前端处理

- 暂停时停止追加草稿
- 恢复后继续录音
- 结束时关闭录音 UI，并刷新详情页

---

## 5. 实时事件返回

WebSocket 服务端统一返回 JSON。

### 5.1 `session.ready`

表示连接建立成功，可以开始送音频。

```json
{
  "type": "session.ready",
  "sessionId": "b1c1e90db722405589f70bb6d681bf70",
  "status": "streaming",
  "transcript": null,
  "finalTranscript": null,
  "audioMimeType": "audio/webm",
  "receivedBytes": 0,
  "sequence": 0,
  "isFinal": false,
  "error": null,
  "segmentIndex": 0,
  "segmentTranscript": null,
  "silenceMs": null,
  "segmentSilenceMs": 1500
}
```

### 5.2 `transcript.partial`

表示当前草稿更新。

```json
{
  "type": "transcript.partial",
  "sessionId": "b1c1e90db722405589f70bb6d681bf70",
  "status": "streaming",
  "transcript": "你好，这里是。",
  "finalTranscript": null,
  "audioMimeType": "audio/webm",
  "receivedBytes": 64000,
  "sequence": 8,
  "isFinal": false,
  "error": null,
  "segmentIndex": 0,
  "segmentTranscript": null,
  "silenceMs": null,
  "segmentSilenceMs": 1500
}
```

前端处理：

- 更新当前草稿文本
- 不要新建正式卡片

### 5.3 `transcript.segment`

表示静音切卡成功，当前文本被提交成正式卡片。

```json
{
  "type": "transcript.segment",
  "sessionId": "b1c1e90db722405589f70bb6d681bf70",
  "status": "streaming",
  "transcript": null,
  "finalTranscript": "你好，这里是。",
  "audioMimeType": "audio/webm",
  "receivedBytes": 65536,
  "sequence": 9,
  "isFinal": false,
  "error": null,
  "segmentIndex": 1,
  "segmentTranscript": "你好，这里是。",
  "silenceMs": 2385,
  "segmentSilenceMs": 1500
}
```

前端处理：

- 将当前草稿收口为正式卡片
- 用 `segmentIndex` 排序
- 用 `segmentTranscript` 作为该卡正文
- `transcript.segment` 只是切卡事件，不是卡片编号

### 5.4 `session.paused`

```json
{
  "type": "session.paused",
  "sessionId": "session-id",
  "status": "paused"
}
```

### 5.5 `session.resumed`

```json
{
  "type": "session.resumed",
  "sessionId": "session-id",
  "status": "streaming"
}
```

### 5.6 `session.finished`

```json
{
  "type": "session.finished",
  "sessionId": "session-id",
  "status": "finished",
  "finalTranscript": "你好，这里是。\nHello. This is Hello. This is.",
  "isFinal": true
}
```

前端处理：

- 关闭录音 UI
- 刷新详情页
- 重新获取文件列表和会话列表

---

## 6. 笔记详情链路

### 6.1 获取详情

**GET** `/v1/note/notes/{noteId}

这是前端最关键的聚合接口。

#### 推荐返回树

```json
{
  "noteId": "4582f5c0-95fc-4587-bb54-e01d694038fa",
  "voiceNote": [
    {
      "fileId": "file-1",
      "sessionId": "session-1",
      "audioUrl": "/files/file-1",
      "transcript": "第一段文件级正文",
      "language": "zh_CN",
      "transcriptStatus": "completed"
    }
  ],
  "voiceRealtimeSessions": [
    {
      "sessionId": "session-1",
      "status": "finished",
      "language": "zh_CN",
      "audioMimeType": "audio/webm",
      "startedAt": "2026-04-14T10:00:00",
      "finishedAt": "2026-04-14T10:05:00",
      "finalTranscript": "整段最终正文",
      "cards": [
        {
          "segmentIndex": 1,
          "startOffsetMs": 0,
          "startTimeLabel": "00:00",
          "transcript": "第一张卡片"
        },
        {
          "segmentIndex": 2,
          "startOffsetMs": 5235,
          "startTimeLabel": "00:05",
          "transcript": "第二张卡片"
        }
      ]
    }
  ]
}
```

#### 层级说明

- `voiceNote[]`：文件列表
- `voiceRealtimeSessions[]`：会话列表
- `cards[]`：某个 session 下的分段列表

#### 前端展示建议

- 文件区展示 `voiceNote[]`
- 会话区展示 `voiceRealtimeSessions[]`
- 卡片区展示每个 session 下的 `cards[]`

### 6.2 文件播放 / 下载

拿到 `voiceNote[]` 后，前端根据 `fileId` 访问：

**GET** `/v1/note/voice-notes/files/{fileId}`

#### 返回

- 文件流，不是 JSON

#### 前端处理

- 音频播放
- 音频下载

---

## 7. 推荐的完整前端长链路

### 7.1 实时后文件归档链路

1. 创建实时会话
2. 获取 `sessionId`
3. 连接 WebSocket
4. 持续发送音频二进制流
5. 收到 `transcript.partial`，标识当前卡片是更新内容
6. 收到 `transcript.segment`，标识需要切换到下一个卡片
7. 监听 `session.finished` 或异常结束
8. 录音结束后上传本次音频文件
9. 获取 `fileId`
10. 若是同一条实时会话产物，同时保留 `sessionId`
11. 重新打开或者刷新页面时调用 GET /v1/note/notes/{noteId}
12. 用 `voiceNote[]` 展示文件
13. 用 `fileId` 播放音频 /v1/note/voice-notes/files/{{voiceFileId}}
14. 用 `voiceRealtimeSessions[]` 展示会话
15. 用 `cards[]` 展示分段

### 7.3 详情页链路

1. 拉详情
2. 读取 `voiceNote[]`
3. 读取 `voiceRealtimeSessions[]`
4. 用 `sessionId` 把文件和会话对齐
5. 展示文件和会话
6. 若有需要，展示 session 下 cards

---

## 8. 推荐前端处理规则

### 8.1 文件级规则

- `fileId` 是播放主入口
- `sessionId` 是回溯归属入口
- `transcript` 可以直接展示
- `transcriptStatus` 决定是否完成

### 8.2 会话级规则

- `sessionId` 是实时链路主入口
- `partialTranscript` 仅是草稿
- `finalTranscript` 是该 session 的最终快照
- `cards` 是最终分段列表

### 8.3 切卡规则

- 静音约 1.5s 切卡
- 切卡结果由 `transcript.segment` 体现
- 前端不自己猜切卡时机

---

## 9. 关键约定

1. 先实时转录，转录完成或异常后再上传文件。
2. 上传只做上传，不做转写。
3. 实时转写不先落文件。
4. 详情页按 session 聚合返回。
5. `voice_note_file.sessionId` 用于建立文件和 session 的显式关联。
6. `transcript` 是统一的正文术语。

---

## 10. 你接前端时最该记住的顺序

### 10.1 文件上传

`realtime -> upload -> detail`

### 10.2 实时录音

`create session -> websocket stream -> partial/segment -> finish -> detail`

### 10.3 详情展示

`detail -> voiceNote[] -> voiceRealtimeSessions[] -> cards[]`

---

## 11. 接口总览

### 11.1 会话与文件接口

- `POST /v1/note/voice-realtime/sessions`
- `WS /v1/note/voice-realtime/ws`
- `GET /v1/note/voice-realtime/sessions/{sessionId}`
- `POST /v1/note/voice-realtime/sessions/{sessionId}/pause`
- `POST /v1/note/voice-realtime/sessions/{sessionId}/resume`
- `POST /v1/note/voice-realtime/sessions/{sessionId}/finish`
- `POST /v1/note/voice-notes/upload`
- `GET /v1/note/voice-notes/files/{fileId}`
- `GET /v1/note/notes/{noteId}?withContent=true`

### 11.2 前端顺序

- 先创建实时 session
- 再连接 WebSocket 发送音频
- 收到 `transcript.partial` 更新草稿
- 收到 `transcript.segment` 新增卡片
- 结束后调用 `finish`
- 转录完成或异常后再上传文件
- 最后刷新详情页

---

## 12. WebSocket 状态机

### 12.1 事件含义

- `session.ready`：连接建立成功，可以开始发音频
- `transcript.partial`：当前草稿已更新
- `transcript.segment`：当前卡片已切分完成
- `session.paused`：当前会话已暂停
- `session.resumed`：当前会话已恢复
- `session.finished`：当前会话已结束
- `session.failed`：当前会话发生异常

### 12.2 前端处理

- `partial` 只更新当前卡片草稿
- `segment` 直接落一张正式卡片
- `paused` 禁止继续发送音频
- `resumed` 恢复录音按钮状态
- `finished` 关闭录音 UI 并刷新详情
- `failed` 显示错误信息并允许重试

---

## 13. 字段映射

### 13.1 文件层

- `fileId`：播放和下载主入口
- `audioUrl`：文件访问地址
- `audioSize`：文件大小
- `audioDuration`：文件时长
- `storageType`：存储类型
- `sessionId`：该文件关联的实时会话

### 13.2 会话层

- `sessionId`：实时会话标识
- `status`：会话状态
- `partialTranscript`：当前草稿
- `finalTranscript`：最终快照
- `receivedBytes`：累计收音频字节数
- `lastSequence`：最新序号
- `startedAt` / `finishedAt`：起止时间

### 13.3 卡片层

- `segmentIndex`：卡片序号
- `startOffsetMs`：时间轴偏移
- `transcript`：卡片正文

---

## 14. 错误场景

- WS 连接失败
- 鉴权失败
- 音频上传失败
- note 已软删除，不允许新增语音
- note 已硬删除，详情不可再访问
- session 已结束后继续发音频
- 文件下载失败
- 详情接口失败

### 14.1 前端兜底

- WS 失败时提示可重试
- 上传失败时保留 session 结果
- note 被软删除时隐藏新增语音入口
- note 被硬删除时清空语音展示
- 详情失败时至少保留本地已收集结果

---

## 15. 前端联调用例

### 15.1 录音开始

1. 确认 note 处于 active
2. 创建 `session`
3. 保存 `sessionId`
4. 建立 WebSocket

### 15.2 录音过程中

1. 持续发送音频二进制
2. 监听 `transcript.partial`
3. 监听 `transcript.segment`
4. 更新卡片列表

### 15.3 录音结束

1. 调 `finish`
2. 等待 `session.finished`
3. 上传本次音频文件
4. 保存 `fileId`

### 15.4 页面刷新

1. 拉笔记详情
2. 读 `voiceNote[]`
3. 读 `voiceRealtimeSessions[]`
4. 用 `sessionId` 串起文件和会话
5. 用 `cards[]` 回填卡片
