# note-server 前端接入接口文档（详细版）

## 1. 文档说明

本文档面向前端联调，基于当前 `note-server` 源码中可见的 Controller、请求对象、响应对象、业务规则与枚举整理，重点覆盖：

- 接口路径、方法、鉴权要求
- 请求参数与响应字段的详细说明
- 枚举值与中文含义
- 统一返回结构与例外接口
- 前端联调注意事项

---

## 2. 认证与请求头

### 2.1 哪些接口需要登录

- **不需要登录**
  - `POST /v1/note/login`
  - `GET /v1/note/shares/{shareCode}`
- **其余 `/v1/note/**` 接口都需要登录**

### 2.2 认证信息支持的传递方式

后端支持从 Header 或 Cookie 读取认证信息。

| 字段语义 | Header / Cookie 键 |
|---|---|
| 应用 ID | `appId` / `X-Cloud-Doc-Origin-AppId` / `cloud_doc_appid` |
| 用户 ID | `userId` / `cloud_doc_userid` |
| 访问令牌 | `token` / `X-Cloud-Doc-Token` / `Authorization: Bearer xxx` / `cloud_doc_token` |

建议前端统一显式传：

- `X-Cloud-Doc-Origin-AppId`
- `Authorization: Bearer <token>`

---

## 3. 返回结构

### 3.1 大多数接口的统一结构

多数接口返回 `ApiResponse<T>`：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "success",
  "traceId": "...",
  "appId": "...",
  "userId": "...",
  "data": {}
}
```

### 3.2 非统一包装接口

以下接口**不是** `ApiResponse` 包装：

1. `POST /v1/note/login`
   - 返回 `204 No Content`
   - 无 body
   - 通过 Cookie 建立登录态

2. `GET /v1/note/notes/{id}`
   - 直接返回 `NoteDetailResponse`

3. `GET /v1/note/shares/{shareCode}`
   - 直接返回 `SharedNoteResponse`

4. `GET /v1/note/voice-notes/files/{fileId}`
   - 返回文件流

5. `GET /health`
   - 返回 `{ "status": "ok" }`

---

## 4. 通用错误处理

| 场景 | HTTP 状态码 | 说明 |
|---|---:|---|
| 参数校验失败 | 400 | 如必填字段缺失、长度不合法 |
| 业务异常 | 400 | 如默认笔记本不可删除、分享已过期 |
| 未处理异常 | 500 | `internal server error` |

---

## 5. 统一枚举字典

### 5.1 笔记类型 `type`

| 枚举值 | 中文名称 | 说明 |
|---|---|---|
| `text` | 文本笔记 | 普通文档型笔记 |
| `outline` | 大纲笔记 | 大纲结构笔记 |
| `handwritten` | 手写笔记 | 手写/墨迹类笔记 |
| `voice` | 语音笔记 | 语音笔记，关联语音文件与转写 |

### 5.2 笔记状态 `status`

| 枚举值 | 中文名称 | 说明 |
|---|---|---|
| `active` | 正常 | 正常可见、可编辑 |
| `deleted` | 已删除 | 进入回收站 |

### 5.3 分享类型 `shareType`

| 枚举值 | 中文名称 | 说明 |
|---|---|---|
| `all` | 公开分享 | 知道分享码即可访问 |
| `pointed` | 定向分享 | 仅指定用户可访问 |

### 5.4 语音转写状态 `transcriptStatus`

| 枚举值 | 中文名称 | 说明 |
|---|---|---|
| `pending` | 待处理 | 已上传，未开始转写 |
| `processing` | 转写中 | 已提交转写 |
| `completed` | 已完成 | 转写成功 |
| `failed` | 失败 | 转写失败 |

### 5.5 语音存储类型 `storageType`

| 枚举值 | 中文名称 | 说明 |
|---|---|---|
| `content` | 内容服务存储 | 当前代码中可见值 |

### 5.6 AI 场景 `scene`

| 枚举值 | 中文名称 | 说明 |
|---|---|---|
| `extraction` | 观点提取 | 聚合语音笔记已完成转录内容，提取观点 |
| `summarize` | 总结摘要 | 对笔记做摘要 |
| `rewrite` | 改写 | 对笔记改写润色 |
| `expand` | 扩写 | 对笔记扩展补充 |

### 5.7 AI 消息角色 `role`

| 枚举值 | 中文名称 | 说明 |
|---|---|---|
| `system` | 系统 | 系统提示词 |
| `user` | 用户 | 用户消息 |
| `assistant` | 助手 | AI 回复 |

### 5.8 AI 会话状态 `status`

| 枚举值 | 中文名称 | 说明 |
|---|---|---|
| `1` | 激活中 | 当前代码中可见值 |

### 5.9 排序字段 `orderBy`

| 枚举值 | 中文名称 | 实际字段 |
|---|---|---|
| `1` | 创建时间 | `created_at` |
| `2` | 更新时间 | `updated_at` |
| `3` | 标题 | `title` |

### 5.10 排序方向 `desc`

| 枚举值 | 中文名称 | 说明 |
|---|---|---|
| `1` | 倒序 | 从大到小 / 从新到旧 |
| `0` | 正序 | 从小到大 / 从旧到新 |

---

## 6. 公共对象定义

### 6.1 分页结构

以下分页响应结构反复出现：

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` / `list` / `data` | array | 当前页数据 |
| `total` | long | 总条数 |
| `page` | long | 当前页码 |
| `size` | long | 当前页大小 |

> 注意：不同接口分页数组字段名不完全一致：
> - 常见：`items`
> - 回收站：`list`
> - 用户搜索：`data`

### 6.2 笔记摘要对象 `NoteSummaryResponse`

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `id` | string | 笔记 ID | 笔记主键 |
| `notebookId` | string | 笔记本 ID | 所属笔记本 |
| `documentId` | string | 文档 ID | content-server 文档主键 |
| `organizationId` | string | 组织 ID | 所属组织 |
| `title` | string | 标题 | 笔记标题 |
| `type` | string | 笔记类型 | 见枚举 `type` |
| `status` | string | 笔记状态 | 见枚举 `status` |
| `isStarred` | boolean | 是否收藏 | 当前用户是否收藏 |
| `sharedByNickName` | string | 分享者昵称 | 共享场景辅助展示 |
| `deletedAt` | string(datetime) | 删除时间 | 仅回收站相关场景有意义 |
| `createdAt` | string(datetime) | 创建时间 | 创建时间 |
| `updatedAt` | string(datetime) | 更新时间 | 最后更新时间 |

### 6.3 笔记本对象 `NotebookResponse`

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `id` | string | 笔记本 ID | 主键 |
| `organizationId` | string | 组织 ID | 所属组织 |
| `name` | string | 笔记本名称 | 前端展示名 |
| `isDefault` | boolean | 是否默认笔记本 | 默认笔记本不可删除/修改/移动 |
| `notebookPosition` | integer | 排序位置 | 列表顺序控制 |
| `noteCount` | long | 笔记数量 | 该笔记本下笔记数 |
| `createdAt` | string(datetime) | 创建时间 | 创建时间 |
| `updatedAt` | string(datetime) | 更新时间 | 更新时间 |

### 6.4 笔记详情对象 `NoteDetailResponse`

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `id` | string | 笔记 ID | 主键 |
| `notebookId` | string | 笔记本 ID | 所属笔记本 |
| `notebookName` | string | 笔记本名称 | 展示用 |
| `documentId` | string | 文档 ID | 正文对应文档 |
| `organizationId` | string | 组织 ID | 所属组织 |
| `title` | string | 标题 | 笔记标题 |
| `type` | string | 笔记类型 | 见 `type` 枚举 |
| `status` | string | 笔记状态 | 见 `status` 枚举 |
| `isStarred` | boolean | 是否收藏 | 收藏状态 |
| `content` | string | 正文内容 | 文本/大纲/手写主要使用；通常为 JSON 字符串 |
| `voiceNote` | array<VoiceNoteFileArchiveResponse> | 语音文件列表 | 语音笔记使用 |
| `deletedAt` | string(datetime) | 删除时间 | 仅删除状态有值 |
| `createdAt` | string(datetime) | 创建时间 | 创建时间 |
| `updatedAt` | string(datetime) | 更新时间 | 更新时间 |

### 6.5 语音文件对象 `VoiceNoteFileArchiveResponse`

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `fileId` | string | 文件 ID | 语音文件标识 |
| `audioUrl` | string | 音频地址 | 文件访问地址 |
| `transcript` | string | 转写文本 | 该文件的转写结果 |
| `language` | string | 语言 | 转写语言 |
| `transcriptStatus` | string | 转写状态 | 见 `transcriptStatus` 枚举 |
| `createdAt` | string(datetime) | 创建时间 | 创建时间 |
| `updatedAt` | string(datetime) | 更新时间 | 更新时间 |

---

## 7. 接口清单总览

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/health` | 健康检查 |
| POST | `/v1/note/login` | 登录 |
| GET | `/v1/note/notebooks` | 笔记本分页列表 |
| POST | `/v1/note/notebooks` | 创建笔记本 |
| PUT | `/v1/note/notebooks/{id}` | 修改笔记本名称 |
| POST | `/v1/note/notebooks/{id}/move-up` | 笔记本上移 |
| POST | `/v1/note/notebooks/{id}/move-down` | 笔记本下移 |
| DELETE | `/v1/note/notebooks/{id}` | 删除笔记本 |
| POST | `/v1/note/notes` | 创建笔记 |
| GET | `/v1/note/notes` | 笔记分页列表 |
| GET | `/v1/note/search` | 搜索笔记 |
| GET | `/v1/note/notes/{id}` | 笔记详情 |
| PATCH | `/v1/note/name/{id}` | 修改标题 |
| PATCH | `/v1/note/content/{id}` | 修改正文 |
| POST | `/v1/note/move/{id}` | 移动笔记 |
| POST | `/v1/note/notes/{id}/star` | 收藏笔记 |
| POST | `/v1/note/notes/{id}/unstar` | 取消收藏 |
| POST | `/v1/note/notes/star` | 收藏笔记分页 |
| GET | `/v1/note/myshare/notes` | 我分享的笔记分页 |
| POST | `/v1/note/notes/{id}/delete` | 软删除笔记 |
| GET | `/v1/note/recycle-bin` | 回收站分页 |
| POST | `/v1/note/notes/recycle-bin/restore` | 批量恢复 |
| POST | `/v1/note/notes/recycle-bin/delete` | 批量彻底删除 |
| GET | `/v1/note/notes/{id}/history` | 笔记历史版本 |
| GET | `/v1/note/user` | 搜索用户 |
| POST | `/v1/note/shares` | 创建分享 |
| GET | `/v1/note/shares/{shareCode}` | 查看分享详情 |
| POST | `/v1/note/shares/{shareCode}/save` | 保存分享笔记 |
| DELETE | `/v1/note/shares/{shareCode}` | 取消分享 |
| POST | `/v1/note/voice-notes/upload` | 上传语音文件 |
| POST | `/v1/note/voice-notes/transcribe` | 触发语音转写 |
| GET | `/v1/note/voice-notes/search` | 搜索语音笔记 |
| GET | `/v1/note/voice-notes/files/{fileId}` | 下载/预览语音文件 |
| POST | `/v1/note/ai/chat` | AI 对话 |
| GET | `/v1/note/ai/conversations/{noteId}` | 查询 AI 会话 |

---

## 8. 详细接口定义

### 8.1 健康检查

**GET** `/health`

#### 返回
```json
{ "status": "ok" }
```

---

### 8.2 登录

**POST** `/v1/note/login`

#### 是否需要登录
否

#### 请求体 `LoginRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `appId` | string | 是 | 应用 ID |
| `code` | string | 是 | 授权码 / 一次性凭证 |
| `authType` | string | 是 | 认证方式 |
| `redirectUri` | string | 是 | 回调地址 |

#### 返回
- HTTP `204 No Content`
- 无 body
- 写入 Cookie：
  - `cloud_doc_token`
  - `cloud_doc_userid`
  - `cloud_doc_appid`

#### 前端说明
前端不要按 JSON body 解析该接口，应以 Cookie 登录态是否写入为准。

---

### 8.2.1 文档访问 JWT

**POST** `/v1/note/api/accesstoken/jwt`

#### 是否需要登录
是

#### Header

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `appId` | string | 是 | 当前应用 ID |
| `userId` | string | 是 | 当前用户 ID |
| `token` | string | 是 | 当前登录态 token，会参与 SCC `SHA-256` 摘要 |

也可复用登录后写入的 Cookie：
- `cloud_doc_appid`
- `cloud_doc_userid`
- `cloud_doc_token`

#### 请求体 `JwtAccessTokenRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `documentId` | string | 否 | 目标文档 ID |

#### 语义说明
- `note-server` 的 `noteId` 与 `content-server` 的 `documentId` 已对齐，二者是同一个值。
- 因此这里传入的 `documentId`，实际应直接使用笔记 ID。
- 当传入 `documentId` 时，服务会根据当前用户与该文档的关系生成 `doc.authType`：
  - 笔记 owner 返回 `EDIT`
  - 有分享访问权限的用户返回 `READ`
- JWT 中的 `versionNo` 来自 Redis；只有按 `(appId, userId, sccHashSha256(token))` 查到值时才会写入 claim。

#### 返回 `ApiResponse<JwtAccessTokenResponse>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `token` | string | 生成的 JWT |
| `expiration` | long | 过期时间，秒级时间戳 |

#### JWT Claim 说明

| Claim | 类型 | 说明 |
|---|---|---|
| `sub.appId` | string | 应用 ID |
| `sub.userId` | string | 用户 ID |
| `doc.documentId` | string | 文档 ID；值与笔记 `id` 相同 |
| `doc.authType` | string | `READ` / `EDIT` |
| `exp` | long | 过期时间，默认当前时间 + 24 小时 |
| `versionNo` | string | 可选，Redis 中读取到的版本号 |

---

### 8.3 笔记本分页列表

**GET** `/v1/note/notebooks`

#### Query 参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `page` | integer | 否 | 1 | 页码 |
| `pageSize` | integer | 否 | 10 | 每页条数 |

#### 返回 `ApiResponse<NotebookPageResponse>`

`data` 结构：

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array<NotebookResponse> | 笔记本列表 |
| `total` | long | 总数 |
| `page` | long | 当前页 |
| `size` | long | 每页条数 |

`items[]` 字段见 `NotebookResponse`。

---

### 8.4 创建笔记本

**POST** `/v1/note/notebooks`

#### 请求体 `CreateNotebookRequest`

| 字段 | 类型 | 必填 | 约束 | 说明 |
|---|---|---:|---|---|
| `name` | string | 是 | 最大 100 字符 | 笔记本名称 |

#### 返回 `ApiResponse<NotebookResponse>`

`data` 字段见 `NotebookResponse`。

---

### 8.5 修改笔记本名称

**PUT** `/v1/note/notebooks/{id}`

#### Path 参数

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 笔记本 ID |

#### 请求体 `UpdateNotebookRequest`

| 字段 | 类型 | 必填 | 约束 | 说明 |
|---|---|---:|---|---|
| `name` | string | 是 | 最大 100 字符 | 新笔记本名称 |

#### 返回 `ApiResponse<NotebookResponse>`

---

### 8.6 笔记本上移

**POST** `/v1/note/notebooks/{id}/move-up`

#### 返回
`ApiResponse<NotebookResponse>`

---

### 8.7 笔记本下移

**POST** `/v1/note/notebooks/{id}/move-down`

#### 返回
`ApiResponse<NotebookResponse>`

---

### 8.8 删除笔记本

**DELETE** `/v1/note/notebooks/{id}`

#### 前置规则
- 默认笔记本不能删除
- 笔记本下存在活跃笔记时不能删除

#### 返回
`ApiResponse<Void>`

---

### 8.9 创建笔记

**POST** `/v1/note/notes`

#### 请求体 `CreateNoteRequest`

| 字段 | 类型 | 必填 | 约束 | 说明 |
|---|---|---:|---|---|
| `title` | string | 是 | 最大 200 字符 | 标题 |
| `type` | string | 是 | 见 `type` 枚举 | 笔记类型 |
| `notebookId` | string | 否 |  | 目标笔记本 ID；不传时放入默认笔记本 |
| `content` | string | 否 |  | 初始正文，通常为文档 JSON 字符串 |

#### 返回 `ApiResponse<NoteCreatedResponse>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 笔记 ID |
| `notebookId` | string | 笔记本 ID |
| `notebookName` | string | 笔记本名称 |
| `documentId` | string | 文档 ID |
| `organizationId` | string | 组织 ID |
| `title` | string | 标题 |
| `type` | string | 笔记类型 |
| `status` | string | 笔记状态 |
| `isStarred` | boolean | 是否收藏 |
| `createdAt` | string(datetime) | 创建时间 |
| `updatedAt` | string(datetime) | 更新时间 |

---

### 8.10 笔记分页列表

**GET** `/v1/note/notes`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `notebookId` | string | 否 | 按笔记本筛选 |
| `status` | string | 否 | `active` / `deleted` |
| `orderBy` | integer | 否 | 排序字段，见 `orderBy` 枚举 |
| `desc` | integer | 否 | 排序方向，见 `desc` 枚举 |
| `page` | integer | 否 | 页码 |
| `pageSize` | integer | 否 | 每页条数 |

#### 返回 `ApiResponse<NotePageResponse>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array<NoteSummaryResponse> | 当前页笔记 |
| `total` | long | 总数 |
| `page` | long | 当前页 |
| `size` | long | 每页条数 |

---

### 8.11 搜索笔记

**GET** `/v1/note/search`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `keyword` | string | 是 | 搜索关键词 |
| `page` | integer | 否 | 页码 |
| `pageSize` | integer | 否 | 每页条数 |

#### 返回
`ApiResponse<NotePageResponse>`

---

### 8.12 笔记详情

**GET** `/v1/note/notes/{id}`

#### 返回类型
**不是** `ApiResponse`，直接返回 `NoteDetailResponse`

#### Path 参数

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 笔记 ID |

#### Query 参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `withContent` | boolean | 否 | `true` | 是否返回正文内容 |

#### 返回字段
见 `NoteDetailResponse`。

---

### 8.13 修改笔记标题

**PATCH** `/v1/note/name/{id}`

#### 请求体 `UpdateNoteNameRequest`

| 字段 | 类型 | 必填 | 约束 | 说明 |
|---|---|---:|---|---|
| `name` | string | 是 | 最大 200 字符 | 新标题 |

#### 返回
`ApiResponse<Void>`

---

### 8.14 修改笔记正文

**PATCH** `/v1/note/content/{id}`

#### 请求体 `UpdateNoteContentRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `content` | string | 是 | 新正文内容，通常为文档 JSON 字符串 |

#### 返回
`ApiResponse<Void>`

---

### 8.15 移动笔记

**POST** `/v1/note/move/{id}`

#### 请求体 `MoveNoteRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `notebookId` | string | 是 | 目标笔记本 ID |

#### 返回
`ApiResponse<Void>`

---

### 8.16 收藏笔记

**POST** `/v1/note/notes/{id}/star`

#### 返回
`ApiResponse<Void>`

---

### 8.17 取消收藏

**POST** `/v1/note/notes/{id}/unstar`

#### 返回
`ApiResponse<Void>`

---

### 8.18 收藏笔记分页

**POST** `/v1/note/notes/star`

> 注意：这是 `POST`，但参数来源文档中标记为 query。

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | integer | 否 | 页码 |
| `pageSize` | integer | 否 | 每页条数 |
| `orderBy` | integer | 否 | 排序字段 |
| `desc` | integer | 否 | 排序方向 |

#### 返回 `ApiResponse<StarredNotesPageResponse>`

`data` 结构与 `NotePageResponse` 类似：

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array<NoteSummaryResponse> | 收藏笔记列表 |
| `total` | long | 总数 |
| `page` | long | 当前页 |
| `size` | long | 每页条数 |

---

### 8.19 我分享的笔记分页

**GET** `/v1/note/myshare/notes`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | integer | 否 | 页码 |
| `pageSize` | integer | 否 | 每页条数 |
| `orderBy` | integer | 否 | 排序字段 |
| `desc` | integer | 否 | 排序方向 |

#### 返回 `ApiResponse<MyShareNotesPageResponse>`

`data.items[]` 为 `MyShareNoteItemResponse`：

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `id` | string | 笔记 ID | 被分享的笔记 |
| `title` | string | 标题 | 笔记标题 |
| `type` | string | 类型 | 笔记类型 |
| `isStarred` | boolean | 是否收藏 | 收藏状态 |
| `createdAt` | string(datetime) | 创建时间 | 创建时间 |
| `updatedAt` | string(datetime) | 更新时间 | 更新时间 |
| `shareCode` | string | 分享码 | 分享唯一标识 |
| `shareType` | string | 分享类型 | `all` / `pointed` |

---

### 8.20 软删除笔记

**POST** `/v1/note/notes/{id}/delete`

#### 返回
`ApiResponse<Void>`

---

### 8.21 回收站分页

**GET** `/v1/note/recycle-bin`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | integer | 否 | 页码 |
| `pageSize` | integer | 否 | 每页条数 |
| `orderBy` | integer | 否 | 排序字段 |
| `desc` | integer | 否 | 排序方向 |

#### 返回 `ApiResponse<RecycleBinPageResponse>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `list` | array<NoteSummaryResponse> | 回收站笔记列表 |
| `total` | long | 总数 |
| `page` | long | 当前页 |
| `size` | long | 每页条数 |

---

### 8.22 批量恢复回收站笔记

**POST** `/v1/note/notes/recycle-bin/restore`

#### 请求体 `BatchIdsRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `ids` | array<string> | 是 | 要恢复的笔记 ID 列表 |

#### 返回
`ApiResponse<Void>`

---

### 8.23 批量彻底删除回收站笔记

**POST** `/v1/note/notes/recycle-bin/delete`

#### 请求体 `BatchIdsRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `ids` | array<string> | 是 | 要彻底删除的笔记 ID 列表 |

#### 返回
`ApiResponse<Void>`

---

### 8.24 查询笔记历史版本

**GET** `/v1/note/notes/{id}/history`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | integer | 否 | 页码 |
| `pageSize` | integer | 否 | 每页条数 |

#### 返回 `ApiResponse<NoteHistoryPageResponse>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array<NoteHistoryResponse> | 历史版本列表 |
| `total` | long | 总数 |
| `page` | long | 当前页 |
| `size` | long | 每页条数 |

`items[]`：

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `version` | string | 版本号 | 历史版本标识 |
| `data` | string | 版本数据 | 版本内容 |
| `userId` | string | 操作人 ID | 修改该版本的用户 |

---

### 8.25 搜索用户

**GET** `/v1/note/user`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `searchText` | string | 是 | 用户搜索关键字 |
| `page` | integer | 否 | 页码 |
| `pageSize` | integer | 否 | 每页条数 |

#### 返回 `ApiResponse<UserSearchResponse>`

`data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `total` | long | 总数 |
| `page` | long | 当前页 |
| `size` | long | 每页条数 |
| `data` | array<UserSearchItemResponse> | 用户列表 |

`data[]`：

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `oneAccessUserId` | string | OneAccess 用户 ID | 外部认证用户标识 |
| `userName` | string | 用户名 | 登录名/账号名 |
| `nickName` | string | 昵称 | 展示昵称 |
| `profileUrl` | string | 头像地址 | 用户头像 |
| `available` | integer | 是否可用 | 可用状态，具体含义以前端展示规则为准 |
| `isAdmin` | integer | 是否管理员 | 管理员标记 |
| `lowestDept` | string | 最低层级部门 | 部门信息 |
| `email` | string | 邮箱 | 用户邮箱 |

---

### 8.26 创建分享

**POST** `/v1/note/shares`

#### 请求体 `CreateShareRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `noteId` | string | 是 | 要分享的笔记 ID |
| `userList` | array<string> | 条件必填 | 定向分享时的用户 ID 列表 |
| `expiresAt` | string(datetime) | 否 | 分享过期时间 |

#### 补充说明
- `shareType` 在业务规则中存在，值支持 `all` / `pointed`
- 当前从已提取请求对象里可明确看到 `noteId`、`userList`、`expiresAt`
- 若前端需要传 `shareType`，建议以现有后端 Controller 实际定义为准做最后联调确认

#### 返回 `ApiResponse<ShareCreatedResponse>`

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `shareCode` | string | 分享码 | 分享唯一标识 |
| `shareUrl` | string | 分享链接 | 可直接访问的 URL |
| `expiresAt` | string(datetime) | 过期时间 | 分享失效时间 |

---

### 8.27 查看分享详情

**GET** `/v1/note/shares/{shareCode}`

#### 是否需要登录
否（公开接口）

#### 返回类型
直接返回 `SharedNoteResponse`，**不是** `ApiResponse`

#### 返回字段

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `shareCode` | string | 分享码 | 唯一标识 |
| `id` | string | 笔记 ID | 被分享的笔记 ID |
| `title` | string | 标题 | 笔记标题 |
| `type` | string | 类型 | 见 `type` 枚举 |
| `content` | string | 正文 | 文本内容 |
| `voiceNote` | array<VoiceNoteFileArchiveResponse> | 语音文件列表 | 语音笔记使用 |
| `notebookName` | string | 笔记本名称 | 来源笔记本 |
| `updatedAt` | string(datetime) | 更新时间 | 最近更新时间 |

---

### 8.28 保存分享笔记到我的空间

**POST** `/v1/note/shares/{shareCode}/save`

#### 请求体 `SaveSharedNoteRequest`

| 字段 | 类型 | 必填 | 约束 | 说明 |
|---|---|---:|---|---|
| `notebookId` | string | 否 | 最大 36 字符 | 目标笔记本 ID；不传则由后端按默认规则处理 |

#### 返回
`ApiResponse<NoteDetailResponse>`

---

### 8.29 取消分享

**DELETE** `/v1/note/shares/{shareCode}`

#### 返回
`ApiResponse<Void>`

---

### 8.30 上传语音文件

**POST** `/v1/note/voice-notes/upload`

#### Content-Type
`multipart/form-data`

#### 表单字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `noteId` | string | 是 | 语音笔记对应的 note ID |
| `file` | file | 是 | 音频文件 |

#### 返回 `ApiResponse<VoiceNoteUploadResponse>`

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `fileId` | string | 文件 ID | 后续转写要用 |
| `url` | string | 文件地址 | 音频访问地址 |
| `duration` | int | 时长 | 音频时长 |
| `size` | long | 大小 | 文件大小 |
| `storageType` | string | 存储类型 | 当前可见值为 `content` |

---

### 8.31 触发语音转写

**POST** `/v1/note/voice-notes/transcribe`

#### 请求体 `VoiceNoteTranscribeRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `fileId` | string | 是 | 已上传文件的 ID |

#### 返回 `ApiResponse<VoiceNoteTranscriptionResponse>`

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `transcript` | string | 转写文本 | 若已完成可直接展示 |
| `status` | string | 转写状态 | `pending` / `processing` / `completed` / `failed` |

---

### 8.32 搜索语音笔记

**GET** `/v1/note/voice-notes/search`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `keyword` | string | 是 | 搜索关键词 |
| `page` | integer | 否 | 页码 |
| `pageSize` | integer | 否 | 每页条数 |

#### 返回 `ApiResponse<VoiceNoteSearchPageResponse>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array<VoiceNoteSearchItemResponse> | 搜索结果 |
| `total` | long | 总数 |
| `page` | long | 当前页 |
| `size` | long | 每页条数 |

`items[]`：

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `noteId` | string | 笔记 ID | 语音笔记 ID |
| `title` | string | 标题 | 笔记标题 |
| `notebookId` | string | 笔记本 ID | 所属笔记本 |
| `audioUrl` | string | 音频地址 | 音频访问地址 |
| `audioDuration` | integer | 音频时长 | 时长 |
| `audioSize` | long | 音频大小 | 文件大小 |
| `language` | string | 语言 | 转写语言 |
| `transcriptStatus` | string | 转写状态 | 见枚举 |
| `transcriptPreview` | string | 转写摘要 | 搜索命中的预览片段 |
| `createdAt` | string(datetime) | 创建时间 | 创建时间 |
| `updatedAt` | string(datetime) | 更新时间 | 更新时间 |

---

### 8.33 下载/预览语音文件

**GET** `/v1/note/voice-notes/files/{fileId}`

#### 返回
文件流 `ResponseEntity<Resource>`

#### 前端说明
前端应按文件下载或音频预览处理，而不是按 JSON 解析。

---

### 8.33.1 实时语音会话

这组接口用于创建和管理实时语音转写 session；真正的音频流通过 WebSocket 发送。

#### 1. 创建会话

**POST** `/v1/note/voice-realtime/sessions`

请求体 `CreateVoiceRealtimeSessionRequest`：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|---|---|---:|---|---|
| `noteId` | string | 是 | 最大 64 字符 | 关联的语音笔记 ID |
| `language` | string | 否 | 最大 16 字符 | 语音语言，如 `zh_CN` |

返回 `ApiResponse<VoiceRealtimeSessionResponse>`，关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | string | 实时会话 ID |
| `noteId` | string | 对应笔记 ID |
| `status` | string | `opened` / `streaming` / `paused` / `finished` / `archived` / `failed` |
| `audioMimeType` | string | 当前音频 MIME 类型 |
| `partialTranscript` | string | 当前未切段的实时文本 |
| `finalTranscript` | string | 已提交的最终文本 |
| `receivedBytes` | long | 已接收音频字节数 |
| `lastSequence` | integer | 当前音频片段序号 |
| `websocketPath` | string | WebSocket 路径，格式为 `/v1/note/voice-realtime/ws?sessionId=...` |
| `segmentSilenceMs` | long | 切段静音阈值，毫秒 |

#### 2. 查询会话

**GET** `/v1/note/voice-realtime/sessions/{sessionId}`

返回：`ApiResponse<VoiceRealtimeSessionResponse>`

#### 3. 暂停会话

**POST** `/v1/note/voice-realtime/sessions/{sessionId}/pause`

返回：`ApiResponse<VoiceRealtimeSessionResponse>`

#### 4. 恢复会话

**POST** `/v1/note/voice-realtime/sessions/{sessionId}/resume`

返回：`ApiResponse<VoiceRealtimeSessionResponse>`

#### 5. 结束会话

**POST** `/v1/note/voice-realtime/sessions/{sessionId}/finish`

返回：`ApiResponse<VoiceRealtimeSessionResponse>`

---

### 8.33.2 实时语音 WebSocket

**WS** `/v1/note/voice-realtime/ws`

#### 用途
- 向后端持续发送实时音频二进制流
- 接收服务端推送的转写状态与文本事件

#### 握手 Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `appId` | string | 是 | 当前应用 ID |
| `userId` | string | 是 | 当前用户 ID |
| `token` | string | 是 | 当前登录态 token |
| `sessionId` | string | 是 | 由创建实时语音会话接口返回 |
| `mimeType` | string | 否 | 音频 MIME 类型，如 `audio/webm` |

#### 握手规则
- WebSocket 握手阶段会校验 `appId/userId/token`
- `token` 校验通过后才允许建立连接
- `sessionId` 必填，且必须属于当前登录用户

#### 客户端发送消息

1. 二进制消息

- 直接发送音频字节流，服务端按收到的二进制 frame 追加音频数据。

2. 文本消息

文本消息为 JSON，对应格式如下：

```json
{ "type": "config", "mimeType": "audio/webm" }
```

支持的 `type`：

| `type` | 说明 |
|---|---|
| `config` | 更新或声明当前音频 `mimeType`，并触发会话进入可流式状态 |
| `pause` | 暂停实时转写 |
| `resume` | 恢复实时转写；可携带新的 `mimeType` |
| `finish` | 结束会话，服务端返回最终事件后主动关闭连接 |

#### 服务端推送事件

服务端统一返回 JSON，对应 `VoiceRealtimeTranscriptEventResponse`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | string | 事件类型 |
| `sessionId` | string | 会话 ID |
| `status` | string | 当前会话状态 |
| `transcript` | string | 当前实时文本 |
| `finalTranscript` | string | 已提交的最终文本 |
| `audioMimeType` | string | 当前音频 MIME 类型 |
| `receivedBytes` | long | 已接收音频字节数 |
| `sequence` | integer | 当前音频片段序号 |
| `isFinal` | boolean | 是否最终事件 |
| `error` | string | 错误信息 |
| `segmentIndex` | integer | 当前切段序号 |
| `segmentTranscript` | string | 本次静音切段提交的文本 |
| `silenceMs` | long | 已检测到的静音时长 |
| `segmentSilenceMs` | long | 切段静音阈值 |

常见 `type`：

| 事件类型 | 说明 |
|---|---|
| `session.ready` | 连接建立或配置完成，可开始送音频 |
| `session.resumed` | 会话已恢复 |
| `session.paused` | 会话已暂停 |
| `session.finished` | 会话结束 |
| `transcript.partial` | 返回当前实时转写片段 |
| `transcript.segment` | 达到静音阈值后，服务端将一段文本提交为最终片段 |

#### 前端接入建议

1. 先调用 `POST /v1/note/voice-realtime/sessions` 获取 `sessionId`
2. 再使用返回的 `sessionId` 建立 WebSocket 连接
3. 建连后可先发一次 `config`，随后持续发送音频二进制数据
4. 收到 `transcript.segment` 时可将 `segmentTranscript` 作为一张语音卡片或一段已确认文本展示
5. 结束录音时发送 `finish`，或调用 HTTP `finish` 接口做兜底收尾

---

### 8.34 AI 对话

**POST** `/v1/note/ai/chat`

#### 请求体 `AiChatRequest`

| 字段 | 类型 | 必填 | 约束 | 说明 |
|---|---|---:|---|---|
| `noteId` | string | 是 | 最大 64 字符 | 用作上下文的笔记 ID |
| `scene` | string | 是 | `extraction` / `summarize` / `rewrite` / `expand` | 指定 AI 处理场景 |
| `user_prompt` | string | 是 | 最大 2000 字符 | 用户给 AI 的问题/要求 |

#### 返回 `ApiResponse<AiChatResponse>`

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `result` | string | AI 结果 | 模型生成文本 |
| `prompt` | string | 系统提示词 | 最终使用的提示词 |
| `conversationId` | string | 会话 ID | `summarize` / `rewrite` / `expand` 场景返回；`extraction` 不返回 |

说明：
1. `scene=extraction` 时，`noteId` 必须对应语音笔记，后端会聚合该笔记下所有 `transcript_status=completed` 的语音转录内容，返回 Markdown 分点总结。
2. `scene=extraction` 不创建也不返回 AI 会话，因此后续查询会话接口无法还原该次结果。
3. `scene=summarize`、`rewrite`、`expand` 仍沿用按笔记维度保存会话历史的逻辑。

---

### 8.35 查询 AI 会话

**GET** `/v1/note/ai/conversations/{noteId}`

#### 返回 `ApiResponse<AiConversationResponse>`

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `conversationId` | string | 会话 ID | 会话主键 |
| `noteId` | string | 笔记 ID | 对应笔记 |
| `title` | string | 会话标题 | 对话标题 |
| `status` | integer | 会话状态 | 当前可见值为 `1` |
| `createdAt` | string(datetime) | 创建时间 | 创建时间 |
| `updatedAt` | string(datetime) | 更新时间 | 更新时间 |
| `messages` | array<AiConversationMessageResponse> | 消息列表 | 会话消息 |

`messages[]`：

| 字段 | 类型 | 中文名称 | 说明 |
|---|---|---|---|
| `messageId` | string | 消息 ID | 消息主键 |
| `role` | string | 角色 | `system` / `user` / `assistant` |
| `content` | string | 内容 | 消息正文 |
| `extra` | string | 扩展信息 | 额外元数据 |
| `createdAt` | string(datetime) | 创建时间 | 消息时间 |

---

## 9. 前端联调重点提醒

1. **不要假设所有接口都是 `ApiResponse`**
   - `POST /v1/note/login`：204，无 body
   - `GET /v1/note/notes/{id}`：直接返回详情对象
   - `GET /v1/note/shares/{shareCode}`：直接返回分享详情对象
   - `GET /v1/note/voice-notes/files/{fileId}`：返回文件流

2. **默认笔记本不可操作**
   - 不可删除
   - 不可修改
   - 不可移动

3. **语音笔记通常是两段式接入**
   - 先创建 `type=voice` 的笔记
   - 再上传音频
   - 再触发转写

4. **AI 场景需要前端明确传入**
   - 使用 `scene` 指定 `extraction` / `summarize` / `rewrite` / `expand`
   - 后端不再根据 `user_prompt` 自动推断任务类型

5. **分享接口存在业务侧约束**
   - 定向分享必须带用户列表
   - 分享可过期
   - 匿名访问分享详情时，若是定向分享仍可能失败

---

## 10. 待联调确认项

以下信息在当前可见源码/提取文档中存在一定不确定性，联调前建议再与后端确认：

1. `CreateShareRequest` 是否在实际 Controller 中显式包含 `shareType`
2. 分页默认值是否全局统一（个别接口默认排序值可能不同）
3. `content` 字段的具体 JSON 协议，是否完全透传 content-server 文档结构
4. 用户搜索接口中 `available`、`isAdmin` 的 0/1 语义
5. 日期时间字段的具体序列化格式（`yyyy-MM-dd HH:mm:ss` / ISO8601 等）
