# 实时语音对接说明

最后验证时间：2026-04-13
服务地址：`ws://127.0.0.1:5001/v1/note/voice-realtime/ws`

这份文档给前端对接实时语音转写使用，内容已经按当前真实服务行为整理。

## 1. 对接流程

### 1.1 创建实时会话

先调用：`POST /v1/note/voice-realtime/sessions`

请求体：

```json
{
  "noteId": "4582f5c0-95fc-4587-bb54-e01d694038fa",
  "language": "zh_CN"
}
```

`language` 只建议传两种标准值：

- `zh_CN`
- `en_US`

返回中拿到：

- `sessionId`
- `websocketPath`
- `segmentSilenceMs`

### 1.2 建立 WebSocket

连接地址：

```text
ws://127.0.0.1:5001/v1/note/voice-realtime/ws?sessionId={sessionId}&appId={appId}&userId={userId}&token={token}&mimeType=audio/webm
```

查询参数说明：

- `sessionId`：创建会话返回的 id
- `appId`、`userId`、`token`：当前登录态三元组
- `mimeType`：本次音频流类型，推荐和真实上传格式一致

### 1.3 推送音频流

- 前端建立连接后，按二进制帧持续发送麦克风音频。
- 推荐单帧不要太大，保持小块连续发送。
- 当前服务会在流式过程中持续返回 `transcript.partial`。

### 1.4 暂停与恢复

用户点击暂停按钮时，有两种方式，二选一即可：

- HTTP：`POST /v1/note/voice-realtime/sessions/{sessionId}/pause`
- WebSocket：发送 `{"type":"pause"}`

用户点击继续按钮时，也有两种方式，二选一即可：

- HTTP：`POST /v1/note/voice-realtime/sessions/{sessionId}/resume`
- WebSocket：发送 `{"type":"resume","mimeType":"audio/webm"}`

### 1.5 手动结束

现在整个会话结束只由前端触发，建议在用户点击“完成”时调用：

- HTTP：`POST /v1/note/voice-realtime/sessions/{sessionId}/finish`
- WebSocket：发送 `{"type":"finish"}`

结束后再进入后续文件上传、整理或详情刷新流程。

## 2. 前端分卡规则

当前服务端已经支持“短暂停顿切卡，长时间不自动结束”。

推荐前端按下面方式处理：

- 收到 `transcript.partial`：更新当前转写文本卡片草稿文本。
- 收到 `transcript.segment`：把当前转写文本卡片转成正式卡片。
- 收到 `session.paused`：保持当前最后一张卡片已展示，但不再追加转写。
- 收到 `session.resumed`：继续把后续转写追加到新的流式阶段。
- 收到 `session.finished`：结束当前会话，刷新详情页或重新拉取笔记详情。

## 3. WebSocket 事件

### 3.1 `session.ready`

建立连接成功后返回：

```json
{
  "type": "session.ready",
  "sessionId": "b1c1e90db722405589f70bb6d681bf70",
  "status": "streaming",
  "transcript": null,
  "finalTranscript": null,
  "audioMimeType": "audio/wav",
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

### 3.2 `transcript.partial`

实时草稿事件，前端用来刷新当前卡片内容。

真实示例：

```json
{
  "type": "transcript.partial",
  "sessionId": "b1c1e90db722405589f70bb6d681bf70",
  "status": "streaming",
  "transcript": "你好，这里是。",
  "finalTranscript": null,
  "audioMimeType": "audio/wav",
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

字段说明：

- `transcript`：当前正在说的这一段草稿文本
- `finalTranscript`：已经确认成段的历史文本
- `sequence`：服务端累计收到的音频帧序号

### 3.3 `transcript.segment`

当用户短时间停顿后，服务端会确认一张正式语音卡片。

真实示例：

```json
{
  "type": "transcript.segment",
  "sessionId": "b1c1e90db722405589f70bb6d681bf70",
  "status": "streaming",
  "transcript": null,
  "finalTranscript": "你好，这里是。",
  "audioMimeType": "audio/wav",
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

字段说明：

- `segmentIndex`：第几张语音卡片
- `segmentTranscript`：本张卡片最终文本
- `finalTranscript`：到当前为止所有正式段落的合并文本
- `silenceMs`：本次实际静默时长
- `segmentSilenceMs`：系统配置的切卡阈值，当前默认 `1500ms`

### 3.4 `session.paused`

```json
{
  "type": "session.paused",
  "sessionId": "session-id",
  "status": "paused"
}
```

### 3.5 `session.resumed`

```json
{
  "type": "session.resumed",
  "sessionId": "session-id",
  "status": "streaming"
}
```

### 3.6 `session.finished`

```json
{
  "type": "session.finished",
  "sessionId": "session-id",
  "status": "finished",
  "finalTranscript": "你好，这里是。\nHello. This is Hello. This is.",
  "isFinal": true
}
```

## 4. 详情页如何还原语音卡片

语音结束后，前端重新请求：`GET /v1/note/notes/{noteId}?withContent=true`

返回的 `voiceCards` 就是最终卡片列表。

真实示例：

```json
[
  {
    "id": 6,
    "segmentIndex": 1,
    "startOffsetMs": 0,
    "startTimeLabel": "00:00",
    "transcript": "你好，这里是。"
  },
  {
    "id": 7,
    "segmentIndex": 2,
    "startOffsetMs": 5235,
    "startTimeLabel": "00:05",
    "transcript": "Hello. This is Hello. This is."
  }
]
```

前端可以直接使用：

- `segmentIndex` 作为卡片顺序
- `startTimeLabel` 作为时间标签展示
- `transcript` 作为卡片正文
- `startOffsetMs` 作为播放器跳转或时间轴定位依据

## 5. 当前推荐配置

基于现有实现，建议优先使用这组配置：

- `voice.realtime.segment_silence_ms = 1500`
- `voice.realtime.poll_interval_ms = 500`
- `voice.realtime.min_transcribe_bytes = 16384`

含义：

- 说话中间停顿约 `1.5s`，生成一个正式卡片。
- 不再使用固定 `12s` 自动结束。
- 会话结束完全由前端按钮控制。

## 6. 已验证结论

2026-04-13 已在真实服务上验证：

- `zh_CN` / `en_US` 语言参数可用
- 实时 `partial` 事件可持续返回
- 静默后可生成 `segment`
- 暂停后可恢复继续转写
- 手动 `finish` 后可生成最终文本
- `voiceCards` 已真实入库，并可在详情中还原
