# 语音功能前后端对接说明

最后更新：2026-04-14

本文档基于以下实际实现整理：

- 静态测试页：`note-server/src/main/resources/static/voice-realtime-test.html`
- 后端控制器：`VoiceRealtimeController`、`VoiceNoteController`
- 后端 WebSocket：`VoiceRealtimeWebSocketHandler`
- 后端服务：`VoiceRealtimeService`

本文面向前端、移动端、H5、测试工具和联调同学，目标是说明“如何对接后台语音能力”，而不是解释底层表结构。

---

## 1. 功能概览

当前语音能力由三条链路组成：

1. 登录并获取鉴权三元组
2. 创建笔记并发起实时语音转写
3. 录音结束后归档音频文件，并通过笔记详情回查会话与文件

语音能力包含两种核心结果：

- 实时结果：通过 WebSocket 推送 `transcript.partial`、`transcript.segment`、`session.finished`
- 归档结果：通过 `/v1/note/voice-notes/upload` 生成 `fileId`，供后续播放、下载、详情聚合

---

## 2. 对接总流程

推荐按以下顺序接入：

1. 调用 `POST /v1/note/login`，完成登录并获取 cookie 中的 `appId`、`userId`、`token`
2. 调用 `POST /v1/note/notes` 创建笔记，拿到 `noteId`
3. 调用 `POST /v1/note/voice-realtime/sessions` 创建实时会话，拿到 `sessionId`
4. 连接 `WS /v1/note/voice-realtime/ws`
5. 向 WS 持续发送录音二进制数据
6. 接收服务端实时事件并渲染 partial、final、card
7. 用户点击完成后发送 WS 控制消息 `finish`
8. 将本次录音完整文件上传到 `/v1/note/voice-notes/upload`
9. 按需通过 `GET /v1/note/notes/{noteId}?withContent=true` 拉取聚合详情

---

## 3. 鉴权模型

### 3.1 HTTP 接口鉴权

除登录接口外，HTTP 接口统一使用以下请求头：

```http
appId: {appId}
userId: {userId}
token: {token}
Content-Type: application/json
```

其中：

- `appId`：应用标识
- `userId`：当前登录用户标识
- `token`：登录态令牌

### 3.2 WebSocket 鉴权

实时语音 WS 握手不走 HTTP Header，而是走 Query 参数：

```text
ws://{host}/v1/note/voice-realtime/ws?sessionId={sessionId}&appId={appId}&userId={userId}&token={token}&mimeType={mimeType}
```

说明：

- `sessionId` 必填
- `appId`、`userId`、`token` 必填
- `mimeType` 建议显式传入，且与实际录音格式保持一致

---

## 4. 统一对象概念

### 4.1 `noteId`

语音能力最终挂在笔记下面，`noteId` 是业务主锚点。

用于：

- 创建实时语音 session
- 上传归档音频文件
- 聚合查询语音详情

### 4.2 `sessionId`

一次实时语音转写会话的唯一标识。

用于：

- 连接 WebSocket
- 标识一整次录音流
- 将实时转写与归档音频关联起来

### 4.3 `segmentIndex`

一次实时 session 内的卡片序号，从 1 开始递增。

用于：

- 展示切卡顺序
- 映射每一段语音卡片
- 对应实时转写中的分段边界

### 4.4 `fileId`

归档音频文件唯一标识。

用于：

- 下载音频
- 在线播放音频
- 通过详情页回查音频文件

### 4.5 `transcript`、`finalTranscript`、`segmentTranscript`

三者语义不同：

- `transcript`：当前实时事件对应的“当前段文本”
- `finalTranscript`：截至当前事件为止，服务端确认保留的累计全文
- `segmentTranscript`：本次切卡产生的单张卡片文本

建议前端不要混用。

---

## 5. 登录接口

### 5.1 登录

`POST /v1/note/login`

请求体：

```json
{
  "appId": "app-test-001",
  "code": "code-test-001",
  "authType": "internal",
  "redirectUri": "http://127.0.0.1:5001/voice-realtime-test.html"
}
```

字段说明：

- `appId`：应用标识
- `code`：登录码或授权码
- `authType`：认证类型，测试页默认 `internal`
- `redirectUri`：回调页面地址

测试页行为：

- 登录成功后，会从 cookie 中恢复 `appId`、`userId`、`token`
- 同时缓存到浏览器 `localStorage`

联调建议：

- 登录接口是整条语音链路的入口
- 后续所有 HTTP 和 WS 都依赖登录后拿到的三元组

---

## 6. 笔记接口

### 6.1 创建笔记

`POST /v1/note/notes`

请求头：

```http
appId: {appId}
userId: {userId}
token: {token}
Content-Type: application/json
```

请求体：

```json
{
  "title": "Voice Realtime Test Note",
  "type": "text",
  "content": ""
}
```

典型返回中的关键字段：

```json
{
  "id": "226b9bb4-769a-4068-98ad-a1d5f7de4b59",
  "title": "Voice Realtime Test Note",
  "type": "text",
  "status": "active"
}
```

前端处理建议：

- 仅需保存 `id` 作为 `noteId`
- 语音相关的所有后续接口均依赖该值

### 6.2 获取笔记详情

`GET /v1/note/notes/{noteId}?withContent=true`

用途：

- 查看语音归档文件
- 查看历史实时 session
- 查看分段 card

测试页当前约定：

- 从返回对象中读取 `voiceNote[]`
- 从返回对象中读取 `voiceRealtimeSessions[]`
- 如果存在最新文件，则回填 `voiceFileId`
- 如果存在最新 session，则可以用于展示历史会话信息
- 追加转录时不建议直接复用旧 `sessionId`

说明：

- 该接口属于笔记聚合详情接口，不是语音专属接口
- 但在语音功能联调中，它是最重要的“结果回查接口”

---

## 7. 实时语音接口

### 7.1 创建实时 session

`POST /v1/note/voice-realtime/sessions`

请求头：

```http
appId: {appId}
userId: {userId}
token: {token}
Content-Type: application/json
```

请求体：

```json
{
  "noteId": "4582f5c0-95fc-4587-bb54-e01d694038fa",
  "language": "zh_CN"
}
```

字段说明：

- `noteId`：必填，关联的笔记 ID
- `language`：可选，推荐 `zh_CN` 或 `en_US`

返回包装为标准 `ApiResponse`，`data` 字段类型为 `VoiceRealtimeSessionResponse`。

`data` 示例：

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
  "segmentSilenceMs": 1500,
  "cards": []
}
```

关键字段说明：

- `sessionId`：本次实时会话 ID
- `status`：初始状态通常为 `opened`
- `audioMimeType`：服务端当前记录的音频 MIME
- `websocketPath`：推荐直接用于拼接 WS 地址
- `segmentSilenceMs`：静音切卡阈值
- `cards`：已有 card 列表，初始一般为空

### 7.2 查询实时 session 详情

`GET /v1/note/voice-realtime/sessions/{sessionId}`

作用：

- 查询单个 session 当前状态
- 获取最新 partial、final、cards

返回结构同 `VoiceRealtimeSessionResponse`。

### 7.3 HTTP 控制接口

后端保留了以下 HTTP 控制接口：

- `POST /v1/note/voice-realtime/sessions/{sessionId}/pause`
- `POST /v1/note/voice-realtime/sessions/{sessionId}/resume`
- `POST /v1/note/voice-realtime/sessions/{sessionId}/finish`

但当前测试页的主流程已经改为优先使用 WebSocket 控制消息。

建议：

- 如果你是全量接入实时能力，优先按 WS 控制方式实现
- HTTP 控制接口可以保留为兜底或管理端能力

### 7.4 追加转录的推荐模式

追加转录推荐使用“同 note、新 session”的模式，而不是复用旧 session 做 resume。

推荐规则如下：

- 前端先通过笔记详情接口拿到历史 session 和已有 card
- 如果用户决定继续补录，重新调用 `POST /v1/note/voice-realtime/sessions`
- 新创建的 realtime session 仍然绑定同一个 `noteId`
- 新 session 的 card 会继续挂在同一个笔记下面
- 前端展示层需要把历史 card 与新 session 的 card 聚合展示

这意味着：

- 追加转录是“新的 WS 链路”
- 卡片展示是“同一个 note 下继续累加”

不要把这两件事误解成“同一个 session 继续 resume”。

---

## 8. WebSocket 实时链路

### 8.1 建立连接

地址：

`WS /v1/note/voice-realtime/ws`

完整示例：

```text
ws://127.0.0.1:5001/v1/note/voice-realtime/ws?sessionId=b1c1e90db722405589f70bb6d681bf70&appId=app-test-001&userId=user-test-001&token=token-xxx&mimeType=audio/webm
```

握手成功后，服务端会主动推送 `session.ready`。

### 8.2 音频发送方式

前端以二进制帧持续发送录音数据。

测试页当前实现：

- 录音器：`MediaRecorder`
- 默认时间片：`1000ms`
- 优先格式：`audio/webm;codecs=opus`
- 回退格式：`audio/webm`、`audio/mp4`

联调建议：

- 实际发送格式必须与 `mimeType` 保持一致
- 不建议把 `audio/webm` 的流按 PCM 理解
- 每个音频 chunk 不宜过大
- 录音器重建后应重新同步一次 `mimeType`

### 8.3 WS 文本控制消息

#### `config`

用于同步实际录音 MIME。

```json
{
  "type": "config",
  "mimeType": "audio/webm;codecs=opus"
}
```

#### `pause`

用于暂停实时流。

```json
{
  "type": "pause"
}
```

前端建议：

- 先停止本地 `MediaRecorder`
- 停止继续向当前 WS 发送音频 chunk
- `pause` 只作用于“当前还未结束的 session”，不要把它当成“追加录音”入口

#### `resume`

用于恢复实时流。

```json
{
  "type": "resume",
  "mimeType": "audio/webm;codecs=opus"
}
```

前端建议：

- 只有当前 session 处于 `paused` 时才发送 `resume`
- 收到 `session.resumed` 或确认恢复成功后，再启动新的 `MediaRecorder`
- `resume` 后本地录音器通常会重新开始一个新的浏览器音频容器
- 因此恢复录音后必须重新发送一次 `config`
- 不要把“继续补录”误做成对已 `finished` session 的 `resume`

#### `finish`

用于结束 session，并关闭 WS。

```json
{
  "type": "finish"
}
```

---

## 9. WebSocket 事件协议

服务端统一推送 `VoiceRealtimeTranscriptEventResponse`：

```json
{
  "type": "transcript.partial",
  "sessionId": "b1c1e90db722405589f70bb6d681bf70",
  "status": "streaming",
  "transcript": "你好，现在开始测试。",
  "finalTranscript": null,
  "audioMimeType": "audio/webm",
  "receivedBytes": 64300,
  "sequence": 4,
  "isFinal": false,
  "error": null,
  "segmentIndex": 0,
  "segmentTranscript": null,
  "silenceMs": null,
  "segmentSilenceMs": 1500
}
```

字段说明：

- `type`：事件类型
- `sessionId`：当前 session ID
- `status`：会话状态
- `transcript`：当前段的实时文本
- `finalTranscript`：截至当前的累计全文
- `audioMimeType`：当前服务端记录的音频格式
- `receivedBytes`：当前段已累计字节数
- `sequence`：本段音频序号
- `isFinal`：是否终态事件
- `error`：错误信息
- `segmentIndex`：已切分卡片序号
- `segmentTranscript`：本次切卡文本
- `silenceMs`：触发静音切段时的静音时长
- `segmentSilenceMs`：当前静音切卡阈值

### 9.1 `session.ready`

含义：

- WS 握手成功
- 或收到 `config` 后流已进入可发送状态

前端处理建议：

- 可以开始发送音频二进制
- 更新 UI 为“已连接”

### 9.2 `session.resumed`

含义：

- 收到 `resume` 控制后，服务端已恢复接收

前端处理建议：

- 恢复采集麦克风
- 重新发送 `config` 同步 MIME 更稳妥

### 9.3 `session.paused`

含义：

- 收到 `pause` 控制后，服务端已暂停
- 当前段可能会被强制收口

前端处理建议：

- 立即停止本地麦克风采集
- 不要继续向 WS 发送音频

### 9.4 `transcript.partial`

含义：

- 当前段转写有更新
- 也可能表示已接收音频，但当前尚无可展示文本

前端处理建议：

- 用于刷新“当前段文本”
- `transcript` 可能为 `null`
- 不要把 `null` 理解成链路异常

### 9.5 `transcript.segment`

含义：

- 本段已完成，应该切出一张 card
- 语义上接近“当前卡结束，下一张卡开始”

关键理解：

- 这不是 session 结束
- 这不是 WS 断开
- 这是一次分段边界事件

前端处理建议：

1. 根据 `segmentTranscript` 落一张卡片
2. 清空当前段 UI 或转入下一张卡状态
3. 保持当前 WS 与当前 `MediaRecorder` 继续运行，不要仅因为切卡就重建录音器

说明：

- `transcript.segment` 只是“逻辑切段”，不是“录音链路重启”
- 当前测试页已经改为：收到 `transcript.segment` 后只切 UI，不重建 `MediaRecorder`
- 如果在连续录音中频繁 stop/start `MediaRecorder`，反而更容易引入容器切换问题

### 9.6 `session.finished`

含义：

- session 已结束
- 服务端不再接收该 session 的音频

触发方式：

- 用户主动发送 `finish`
- 长时间静音达到会话结束阈值
- 服务端主动收口

前端处理建议：

- 停止本地录音
- 关闭 WS
- 将完整录音文件归档上传

---

## 10. 语音文件归档接口

### 10.1 上传音频文件

`POST /v1/note/voice-notes/upload`

请求方式：

- `multipart/form-data`

表单字段：

- `noteId`：必填
- `sessionId`：可选，建议实时会话结束后带上
- `file`：必填，音频文件本体

测试页有两种上传方式：

1. 手动上传本地音频文件
2. 自动上传本次实时录音缓存

自动上传说明：

- 页面在录音过程中把每个 chunk 缓存在内存中
- 点击 `Finish` 后，把整段缓存拼成 `Blob/File`
- 直接调用本接口归档

返回 `data` 类型为 `VoiceNoteUploadResponse`：

```json
{
  "fileId": "f7d9b5a4-3c74-4b7f-8a0b-1f9a0d9a0e11",
  "url": "http://127.0.0.1:5002/files/f7d9b5a4-3c74-4b7f-8a0b-1f9a0d9a0e11",
  "duration": 12,
  "size": 442404,
  "storageType": "content"
}
```

字段说明：

- `fileId`：文件唯一标识
- `url`：文件访问地址
- `duration`：音频时长
- `size`：文件大小
- `storageType`：存储类型

前端处理建议：

- 成功后立即缓存 `fileId`
- 如果文件来自某次实时会话，务必带上 `sessionId`
- 上传接口只负责归档，不负责实时转写

### 10.2 获取音频文件内容

`GET /v1/note/voice-notes/files/{fileId}`

返回：

- 二进制文件流

前端用法：

- 直接作为播放器地址
- 也可用于下载

### 10.3 删除音频文件

`DELETE /v1/note/voice-notes/files/{fileId}?noteId={noteId}`

用途：

- 删除与某笔记绑定的归档音频文件

---

## 11. 推荐前端实现策略

### 11.1 浏览器端推荐流程

推荐采用与测试页一致的设计：

1. 登录
2. 创建笔记
3. 创建实时 session
4. 连接 WS
5. 启动 `MediaRecorder`
6. 发送 `config`
7. 每个 chunk 发送到 WS
8. 每个 chunk 同时缓存到本地内存
9. 收到 `transcript.segment` 后只切换当前卡片 UI，不重建录音器
10. 如果用户点击 `pause`，先停止本地录音，再发送 `pause`
11. 如果用户点击 `resume`，先恢复 session，再启动新的 `MediaRecorder`，并重新发送 `config`
12. 收到 `finish` 或用户点击完成后，停止录音并自动上传归档文件

### 11.2 MIME 类型处理原则

必须遵守以下原则：

- 握手时传入的 `mimeType` 只是初值
- 真正以 `MediaRecorder` 实际产出的 `event.data.type` 为准
- 一旦发现真实 MIME 与当前值不同，应立刻发送 `config`

推荐顺序：

1. 优先 `audio/webm;codecs=opus`
2. 回退 `audio/webm`
3. 再回退其他浏览器支持格式

### 11.3 切卡策略

服务端会依据静音自动推送 `transcript.segment`。

前端要把这个事件理解为：

- 当前卡片结束
- 下一张卡片开始

不要把它理解为：

- 需要断开 WS
- session 已结束
- 继续沿用上一张卡的 partial 文本
- 需要 stop/start `MediaRecorder`

如果产品支持“补录”或“追加语音”，展示层还要额外遵守一条：

- 新 session 产生的新 card，不应该覆盖旧 session 的 card
- 正确做法是按 `noteId` 聚合展示所有 session 的 card

### 11.4 录音缓存策略

若需要在实时转写结束后归档整段音频，建议：

- 实时流发送与本地缓存并行
- 不要依赖服务端把 WS 原始流反向回传为文件
- 由前端自行把完整录音重新拼装后调用上传接口

测试页当前就是这种实现方式。

### 11.5 组件化前端接入建议

如果你的实时语音是一个会被反复打开、关闭、挂载、卸载的组件，而不是“刷新浏览器后重新开始”的页面，建议把语音能力设计成一个有明确生命周期的状态机。

推荐最小状态集合：

- `idle`
- `session_created`
- `ws_connected`
- `recording`
- `paused`
- `finishing`
- `finished`
- `failed`

推荐做法：

1. 每次进入新一轮录音时，不要复用上一轮的 `sessionId`
2. 每次开始新链路时，都重新创建新的实时 session
3. 组件卸载时，必须显式执行一次完整清理
4. 停止 `MediaRecorder`
5. 停止 `MediaStreamTrack`
6. 关闭 WebSocket
7. 清空当前段文本、累计文本、chunk 计数、mime 同步状态、本地缓存音频

如果组件只是隐藏、没有真正销毁，也建议在“再次开始录音”前手动执行一次运行时状态重置。

### 11.6 不要依赖刷新浏览器“自愈”

根据联调过程中遇到的问题，刷新浏览器后恢复正常，通常意味着前端本地状态残留，而不是后端天然不稳定。

常见残留包括：

- 旧的 `WebSocket` 实例还挂着事件回调
- 旧的 `MediaRecorder` 已 stop，但相关状态变量没有清空
- `lastConfiguredMimeType` 仍保留上一轮值，导致新一轮没有重新发 `config`
- 当前 UI 上显示的是旧段文本，但实际上已经进入新 session
- 旧的缓存音频仍然留在内存里，导致后续上传或统计混乱

所以在组件化接入里，应该把“重置运行时状态”设计成正式能力，而不是依赖浏览器刷新。

### 11.7 `transcript.segment` 后必须开始“新段 UI”，但不要重建连续录音器

`transcript.segment` 的语义不是“继续沿用旧上下文”，而是：

- 第一张卡结束
- 下一张卡开始

前端应该显式做三件事：

1. 把 `segmentTranscript` 落成一张已完成卡片
2. 清空当前段的展示态
3. 继续让当前连续录音链路往下跑，等待下一段的 `partial`

如果当前仍处于“连续录音、未 pause、未 finish”的路径，不要在 `segment` 后重建录音器。

在实际联调中，错误地把 `segment` 当成“必须 stop/start 录音器”的边界，反而更容易出现：

- 第二段刚开始时识别不稳定
- 前一段文本被错误带入后一段
- 浏览器端与服务端对容器边界的理解不一致

### 11.8 每次“新录音容器启动”都重新同步 MIME

不要假设第一次发过 `config` 之后，后面每轮都还能沿用。

建议：

- 连接 WS 后发一次 `config`
- 录音器真正启动后，再按 `recorder.mimeType` 或 `event.data.type` 发一次 `config`
- `resume` 后恢复录音时，再发一次 `config`
- 新建 session 后重新开始录音时，再发一次 `config`

这能明显降低“前端实际格式”和“后端当前认为的格式”漂移。

这里要注意：

- 连续切卡不是新容器，不需要因为 `segment` 单独重发 `config`
- `pause -> resume` 通常会启动新的 `MediaRecorder`，这是新容器，必须重新同步 MIME

### 11.9 完整链路结束后要做一次会话收尾

一次实时语音完整结束，不应该只做 `finish`。

建议按这个顺序收尾：

1. 停止本地录音
2. 发送 WS `finish`
3. 等待 `session.finished`
4. 上传完整录音文件
5. 关闭 WS
6. 清空运行时状态

如果你的产品里还支持“继续下一次录音”，建议把第 6 步做成公共方法，供每次新建 session 前调用。

### 11.10 实际踩坑总结

下面这些都是联调里真实遇到过、前端最容易踩的坑：

1. “追加”是同一个 `noteId` 下新建 `sessionId`

- 不要把追加理解成“继续往旧 session 写”
- 正确做法是：同 note，新 session，最后按 `noteId` 聚合展示多次 session 的 card

2. 不要在 `transcript.segment` 后 stop/start `MediaRecorder`

- `segment` 是逻辑切卡，不是录音链路重启
- 连续录音时应该让同一个录音器继续跑，只更新 UI 状态

3. `pause/resume` 和 `segment` 不是一回事

- `segment`：连续录音不中断，只是服务端判断到一段结束
- `pause/resume`：本地录音器会停掉，恢复时通常会重新产出一个新的浏览器音频容器
- 所以恢复录音后要重新发 `config`

4. `transcript.partial = null` 不等于异常

- 可能只是当前 chunk 还没达到转写阈值
- 也可能是当前段没有新的可展示文本
- UI 层不要因为 `null` 就自动报错或强制重连

5. `segmentTranscript = null` 也不一定是异常

- 可能这一轮只有静音、噪声，或没有形成有效文本
- 前端不要因为收到空 segment 就创建空白卡片

6. `resume` 按钮必须做状态保护

- 正在录音时不要再发 `resume`
- session 已 `finished` 时不要再允许 `resume`
- 否则很容易出现“Microphone is already recording”这类误导性日志

7. 新 session 前必须清空上一轮运行时状态

- 包括当前段文本、chunk 计数、缓存音频、`lastConfiguredMimeType`、WS 实例引用
- 不要指望刷新浏览器来“自愈”

8. 归档音频缓存要按 session 维度管理

- 追加录音既然会创建新 session，就应该生成新的本地缓存音频文件
- 不要把上一轮 session 的缓存继续拼进下一轮上传文件

---

## 12. 关键状态说明

`VoiceRealtimeSessionStatus` 当前包括：

- `opened`
- `streaming`
- `paused`
- `finished`
- `archived`
- `failed`

建议 UI 行为：

- `opened`：允许连接 WS
- `streaming`：允许继续发送音频
- `paused`：禁止继续发音频，允许 resume
- `finished`：会话只读，不可继续写入
- `failed`：展示错误并允许用户重新发起新 session

---

## 13. 关键配置项

后端已接入以下系统配置：

- `voice.realtime.segment_silence_ms`
- `voice.realtime.session_end_silence_ms`
- `voice.realtime.poll_interval_ms`
- `voice.realtime.min_transcribe_bytes`
- `voice.realtime.max_duration_ms`

默认值：

- `voice.realtime.segment_silence_ms = 1500`
- `voice.realtime.session_end_silence_ms = 12000`
- `voice.realtime.poll_interval_ms = 500`
- `voice.realtime.min_transcribe_bytes = 12000`
- `voice.realtime.max_duration_ms = 600000`

这些配置直接影响：

- 何时切卡
- 何时结束会话
- 多久轮询一次静音状态
- 多大音频缓存才触发一次转写
- 单次录音最长时长

---

## 14. 联调注意事项

### 14.1 关于 `transcript.partial = null`

这不一定代表错误，常见原因包括：

- 当前 chunk 还没达到最小转写字节数
- ASR 返回为空
- 当前段尚未出现可接受文本

### 14.2 关于 `transcript.segment`

收到该事件后：

- 不要继续复用上一段的 partial 文本
- 不要因为切卡就重建录音器
- 第二张卡应该是“新的 UI 段”，但仍可沿用当前连续录音链路

如果你的前端是组件化架构，再补两条：

- 不要把上一张卡的 `finalTranscript` 继续当作下一张卡的 `transcript`
- 不要把 `segment` 当作页面级刷新点，而要当作组件内部的一次“切段状态迁移”

如果你的产品还支持 `pause/resume`，再补一条：

- 真正需要新容器头的是 `resume` 后重新启动录音器，不是普通 `segment`

### 14.3 关于 `finish`

推荐顺序：

1. 停止本地录音
2. 发送 WS `finish`
3. 上传完整录音文件

测试页当前已经实现该闭环。

### 14.4 关于错误排查

建议始终记录以下信息：

- `sessionId`
- `noteId`
- `mimeType`
- `chunkIndex`
- `receivedBytes`
- `sequence`
- `segmentIndex`
- `voiceFileId`

后端日志排查时，建议统一按 `sessionId` grep。

前端侧如果要更快定位问题，建议额外记录：

- 当前 `recorderState`
- 当前 `wsReadyState`
- 是否仍在 `acceptingAudio`
- 当前操作是 `segment`、`pause`、`resume` 还是 `append`

---

## 15. 测试页字段与后台接口的映射关系

`voice-realtime-test.html` 中主要字段与后台接口关系如下：

- `Base HTTP URL`：接口服务根地址
- `Note ID`：创建 session、上传文件、查详情时使用
- `Note Title`：创建笔记时使用
- `App ID / User ID / Token`：HTTP 鉴权与 WS 鉴权
- `Login Code / Auth Type / Redirect URI`：登录接口使用
- `Language`：创建 session 时使用
- `Preferred Mime Type`：WS 握手与 `config` 使用
- `Session ID`：连接 WS、resume、finish、详情回填使用
- `Voice File`：手动上传文件时使用
- `Voice File ID`：上传成功或详情回查后回填

---

## 16. 推荐联调顺序

如果是从零接入，推荐按以下顺序验收：

1. 登录成功，拿到 `appId/userId/token`
2. 能成功创建 `noteId`
3. 能成功创建 `sessionId`
4. WS 握手成功，收到 `session.ready`
5. 发送二进制音频后收到 `transcript.partial`
6. 停顿后收到 `transcript.segment`
7. 继续说话后能进入下一张卡
8. 点击 `finish` 后收到 `session.finished`
9. 自动上传成功并拿到 `voiceFileId`
10. 通过笔记详情接口回查到 `voiceNote[]` 和 `voiceRealtimeSessions[]`

---

## 17. 结论

对接这套后台语音能力时，需要把它理解为“两条并行链路”：

- 一条是 WebSocket 实时转写链路
- 一条是录音结束后的文件归档链路

二者通过 `noteId` 和 `sessionId` 串联。

对于前端而言，最关键的实现点不是“只会发音频”，而是：

- 正确维护登录态
- 正确传递真实 MIME
- 正确处理 `transcript.segment`
- 正确在 `finish` 后上传完整录音文件

只要这四点闭环，实时语音、切卡、归档、详情回查就能稳定工作。
