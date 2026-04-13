# note-server 接口文档

## 1. 基本说明

- 服务名称：`note-server`
- 默认地址：`http://127.0.0.1:5001`
- 返回格式：`application/json`
- 文件上传：`multipart/form-data`
- 编码：`UTF-8`
- 通用响应头：`X-Trace-Id`

## 2. 鉴权规则

除 `GET /health`、`POST /v1/note/login`、`GET /v1/note/shares/{noteId}` 外，其余接口都需要登录态。

支持以下三种携带方式，优先级从高到低：

1. Header
2. `Authorization: Bearer <token>`
3. Cookie

鉴权字段：

| 字段 | Header | Cookie |
| --- | --- | --- |
| 应用 ID | `appId` / `X-Cloud-Doc-Origin-AppId` | `cloud_doc_appid` |
| 用户 ID | `userId` | `cloud_doc_userid` |
| 访问令牌 | `token` / `X-Cloud-Doc-Token` / `Authorization` | `cloud_doc_token` |

## 3. 通用响应

大部分业务接口返回统一响应壳：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "traceId": "note-server_pro_1770000000000",
  "appId": "app-id",
  "userId": "user-id",
  "data": {}
}
```

例外情况：

- `POST /v1/note/login` 返回 `204 No Content`，会先清理再重写登录 Cookie
- `GET /v1/note/notes/{id}` 直接返回笔记详情对象
- `GET /v1/note/shares/{noteId}` 直接返回分享详情对象
- `GET /v1/note/voice-notes/files/{fileId}` 返回音频二进制流

## 4. 基础接口

### 4.1 健康检查

`GET /health`

响应：

```json
{ "status": "ok" }
```

### 4.2 登录

`POST /v1/note/login`

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `appId` | string | 是 | 应用 ID |
| `code` | string | 是 | 授权码 |
| `authType` | string | 是 | 登录类型 |
| `redirectUri` | string | 是 | 回调地址 |

响应：

- HTTP 204
- 先清理 Cookie：`cloud_doc_token`、`cloud_doc_userid`、`cloud_doc_appid`
- 再写入 Cookie：`cloud_doc_token`、`cloud_doc_userid`、`cloud_doc_appid`

### 4.3 用户搜索（同第 8 节）

`GET /v1/note/user`

说明：
- 当前实现中该接口用于用户搜索，不是“当前用户详情”接口
- 需要传 `searchText`、`page`、`pageSize`
- 返回结构与第 8 节一致：`data.total`、`data.page`、`data.size`、`data.data`

## 5. 笔记本接口

### 5.1 查询笔记本列表

`GET /v1/note/notebooks`

用途：
- 获取当前用户可见的全部笔记本，用于首页左侧目录、笔记本切换器和移动笔记弹窗。

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "notebook-id",
        "organizationId": "organization-id",
        "name": "工作",
        "isDefault": false,
        "notebookPosition": 1,
        "noteCount": 12,
        "createdAt": "2026-04-09T21:00:00",
        "updatedAt": "2026-04-09T21:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

查询参数：

| 字段 | 说明 |
| --- | --- |
| `page` | 默认 `1` |
| `pageSize` | 默认 `20` |

说明：
- 默认笔记本始终排在最前
- 其余笔记本按 `notebookPosition` 从小到大排序
- `move-up` / `move-down` 会调整同租户同用户下普通笔记本的 `notebookPosition`

### 5.2 创建笔记本

`POST /v1/note/notebooks`

用途：
- 新建一个普通笔记本，后续可作为笔记归属目录。

请求体字段见 `13.2`

示例：

```json
{
  "name": "工作"
}
```

返回体：
- 返回单个笔记本对象
- 字段与“查询笔记本列表”中的 `items[]` 元素一致

### 5.3 更新笔记本

`PUT /v1/note/notebooks/{id}`

用途：
- 修改指定笔记本的名称等基础信息。

请求体字段见 `13.3`

说明：
- 默认笔记本不允许修改名称
- 非默认笔记本可正常更新

返回体：
- 返回单个笔记本对象
- 字段与“查询笔记本列表”中的 `items[]` 元素一致

### 5.4 笔记本上移

`POST /v1/note/notebooks/{id}/move-up`

用途：
- 调整当前用户笔记本排序，让目标笔记本向前移动一位。

说明：
- 默认笔记本不能移动
- 如果已经处在最上方，则不会继续变化

返回体：
- 返回移动后的笔记本对象

### 5.5 笔记本下移

`POST /v1/note/notebooks/{id}/move-down`

用途：
- 调整当前用户笔记本排序，让目标笔记本向后移动一位。

说明：
- 默认笔记本不能移动
- 如果已经处在最下方，则不会继续变化

返回体：
- 返回移动后的笔记本对象

### 5.6 删除笔记本

`DELETE /v1/note/notebooks/{id}`

用途：
- 删除一个空笔记本；通常用于整理目录。

响应同上。

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": null
}
```

## 6. 笔记接口

### 6.1 创建笔记

`POST /v1/note/notes`

用途：
- 创建一条新的笔记记录，并在 `content-server` 中同步创建正文文档。

请求体字段见 `13.6`

文本笔记示例：

```json
{
  "title": "会议记录",
  "type": "text",
  "notebookId": "notebook-id",
  "content": "{\"type\":\"doc\",\"content\":[]}"
}
```

非法类型示例：

```json
{
  "title": "语音笔记",
  "type": "voice",
  "notebookId": "notebook-id"
}
```

说明：
- `text` 笔记通常会传 `content`。
- `type` 必须是受支持枚举之一，传 `voice` 会直接报 `unsupported note type`。
- 当创建时 `content` 为空或未传时，会由 `content-server` 按类型预置默认内容：
  `text` 使用默认富文本骨架，`outline` 使用默认脑图结构，`handwritten` 使用默认手写画板结构。
- 语音文件上传后，会追加到对应笔记的语音素材列表中。
- 如果不传 `notebookId`，服务端会回退到当前用户默认笔记本

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "note-id",
    "notebookId": "notebook-id",
    "notebookName": "默认笔记本",
    "documentId": "document-id",
    "organizationId": "organization-id",
    "title": "会议记录",
    "type": "text",
    "status": "active",
    "isStarred": false,
    "createdAt": "2026-04-09T21:00:00",
    "updatedAt": "2026-04-09T21:00:00"
  }
}
```

说明：
- 创建接口返回精简版笔记对象，不包含 `voiceNumber`、`content`、`voiceNote`、`deletedAt`
- 如需正文或语音文件列表，请继续调用 `GET /v1/note/notes/{id}`

### 6.2 查询笔记列表

`GET /v1/note/notes`

用途：
- 按笔记本、状态、排序条件批量查询笔记摘要，用于主列表页。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `notebookId` | 可选，按笔记本过滤 |
| `status` | 可选，支持 `active` / `deleted`，默认 `active` |
| `orderBy` | `1` 创建时间，`2` 更新时间，`3` 标题 |
| `desc` | `0` 或 `1`，默认 `1` |
| `page` | 默认 `1` |
| `pageSize` | 默认 `20` |

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "note-id",
        "notebookId": "notebook-id",
        "documentId": "document-id",
        "organizationId": "organization-id",
        "title": "会议记录",
        "type": "text",
        "voiceNumber": 0,
        "status": "active",
        "isStarred": false,
        "deletedAt": null,
        "createdAt": "2026-04-09T21:00:00",
        "updatedAt": "2026-04-09T21:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

说明：
- `status` 不传时按活动笔记处理
- `status` 传其他值会报 `unsupported status`
- `notebookId` 过滤直接基于本地 `note.notebook_id` 精确匹配，不会按额外分组关系扩展查询
- `orderBy=2` 的“更新时间”来自下游文档服务的更新时间映射结果
- `hasVoice` 已移除，列表接口统一返回 `voiceNumber`
- `voiceNumber` 通过批量查询 `voice_note_file` 统计得到，不会按文档逐条查询

### 6.3 搜索笔记

`GET /v1/note/search`

用途：
- 根据标题关键字搜索当前用户指定范围内的笔记，用于顶部搜索框和搜索结果页。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `keyword` | 必填，标题关键字，按部分匹配 |
| `status` | 必填，支持 `active` / `deleted` / `star` / `share` |
| `page` | 默认 `1` |
| `pageSize` | 默认 `20` |

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "note-id",
        "notebookId": "notebook-id",
        "documentId": "document-id",
        "organizationId": "organization-id",
        "title": "会议记录",
        "type": "text",
        "voiceNumber": 0,
        "status": "active",
        "isStarred": false,
        "deletedAt": null,
        "createdAt": "2026-04-09T21:00:00",
        "updatedAt": "2026-04-09T21:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

说明：
- `status=active` 时搜索当前用户的活动笔记
- `status=deleted` 时搜索当前用户回收站中的笔记
- `status=star` 时搜索当前用户已星标且未软删除的笔记标题
- `status=share` 时搜索当前用户“我发起的分享”中仍为活动状态的笔记标题
- `status` 不传会报 `status is required`
- `status` 传其他值会报 `unsupported status`
- `status=star` 会包含当前用户可见的共享星标笔记
- 结果按更新时间倒序返回，再做分页
- 返回字段同列表接口，包含 `voiceNumber`，不再返回 `hasVoice`

### 6.4 查询笔记详情

`GET /v1/note/notes/{id}`

用途：
- 获取单条笔记的完整展示数据，包括正文和语音素材归档。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `withContent` | 默认 `true` |

响应要点：
- 文本笔记返回 `content`
- 存在语音素材时返回 `voiceNote` 文件数组，否则为 `null`
- 该接口直接返回笔记详情对象，不再包裹 `success`、`statusCode`、`traceId`、`appId`、`userId`、`data` 外层
- `voiceNote` 按 `createdAt` 正序返回，越早上传的文件越靠前；同一时间再按记录主键升序兜底
- `voiceNote` 中每个元素都表示一个独立语音文件，包含自己的 `fileId`、`audioUrl`、`transcript`、`language`、`transcriptStatus`
- `transcriptStatus` 取值为 `pending`、`processing`、`completed`、`failed`

响应示例：

```json
{
  "id": "note-id",
  "notebookId": "notebook-id",
  "notebookName": "默认笔记本",
  "documentId": "document-id",
  "organizationId": "organization-id",
  "title": "语音笔记",
  "type": "text",
  "voiceNumber": 2,
  "status": "active",
  "isStarred": false,
  "content": "{\"type\":\"doc\",\"content\":[]}",
  "voiceNote": [
    {
      "fileId": "file-id-1",
      "audioUrl": "/v1/file/internal/resources/file-id-1",
      "transcript": null,
      "language": "zh-CN",
      "transcriptStatus": "pending",
      "createdAt": "2026-04-09T20:00:00",
      "updatedAt": "2026-04-09T20:00:00"
    },
    {
      "fileId": "file-id-2",
      "audioUrl": "/v1/file/internal/resources/file-id-2",
      "transcript": "这是一条语音笔记",
      "language": "zh-CN",
      "transcriptStatus": "completed",
      "createdAt": "2026-04-09T21:00:00",
      "updatedAt": "2026-04-09T21:00:00"
    }
  ],
  "deletedAt": null,
  "createdAt": "2026-04-09T21:00:00",
  "updatedAt": "2026-04-09T21:00:00"
}
```

### 6.5 更新笔记名称

`PATCH /v1/note/name/{id}`

用途：
- 修改笔记标题，并同步更新下游正文文档标题。

请求体：

```json
{
  "name": "新名称"
}
```

说明：
- 先同步更新 `content-server` 里的文档标题
- 成功后再更新 `note` 表里的标题

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": null
}
```

### 6.6 更新笔记内容

`PATCH /v1/note/content/{id}`

用途：
- 修改笔记正文内容。

请求体：

```json
{
  "content": "{\"type\":\"doc\",\"content\":[]}"
}
```

响应同上。

### 6.7 移动笔记

`POST /v1/note/move/{id}`

用途：
- 把一条活动笔记迁移到另一个笔记本。

请求体：

```json
{
  "notebookId": "target-notebook-id"
}
```

说明：
- 只允许移动当前用户自己的活动笔记
- 目标笔记本必须存在，且必须属于当前用户
- 移动操作只会更新本地 `note.notebook_id`，后续列表查询也据此判断文档归属
- 如果目标笔记本和当前笔记本相同，接口会直接返回成功，不重复更新

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": null
}
```

### 6.8 星标笔记

`POST /v1/note/notes/{id}/star`

用途：
- 把自己的笔记或收到的共享笔记加入星标列表。

说明：
- 既支持给自己的笔记星标，也支持给“已分享给当前用户”的笔记星标
- 对于共享笔记，星标记录会保存在当前用户自己的星标关系中，不会修改分享人的原始笔记状态

响应：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": null
}
```

### 6.9 取消星标

`POST /v1/note/notes/{id}/unstar`

用途：
- 取消当前用户对某条笔记的星标关系。

响应同上。

### 6.10 星标列表

`POST /v1/note/notes/star`

用途：
- 查询当前用户的星标笔记列表，包含自己的笔记和可见的共享笔记。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `page` | 默认 `1` |
| `pageSize` | 默认 `20` |
| `orderBy` | `1` 创建时间，`2` 更新时间，`3` 标题 |
| `desc` | `0` 或 `1`，默认 `0` |

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "note-id",
        "notebookId": "notebook-id",
        "documentId": "document-id",
        "organizationId": "organization-id",
        "title": "会议记录",
        "type": "text",
        "voiceNumber": 0,
        "status": "active",
        "isStarred": true,
        "sharedByNickName": "张三",
        "deletedAt": null,
        "createdAt": "2026-04-09T21:00:00",
        "updatedAt": "2026-04-09T21:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

说明：
- `sharedByNickName` 仅在星标的是“共享过来的文档”时返回
- 该字段通过 authkit 的 `queryUsersByIds` 查询分享人的 `nickName` 生成
- 如果分享被取消，或者原文档被删除，该共享笔记会从当前用户的星标列表中消失

### 6.11 我的分享列表

`GET /v1/note/myshare/notes`

用途：
- 查询“我发起的分享”记录，用于分享管理页。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `page` | 默认 `1` |
| `pageSize` | 默认 `20` |
| `orderBy` | `1` 创建时间，`2` 更新时间，`3` 标题 |
| `desc` | `0` 或 `1`，默认 `0` |

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "note-id",
        "title": "会议记录",
        "type": "text",
        "voiceNumber": 1,
        "isStarred": false,
        "createdAt": "2026-04-09T21:00:00",
        "updatedAt": "2026-04-09T21:00:00",
        "shareType": "all"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

### 6.12 删除笔记

`POST /v1/note/notes/{id}/delete`

用途：
- 将笔记逻辑删除到回收站，而不是立即物理清理。

说明：
- 逻辑删除，会把笔记移动到回收站
- 不会立即删除正文文档和语音文件资源

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": null
}
```

### 6.13 回收站列表

`GET /v1/note/recycle-bin`

用途：
- 分页查询当前用户已删除笔记，用于回收站页面。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `page` | 默认 `1` |
| `pageSize` | 默认 `20` |
| `orderBy` | `1` 创建时间，`2` 更新时间，`3` 标题 |
| `desc` | `0` 或 `1`，默认 `0` |

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "note-id",
        "notebookId": "notebook-id",
        "documentId": "document-id",
        "organizationId": "organization-id",
        "title": "已删除笔记",
        "type": "text",
        "voiceNumber": 0,
        "status": "deleted",
        "isStarred": false,
        "deletedAt": "2026-04-09T21:00:00",
        "createdAt": "2026-04-09T21:00:00",
        "updatedAt": "2026-04-09T21:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

### 6.14 回收站恢复

`POST /v1/note/notes/recycle-bin/restore`

用途：
- 批量把回收站中的笔记恢复为活动状态。

请求体：

```json
{
  "ids": ["note-id-1", "note-id-2"]
}
```

响应示例同上。

说明：
- 支持批量恢复
- 只恢复当前用户自己回收站中的笔记

### 6.15 永久删除

`POST /v1/note/notes/recycle-bin/delete`

用途：
- 批量彻底删除回收站中的笔记及其本地归档数据。

请求体同上。

响应示例同上。

说明：
- 支持批量永久删除
- 会删除 note-server 内的笔记元数据
- 对于语音笔记，会同时清理 `voice_note` 和 `voice_note_file` 归档记录

### 6.16 笔记历史

`GET /v1/note/notes/{id}/history`

用途：
- 查询正文历史版本，用于版本回看或审计展示。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `page` | 默认 `1` |
| `pageSize` | 默认 `20` |

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "version": "1",
        "data": "{\"type\":\"doc\",\"content\":[]}",
        "userId": "user-id"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

## 7. 分享接口

### 7.1 创建分享

`POST /v1/note/shares`

用途：
- 为一条笔记生成分享链接，支持公开分享和点对点分享。

请求体：

```json
{
  "noteId": "note-id",
  "shareType": "pointed",
  "userList": ["w00855034", "w00859778"]
}
```

说明：
- `shareType` 支持 `all` 和 `pointed`
- `pointed` 需要传 `userList`
- `userList` 传入工号/用户名，例如 `w00855034`
- 如果 `userList` 中包含当前登录用户自己，则会拒绝分享
- `all` 表示公开分享
- 分享链接默认永久有效
- 再次分享同一条笔记时，会更新同一条分享记录而不是生成新的分享码

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "noteId": "note-id",
    "shareUrl": "/v1/note/shares/note-id"
  }
}
```

### 7.2 查看分享详情

`GET /v1/note/shares/{noteId}`

用途：
- 通过分享码打开原始笔记内容，供分享页直接展示。

说明：
- 公开分享无需登录也可访问
- 点对点分享会调用 authkit 的 `queryUsersByIds` 查询访问者的用户信息，然后用返回的 `userName` 和 `userList` 做匹配
- 分享人本人可以直接通过自己的 `noteId` 访问
- 该接口直接返回分享笔记对象，不再包裹 `success`、`statusCode`、`traceId`、`appId`、`userId`、`data` 外层
- 返回内容会根据原文类型变化：
  - 文本笔记返回 `content`
  - 存在语音素材时返回 `voiceNote` 文件数组
- `voiceNote` 按 `createdAt` 正序返回，越早上传的文件越靠前；同一时间再按记录主键升序兜底

响应示例：

```json
{
  "id": "note-id",
  "title": "会议记录",
  "type": "text",
  "voiceNumber": 1,
  "content": "{\"type\":\"doc\",\"content\":[]}",
  "notebookName": "默认笔记本",
  "updatedAt": "2026-04-09T21:00:00"
}
```

### 7.3 保存分享文档

`POST /v1/note/shares/{noteId}/save`

用途：
- 把收到的分享笔记复制成当前用户自己的新笔记。

说明：
- 用于把收到的分享文档保存成当前用户自己的新笔记副本
- 文本笔记会复制标题、内容、所属笔记本信息，并生成一条新的 `note`
- 如果原文档带语音素材，也会复制整条语音链路，包括新的 `note`、`voice_note`、`voice_note_file`，以及新的文件资源
- 默认保存到当前用户的默认笔记本
- 也可以通过请求体指定目标笔记本

请求体：

```json
{
  "notebookId": "notebook-id"
}
```

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "new-note-id",
    "notebookId": "notebook-id",
    "notebookName": "默认笔记本",
    "documentId": "new-document-id",
    "organizationId": "organization-id",
    "title": "会议记录",
    "type": "text",
    "voiceNumber": 0,
    "status": "active",
    "isStarred": false,
    "content": "{\"type\":\"doc\",\"content\":[]}",
    "voiceNote": null,
    "deletedAt": null,
    "createdAt": "2026-04-09T21:00:00",
    "updatedAt": "2026-04-09T21:00:00"
  }
}
```

### 7.4 取消分享

`DELETE /v1/note/shares/{noteId}`

用途：
- 关闭一条已有分享，使分享链接失效。

说明：
- 只有分享人本人可以取消分享
- 取消后，原分享链接立即失效
- 如果被分享用户已经把该文档星标，也会从其星标列表中消失
- 当前用户“我的分享”列表也会同步移除该记录

响应：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": null
}
```

## 8. 用户搜索接口

`GET /v1/note/user`

用途：
- 按关键字搜索可分享用户，用于分享弹窗里的“选择接收人”。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `searchText` | 搜索关键字 |
| `page` | 默认 `1` |
| `pageSize` | 默认 `20` |

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "total": 1,
    "page": 1,
    "size": 20,
    "data": [
      {
        "oneAccessUserId": "user-id",
        "userName": "tester",
        "nickName": "昵称",
        "profileUrl": "https://example.com/avatar.png",
        "available": 1,
        "isAdmin": 0,
        "lowestDept": "研发部",
        "email": "tester@example.com"
      }
    ]
  }
}
```

## 9. 语音笔记接口

### 9.1 上传音频

`POST /v1/note/voice-notes/upload`

用途：
- 给一条活动笔记追加一份语音素材，并完成文件服务落盘。

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `noteId` | text | 是 | 笔记 ID |
| `file` | file | 是 | 音频文件 |

说明：
- 上传前必须先确认 `noteId` 对应的笔记已存在，且状态为 `active`
- 上传后资源会保存到文件服务中
- 相同 hash 的文件会复用同一个 `fileId` 和 `url`，note-server 会把它视为同一份文件
- 返回值里会带 `fileId`，后续下载用这个 ID
- 当前实现返回字段为 `url`（资源路径），历史文档里的 `audioUrl` 可视为同义字段
- 接口带上传限流，默认窗口为 `60s`，默认阈值为 `30` 次
- 成功后，列表 / 详情 / 分享相关接口中的 `voiceNumber` 会基于归档文件数自动变化

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "fileId": "file-id",
    "url": "/v1/file/internal/resources/file-id",
    "duration": 10,
    "size": 123456,
    "storageType": "content"
  }
}
```

说明：
- 成功后会回写 `voice_note_file` 与 `voice_note` 的转写结果
- 当前由模型自动识别音频语言，接口调用方无需传语言参数

### 9.2 语音转写

`POST /v1/note/voice-notes/transcribe`

用途：
- 对指定语音文件发起转写，并把转写结果回写到归档记录。

请求体：

```json
{
  "fileId": "file-id"
}
```

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "transcript": "这是转写内容",
    "status": "completed"
  }
}
```

### 9.3 搜索语音笔记

`GET /v1/note/voice-notes/search`

用途：
- 按转写内容搜索语音素材，便于在音频笔记中定位命中片段。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `keyword` | 搜索关键词 |
| `page` | 默认 `1` |
| `pageSize` | 默认 `20` |

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "noteId": "note-id",
        "title": "语音笔记",
        "notebookId": "notebook-id",
        "audioUrl": "/v1/file/internal/resources/file-id",
        "audioDuration": 10,
        "audioSize": 123456,
        "language": "zh-CN",
        "transcriptStatus": "completed",
        "transcriptPreview": "这是转写内容",
        "createdAt": "2026-04-09T21:00:00",
        "updatedAt": "2026-04-09T21:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

### 9.4 下载语音文件

`GET /v1/note/voice-notes/files/{fileId}`

用途：
- 通过 `fileId` 获取原始音频流，用于播放或下载。

说明：
- 前端用上传返回的 `fileId` 访问
- 返回音频二进制流，可直接用于播放或下载
- 响应会透传文件服务的 `Content-Type`
- `voice_note_file.transcript_status` 会在上传后处于 `pending`，调用转写接口成功后变成 `completed`

响应：
- `200 OK`
- Body 为音频二进制
- Header 包含 `Content-Disposition: inline; filename="<原始文件名>"`

### 9.5 删除语音文件

`DELETE /v1/note/voice-notes/files/{fileId}?noteId={noteId}`

用途：
- 删除某条笔记下的一份语音素材归档，必要时同时清理底层文件资源。

查询参数：

| 字段 | 说明 |
| --- | --- |
| `noteId` | 必填，所属笔记 ID |

说明：
- 删除的是指定笔记下的一条语音素材归档记录
- 如果该文件已经没有任何笔记引用，会继续删除底层文件资源
- 删除成功后，相关笔记在列表、详情、我的分享中的 `voiceNumber` 会自动重新统计

响应：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": null
}
```

### 9.6 实时语音转录会话

适用场景：
- 前端通过麦克风边录边传，服务端持续返回 `transcript.partial`
- 用户短暂停顿后，前端根据 `transcript.segment` 生成一张“转录卡片”
- 用户点击“暂停”按钮后，由前端主动结束本次会话，再进入音频归档 / 上传阶段

当前推荐配置：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `voice.realtime.segment_silence_ms` | `1500` | 短静音切卡片阈值 |
| `voice.realtime.poll_interval_ms` | `500` | 静音检测轮询周期 |
| `voice.realtime.min_transcribe_bytes` | `16384` | 最小送识别字节数，达到后才开始调用 ASR |

实现说明：
- 当前后端是“分段累积后反复增量转写”的实现，不是供应商原生全双工流式 ASR
- 前端建议按 `2KB` 到 `4KB` 二进制帧发送音频，避免单帧过大导致 WebSocket 报文过长
- 在默认配置下，前几帧通常只会返回 `transcript.partial` 且 `transcript = null`，等累计音频达到阈值后才会开始出现实时文字
- 真实链路中仅保留短静音切卡片；会话结束由前端手动触发

#### 9.6.1 创建实时会话

`POST /v1/note/voice-realtime/sessions`

请求体：

```json
{
  "noteId": "note-id",
  "language": "中文"
}
```

说明：
- `language` 目前支持前端传 `中文` 或 `English`
- 服务端会分别规范化为 `zh-CN` 和 `en-US`

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "sessionId": "rt-session-id",
    "noteId": "note-id",
    "language": "zh-CN",
    "audioMimeType": "audio/webm",
    "status": "opened",
    "partialTranscript": null,
    "finalTranscript": null,
    "lastError": null,
    "receivedBytes": 0,
    "lastSequence": 0,
    "startedAt": "2026-04-13T11:00:00",
    "finishedAt": null,
    "createdAt": "2026-04-13T11:00:00",
    "updatedAt": "2026-04-13T11:00:00",
    "websocketPath": "/v1/note/voice-realtime/ws?sessionId=rt-session-id",
    "segmentSilenceMs": 1500
  }
}
```

#### 9.6.2 查询实时会话

`GET /v1/note/voice-realtime/sessions/{sessionId}`

用途：
- 查询当前会话状态、最近一次部分转写、最终转写和静音阈值配置

#### 9.6.3 手动结束实时会话

`POST /v1/note/voice-realtime/sessions/{sessionId}/finish`

用途：
- 在前端主动停止录音时结束会话，并固化当前最终转写结果

兼容说明：
- 也支持 `POST /v1/note/voice-realtime/sessions/{sessionId}/pause`
- 推荐前端优先使用 `pause`，语义更贴近“用户点击暂停按钮”

#### 9.6.4 WebSocket 实时流

`GET /v1/note/voice-realtime/ws`

连接参数：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `sessionId` | 是 | 创建会话接口返回的 `sessionId` |
| `appId` | 是 | 登录态应用 ID |
| `userId` | 是 | 登录态用户 ID |
| `token` | 是 | 登录态 token |
| `mimeType` | 否 | 音频 MIME 类型，默认 `audio/webm` |

前端发送：
- 二进制帧：音频数据块
- 文本帧 `{"type":"config","mimeType":"audio/webm"}`：更新流配置
- 文本帧 `{"type":"pause"}`：用户点击暂停后主动结束流
- 文本帧 `{"type":"finish"}`：兼容保留，行为与 `pause` 相同

服务端事件：

| `type` | 含义 |
| --- | --- |
| `session.ready` | WebSocket 已建立，可开始推送音频 |
| `transcript.partial` | 当前分段的增量转写 |
| `transcript.segment` | 命中短静音阈值，当前卡片内容完成 |
| `session.paused` | 前端主动暂停后返回最终结果 |

`transcript.segment` 示例：

```json
{
  "type": "transcript.segment",
  "sessionId": "rt-session-id",
  "status": "streaming",
  "transcript": null,
  "finalTranscript": "你好，这里是 Win Note，三秒。",
  "audioMimeType": "audio/wav",
  "receivedBytes": 132346,
  "sequence": 33,
  "isFinal": false,
  "error": null,
  "segmentIndex": 1,
  "segmentTranscript": "你好，这里是 Win Note，三秒。",
  "silenceMs": 1520,
  "segmentSilenceMs": 1500
}
```

`session.paused` 示例：

```json
{
  "type": "session.paused",
  "sessionId": "rt-session-id",
  "status": "finished",
  "transcript": null,
  "finalTranscript": "你好，这里是 Win Note，三秒。",
  "audioMimeType": "audio/wav",
  "receivedBytes": 132346,
  "sequence": 33,
  "isFinal": true,
  "error": null,
  "segmentIndex": null,
  "segmentTranscript": "你好，这里是 Win Note，三秒。",
  "silenceMs": null,
  "segmentSilenceMs": 1500
}
```

前端处理建议：
- 收到 `transcript.partial` 时，仅更新当前正在输入的卡片草稿
- 收到 `transcript.segment` 时，生成一张正式卡片，内容取 `segmentTranscript`
- 收到 `session.paused` 时，结束会话并触发后续音频上传 / 归档流程
- 如果连续收到 `transcript.partial` 但 `transcript` 为空，表示后端仍在缓冲音频，前端无需报错
- 如需更敏捷的切卡体验，可把 `voice.realtime.segment_silence_ms` 调整到 `1200` 到 `1800` 之间

## 10. AI 接口

### 10.1 发起对话

`POST /v1/note/ai/chat`

用途：
- 基于指定笔记正文发起 AI 对话，获取总结、改写或扩写结果。

请求体：

```json
{
  "noteId": "note-id",
  "user_prompt": "请把这条笔记改写得更正式一点"
}
```

说明：
- 后端会根据 `user_prompt` 自动判断意图并路由到对应 prompt
- 支持多轮对话，同一个 `noteId` 会复用同一条会话
- `task_type` 会反映模型最终判定的任务类型
- `prompt` 是实际使用的任务提示词
- 会话接口里用户消息的 `content` 只保留原始 `user_prompt`，拼接后的任务提示词放在消息 `extra` 中
- 接口带限流，默认窗口为 `60s`，默认阈值为 `20` 次

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "conversationId": "conversation-id",
    "task_type": "rewrite",
    "prompt": "任务提示词",
    "result": "处理后的结果"
  }
}
```

### 10.2 获取会话

`GET /v1/note/ai/conversations/{noteId}`

用途：
- 读取某条笔记对应的 AI 会话历史，用于聊天页恢复上下文。

说明：
- 前端传入的是 `noteId`
- 返回不包含系统提示词
- 返回消息按时间顺序排列，便于前端构造对话页

响应示例：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "data": {
    "conversationId": "conversation-id",
    "noteId": "note-id",
    "title": "AI 会话",
    "status": 1,
    "createdAt": "2026-04-09T21:00:00",
    "updatedAt": "2026-04-09T21:00:00",
    "messages": [
      {
        "messageId": "msg-1",
        "role": "user",
        "content": "请总结这条笔记",
        "extra": "",
        "createdAt": "2026-04-09T21:00:00"
      },
      {
        "messageId": "msg-2",
        "role": "assistant",
        "content": "总结结果",
        "extra": "",
        "createdAt": "2026-04-09T21:00:01"
      }
    ]
  }
}
```

## 11. 常见错误码

| statusCode | 说明 |
| --- | --- |
| `200004001` | 资源不存在 |
| `200004002` | 参数校验失败 |
| `200004003` | 权限不足 |
| `200004004` | 笔记已删除 |
| `200004005` | 语音文件不存在 |
| `200004006` | 语音笔记类型不正确 |
| `200004007` | 分享不可用 |
| `200004008` | AI 会话不存在 |
| `200004009` | AI 对话失败 |

## 12. 枚举与取值字典

### 12.1 `type` 笔记类型

| 取值 | 说明 | 场景 |
| --- | --- | --- |
| `text` | 文本笔记 | 当前主要文本编辑场景 |
| `outline` | 大纲笔记 | 常量已保留，当前接口文档未单独展开 |
| `handwritten` | 手写笔记 | 常量已保留，当前接口文档未单独展开 |

### 12.2 `status` 笔记状态

| 取值 | 说明 | 场景 |
| --- | --- | --- |
| `active` | 正常可见 | 主列表、详情、分享 |
| `deleted` | 已放入回收站 | 回收站、恢复、永久删除 |
| `star` | 星标搜索范围 | 仅用于 `GET /v1/note/search` 查询参数，不会落库 |
| `share` | 我的分享搜索范围 | 仅用于 `GET /v1/note/search` 查询参数，不会落库 |

### 12.3 `shareType` 分享类型

| 取值 | 说明 | 场景 |
| --- | --- | --- |
| `all` | 公开分享 | 无需登录也可访问分享详情 |
| `pointed` | 点对点分享 | 只允许 `userList` 中的用户访问 |

### 12.4 `orderBy` 排序字段

| 取值 | 说明 | 场景 |
| --- | --- | --- |
| `1` | 创建时间 | 笔记列表、星标列表、分享列表、回收站 |
| `2` | 更新时间 | 笔记列表、星标列表、分享列表、回收站 |
| `3` | 标题 | 笔记列表、星标列表、分享列表、回收站 |

说明：
- 代码默认值与接口不同：
  - 普通笔记列表 `GET /v1/note/notes` 默认按 `2` 处理
  - 星标列表、我的分享、回收站默认按 `1` 处理

### 12.5 `desc` 排序方向

| 取值 | 说明 |
| --- | --- |
| `0` | 升序 |
| `1` | 降序 |

### 12.6 `storageType` 语音存储类型

| 取值 | 说明 |
| --- | --- |
| `content` | 当前实现的内容服务存储 |

### 12.7 `transcriptStatus` 语音转写状态

| 取值 | 说明 | 场景 |
| --- | --- | --- |
| `pending` | 已上传，待转写 | 上传后默认状态 |
| `processing` | 转写中 | 兼容保留状态 |
| `completed` | 转写完成 | 转写成功 |
| `failed` | 转写失败 | 兼容保留状态 |

### 12.8 `task_type` AI 任务类型

| 取值 | 说明 |
| --- | --- |
| `summarize` | 总结摘要 |
| `rewrite` | 改写 |
| `expand` | 扩写 |

### 12.9 `role` AI 消息角色

| 取值 | 说明 |
| --- | --- |
| `system` | 系统提示词消息 |
| `user` | 用户消息 |
| `assistant` | AI 回复消息 |

说明：
- 会话接口当前不返回 `system` 消息，但底层常量中保留该枚举。

### 12.10 `status` AI 会话状态

| 取值 | 说明 |
| --- | --- |
| `1` | 活跃会话 |

### 12.11 `language` 语音语言

当前服务端会从 `sys_config.voice.ai.languages` 读取允许值并校验，默认初始化配置是：

| 取值 | 说明 |
| --- | --- |
| `zh-CN` | 简体中文 |
| `en-US` | 英文（美国） |

补充说明：
- 底层语音 AI 适配层还兼容更多语言映射值，但当前默认配置只开放上面两项。

### 12.12 `authType` 登录类型

| 取值 | 说明 |
| --- | --- |
| `oneaccess` | 当前联调和 smoke 脚本使用的登录类型 |

补充说明：
- `authType` 当前在 `note-server` 内不做本地枚举校验，而是透传给 authkit。
- 如果 authkit 后续支持更多类型，应同步更新本文档。

## 13. 公开接口模型字典

本节只保留公开接口会直接接收或返回的模型。

以下内容不再作为公开接口模型单独展开：
- 仅用于服务内部编排、缓存、下游集成的实现型 DTO
- 只在 controller 之外流转的中间对象
- 不直接出现在 HTTP 请求体或响应体中的内部聚合结构

### 13.1 通用分页返回

适用场景：
- 笔记本列表
- 笔记列表 / 搜索结果
- 星标列表
- 回收站列表
- 我的分享列表
- 用户搜索
- 语音搜索
- 笔记历史

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `total` | number | 总记录数 |
| `page` | number | 当前页码，从 `1` 开始 |
| `size` | number | 当前分页大小 |
| `items` / `list` / `data` | array | 当前页数据列表，具体元素类型见下文 |

### 13.2 `CreateNotebookRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `name` | string | 是 | 笔记本名称，最长 100 | 无 |

### 13.3 `UpdateNotebookRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `name` | string | 是 | 新名称，最长 100 | 无 |

### 13.4 `NotebookResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `id` | string | 笔记本 ID | 无 |
| `organizationId` | string | 组织 ID | 无 |
| `name` | string | 笔记本名称 | 无 |
| `isDefault` | boolean | 是否默认笔记本 | `true` / `false` |
| `notebookPosition` | number | 排序位，越小越靠前 | 无 |
| `noteCount` | number | 当前笔记本下的活动笔记数 | 无 |
| `createdAt` | string(datetime) | 创建时间 | 无 |
| `updatedAt` | string(datetime) | 更新时间 | 无 |

### 13.5 `LoginRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `appId` | string | 是 | 应用 ID | 无 |
| `code` | string | 是 | authkit 授权码 | 无 |
| `authType` | string | 是 | 登录类型，透传给 authkit | 见 `12.12` |
| `redirectUri` | string | 是 | 登录回调地址 | 无 |

### 13.6 `CreateNoteRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `title` | string | 是 | 笔记标题，最长 200 | 无 |
| `type` | string | 是 | 笔记类型 | 见 `12.1` |
| `notebookId` | string | 否 | 目标笔记本 ID，不传时回退默认笔记本 | 无 |
| `content` | string | 否 | 正文 JSON 字符串 | 无 |

### 13.7 `UpdateNoteNameRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `name` | string | 是 | 新标题，最长 200 | 无 |

### 13.8 `UpdateNoteContentRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `content` | string | 是 | 新正文 JSON 字符串或纯文本字符串 | 无 |

### 13.9 `MoveNoteRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `notebookId` | string | 是 | 目标笔记本 ID，必须属于当前用户 | 无 |

### 13.10 `NoteCreatedResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `id` | string | 笔记 ID | 无 |
| `notebookId` | string | 所属笔记本 ID | 无 |
| `notebookName` | string | 所属笔记本名称 | 无 |
| `documentId` | string | 正文文档 ID | 无 |
| `organizationId` | string | 组织 ID | 无 |
| `title` | string | 标题 | 无 |
| `type` | string | 笔记类型 | 见 `12.1` |
| `status` | string | 笔记状态 | 见 `12.2` |
| `isStarred` | boolean | 当前用户视角是否已星标 | `true` / `false` |
| `createdAt` | string(datetime) | 创建时间 | 无 |
| `updatedAt` | string(datetime) | 更新时间 | 无 |

补充说明：
- 创建接口返回的是精简对象，不包含 `voiceNumber`、`content`、`voiceNote`、`deletedAt`。

### 13.11 `NoteSummaryResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `id` | string | 笔记 ID | 无 |
| `notebookId` | string | 所属笔记本 ID | 无 |
| `documentId` | string | 正文文档 ID | 无 |
| `organizationId` | string | 组织 ID | 无 |
| `title` | string | 标题 | 无 |
| `type` | string | 笔记类型 | 见 `12.1` |
| `voiceNumber` | number | 当前笔记关联的语音素材数量 | 无 |
| `status` | string | 笔记状态 | 见 `12.2` |
| `isStarred` | boolean | 当前用户视角是否已星标 | `true` / `false` |
| `sharedByNickName` | string | 分享人的昵称，仅共享星标场景返回 | 无 |
| `deletedAt` | string(datetime) | 删除时间 | 无 |
| `createdAt` | string(datetime) | 创建时间 | 无 |
| `updatedAt` | string(datetime) | 更新时间 | 无 |

### 13.12 `NoteDetailResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `id` | string | 笔记 ID | 无 |
| `notebookId` | string | 所属笔记本 ID | 无 |
| `notebookName` | string | 所属笔记本名称 | 无 |
| `documentId` | string | 正文文档 ID | 无 |
| `organizationId` | string | 组织 ID | 无 |
| `title` | string | 标题 | 无 |
| `type` | string | 笔记类型 | 见 `12.1` |
| `voiceNumber` | number | 当前笔记关联的语音素材数量 | 无 |
| `status` | string | 笔记状态 | 见 `12.2` |
| `isStarred` | boolean | 当前用户视角是否星标 | `true` / `false` |
| `content` | string | 文本正文 JSON；未传正文时通常为空文档结构 | 无 |
| `voiceNote` | array<object> | 语音文件列表；没有语音素材时为 `null` | 见 `13.13` |
| `deletedAt` | string(datetime) | 删除时间 | 无 |
| `createdAt` | string(datetime) | 创建时间 | 无 |
| `updatedAt` | string(datetime) | 更新时间 | 无 |

### 13.13 `VoiceNoteFileArchiveResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `fileId` | string | 文件资源 ID | 无 |
| `audioUrl` | string | 文件访问地址 | 无 |
| `transcript` | string | 当前文件的转写文本 | 无 |
| `language` | string | 当前文件语言 | 见 `12.11` |
| `transcriptStatus` | string | 当前文件转写状态 | 见 `12.7` |
| `createdAt` | string(datetime) | 创建时间 | 无 |
| `updatedAt` | string(datetime) | 更新时间 | 无 |

说明：
- 在“获取音频笔记详情”和“查看分享详情”接口中，`voiceNote` 实际返回 `array<VoiceNoteFileArchiveResponse>`
- 返回顺序固定为旧到新

### 13.14 `BatchIdsRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `ids` | array<string> | 是 | 需要批量处理的笔记 ID 列表 | 无 |

### 13.15 `CreateShareRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `noteId` | string | 是 | 被分享的笔记 ID | 无 |
| `shareType` | string | 否 | 分享类型，默认 `pointed` | 见 `12.3` |
| `userList` | array<string> | 否 | 指定接收人用户名/工号列表，`pointed` 时必填 | 无 |

### 13.16 `ShareCreatedResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `noteId` | string | 分享目标笔记 ID | 无 |
| `shareUrl` | string | 分享访问路径 | 无 |

### 13.17 `SharedNoteResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `id` | string | 原始笔记 ID | 无 |
| `title` | string | 标题 | 无 |
| `type` | string | 笔记类型 | 见 `12.1` |
| `voiceNumber` | number | 原始笔记关联的语音素材数量 | 无 |
| `content` | string | 文本正文 JSON，未传正文时通常为空文档结构 | 无 |
| `voiceNote` | array<object> | 语音文件列表，没有语音素材时为 `null` | 见 `13.13` |
| `notebookName` | string | 原始笔记所在笔记本名称 | 无 |
| `updatedAt` | string(datetime) | 原始笔记更新时间 | 无 |

### 13.18 `SaveSharedNoteRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `notebookId` | string | 否 | 保存到指定笔记本，不传则保存到默认笔记本 | 无 |

### 13.19 `MyShareNoteItemResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `id` | string | 被分享的笔记 ID | 无 |
| `title` | string | 标题 | 无 |
| `type` | string | 笔记类型 | 见 `12.1` |
| `voiceNumber` | number | 当前笔记关联的语音素材数量 | 无 |
| `isStarred` | boolean | 当前分享人视角的星标状态 | `true` / `false` |
| `createdAt` | string(datetime) | 分享创建时间 | 无 |
| `updatedAt` | string(datetime) | 分享更新时间 | 无 |
| `shareType` | string | 分享类型 | 见 `12.3` |

### 13.20 `UserSearchItemResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `oneAccessUserId` | string | OneAccess 用户 ID | 无 |
| `userName` | string | 用户名/工号 | 无 |
| `nickName` | string | 昵称 | 无 |
| `profileUrl` | string | 头像地址 | 无 |
| `available` | number | 是否可用，通常 `1` 可用 | 依赖 authkit 返回 |
| `isAdmin` | number | 是否管理员，通常 `0/1` | 依赖 authkit 返回 |
| `lowestDept` | string | 最低层级部门 | 无 |
| `email` | string | 邮箱 | 无 |

### 13.21 `VoiceNoteUploadResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `fileId` | string | 文件资源 ID | 无 |
| `url` | string | 文件资源访问地址 | 无 |
| `duration` | number | 音频时长，秒 | 无 |
| `size` | number | 文件大小，字节 | 无 |
| `storageType` | string | 存储类型 | 见 `12.6` |

### 13.22 `VoiceNoteTranscribeRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `fileId` | string | 是 | 待转写音频文件 ID，最长 128 | 无 |

### 13.23 `VoiceNoteTranscriptionResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `transcript` | string | 转写结果文本 | 无 |
| `status` | string | 转写状态 | 见 `12.7` |

### 13.24 `VoiceNoteSearchItemResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `noteId` | string | 笔记 ID | 无 |
| `title` | string | 标题 | 无 |
| `notebookId` | string | 笔记本 ID | 无 |
| `audioUrl` | string | 当前主音频地址 | 无 |
| `audioDuration` | number | 时长，秒 | 无 |
| `audioSize` | number | 文件大小，字节 | 无 |
| `language` | string | 语音语言 | 见 `12.11` |
| `transcriptStatus` | string | 转写状态 | 见 `12.7` |
| `transcriptPreview` | string | 转写内容摘要 | 无 |
| `createdAt` | string(datetime) | 创建时间 | 无 |
| `updatedAt` | string(datetime) | 更新时间 | 无 |

### 13.25 `NoteHistoryResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `version` | string | 历史版本号 | 无 |
| `data` | string | 该版本正文 JSON | 无 |
| `userId` | string | 修改该版本的用户 ID | 无 |

### 13.26 `AiChatRequest`

| 字段 | 类型 | 必填 | 说明 | 枚举 |
| --- | --- | --- | --- | --- |
| `noteId` | string | 是 | 关联笔记 ID，最长 64 | 无 |
| `user_prompt` | string | 是 | 用户原始提问，最长 2000 | 无 |

### 13.27 `AiChatResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `result` | string | AI 最终回复内容 | 无 |
| `task_type` | string | 模型判定的任务类型 | 见 `12.8` |
| `prompt` | string | 实际采用的提示词 | 无 |
| `conversationId` | string | 会话 ID | 无 |

### 13.28 `AiConversationResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `conversationId` | string | 会话 ID | 无 |
| `noteId` | string | 关联笔记 ID | 无 |
| `title` | string | 会话标题 | 无 |
| `status` | number | 会话状态 | 见 `12.10` |
| `createdAt` | string(datetime) | 创建时间 | 无 |
| `updatedAt` | string(datetime) | 更新时间 | 无 |
| `messages` | array<object> | 会话消息列表 | 见 `13.29` |

### 13.29 `AiConversationMessageResponse`

| 字段 | 类型 | 说明 | 枚举 |
| --- | --- | --- | --- |
| `messageId` | string | 消息 ID | 无 |
| `role` | string | 消息角色 | 见 `12.9` |
| `content` | string | 消息正文 | 无 |
| `extra` | string | 扩展上下文信息 | 无 |
| `createdAt` | string(datetime) | 创建时间 | 无 |

## 14. 备注

- `voice` 笔记的音频资源以 `fileId` 为准，不再使用文件名访问
- `desc` 默认值已经按当前实现调整：笔记列表默认 `1`，星标/分享/回收站列表默认 `0`
- 这份文档以当前 `note-server` 代码为准，后续新增接口建议同步更新
