# note-server 接口说明

最后验证时间：2026-04-13
验证环境：`note-server http://127.0.0.1:5001`，`content-server http://127.0.0.1:5002`

本文档只保留当前已经真实验证过、并且和 v5 直接相关的接口与字段。

## 1. 通用约定

- 所有业务接口统一返回：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "traceId": "note-server_pro_xxx",
  "appId": "app-id",
  "userId": "user-id",
  "data": {}
}
```

- 登录接口 `POST /v1/note/login` 返回 `204 No Content`，认证信息放在 Cookie。
- 需要鉴权的接口支持从 Header 读取：`appId`、`userId`、`token`。
- 三元组校验失败时，接口返回 `401`，错误信息为 `login expired`。

## 2. 登录

接口：`POST /v1/note/login`

请求体：

```json
{
  "appId": "20221018154303010-64A1-AB636CB87",
  "code": "w00855034",
  "authType": "oneaccess",
  "redirectUri": "http://localhost/callback"
}
```

返回：`204 No Content`

服务端会写入 Cookie：

- `cloud_doc_appid`
- `cloud_doc_userid`
- `cloud_doc_token`

## 3. 笔记详情

接口：`GET /v1/note/notes/{noteId}?withContent=true`

说明：

- `documentId` 已真实返回，可用于继续调用 content-server。
- 当笔记存在实时语音卡片时，会返回 `voiceCards`。
- `voiceCards` 中每一项都是真实落库的数据，不是前端拼装。

示例：

```json
{
  "id": "4582f5c0-95fc-4587-bb54-e01d694038fa",
  "notebookId": "notebook-id",
  "notebookName": "我的笔记",
  "documentId": "70a1fff5-c6dc-49ad-a212-b7d3b804427a",
  "organizationId": "organization-id",
  "title": "Realtime Smoke 1776065141103",
  "type": "text",
  "voiceNumber": 0,
  "status": "active",
  "isStarred": false,
  "content": "{\"type\":\"doc\",\"content\":[]}",
  "voiceNote": null,
  "voiceCards": [
    {
      "id": 6,
      "segmentIndex": 1,
      "startOffsetMs": 0,
      "startTimeLabel": "00:00",
      "transcript": "你好，这里是。",
      "createdAt": "2026-04-13T15:25:49",
      "updatedAt": "2026-04-13T15:25:49"
    },
    {
      "id": 7,
      "segmentIndex": 2,
      "startOffsetMs": 5235,
      "startTimeLabel": "00:05",
      "transcript": "Hello. This is Hello. This is.",
      "createdAt": "2026-04-13T15:25:56",
      "updatedAt": "2026-04-13T15:25:56"
    }
  ],
  "deletedAt": null,
  "createdAt": "2026-04-13T15:25:41",
  "updatedAt": "2026-04-13T15:25:41"
}
```

### `voiceCards` 字段说明

- `segmentIndex`：从 1 开始递增。
- `startOffsetMs`：该卡片相对整个实时会话开始的毫秒偏移。
- `startTimeLabel`：给前端直接展示的 `mm:ss` 文本。
- 第一张卡片固定从 `0` 开始，真实验证结果为 `startOffsetMs = 0`。

## 4. 笔记历史

接口：`GET /v1/note/notes/{noteId}/history`

说明：

- 历史记录中原先单独返回 `userId` 的位置，已经改为 `userInfo`。
- `userInfo` 来自 authkit 查询，结构如下：

```json
{
  "version": "v1",
  "data": "{...}",
  "userInfo": {
    "userId": "user-test-001",
    "userName": "tester",
    "nickName": "测试用户"
  }
}
```

## 5. 实时语音转写会话

### 5.1 创建会话

接口：`POST /v1/note/voice-realtime/sessions`

请求体：

```json
{
  "noteId": "4582f5c0-95fc-4587-bb54-e01d694038fa",
  "language": "zh_CN"
}
```

说明：

- `language` 现在统一使用标准值：`zh_CN` 或 `en_US`。
- 兼容输入 `中文`、`English`、`zh-CN`、`en-US`，服务端会标准化后存储为 `zh_CN` / `en_US`。

返回示例：

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
  "startedAt": "2026-04-13T15:25:41",
  "finishedAt": null,
  "createdAt": "2026-04-13T15:25:41",
  "updatedAt": "2026-04-13T15:25:41",
  "websocketPath": "/v1/note/voice-realtime/ws?sessionId=b1c1e90db722405589f70bb6d681bf70",
  "segmentSilenceMs": 1500
}
```

### 5.2 查询会话详情

接口：`GET /v1/note/voice-realtime/sessions/{sessionId}`

真实验证结果：

- 会返回 `status`
- 会返回 `partialTranscript`
- 会返回 `finalTranscript`
- 结束后 `status = finished`

### 5.3 暂停会话

接口：`POST /v1/note/voice-realtime/sessions/{sessionId}/pause`

返回关键字段：

```json
{
  "sessionId": "session-id",
  "status": "paused"
}
```

### 5.4 恢复会话

接口：`POST /v1/note/voice-realtime/sessions/{sessionId}/resume`

返回关键字段：

```json
{
  "sessionId": "session-id",
  "status": "streaming"
}
```

### 5.5 结束会话

接口：`POST /v1/note/voice-realtime/sessions/{sessionId}/finish`

返回关键字段：

```json
{
  "sessionId": "session-id",
  "status": "finished",
  "finalTranscript": "整段最终文本"
}
```

## 6. 联调结论

2026-04-13 已使用真实服务完成一轮烟测，确认如下能力可用：

- 无效三元组会返回 `401 login expired`
- `language` 标准值为 `zh_CN` / `en_US`
- WebSocket 可实时产生 `transcript.partial`
- 短暂停顿后会产生 `transcript.segment`
- 用户主动暂停后可继续恢复
- 结束后会在详情中还原 `voiceCards`
- 第一张卡片 `startOffsetMs = 0`
- 第二张卡片可返回真实开始时间偏移
- 详情中包含 `documentId`
