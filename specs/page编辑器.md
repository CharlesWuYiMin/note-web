下面是文笔笔记的编辑器，当前没有获取到singkey，使用离线默认（关闭协同），用户token打桩。

使用文本笔记编辑器的demo
import {KooEditor, CreateEditorOptions} from '@cloud/koopage-editor-sdk'
// 文档信息
const doc = {
 // 文档ID，通过创建文档接口获得
 docId: "32b5918c-8c55-45e5-b726-549c55c981e0",
 // 文档类型
 docType: "document"
}
// 此处仅为示例，具体详情见 4.1 基础选项
const auth = () => {
 return {
 // 用户ID
 userId: "c107f3dde95a44e893026d1d11a2b8b6",
 // 用户Token
 token: "xxxxxxxx",
 // 用户归属应用ID
 appId: "20221018154303010-64A1-AB636CB87",
 // 用户信息
 user: {
 // 用户ID
 id: "c107f3dde95a44e893026d1d11a2b8b6",
 // 用户账号
 name:"z00100000",
 // 用户姓名
 realName: "张三",
 // 用户头像
 avatar:"https://******.com/w3lab/rest/yellowpage/face/1000000/120"
 }
 }
}
// 创建编辑器实例
KooEditor.create({
 // 设置编辑器挂载点
 element: document.getElementById("editor"),
 // 设置文档打开模式为可编辑模式
 editable: true,
 // 设置需要打开的文档信息
 document: doc,
 // 设置打开文档的用户信息
 auth: auth,
 // 设置需要加载的文档块
 extensions: {
 LocalKit: true,
 ServerKit: true
 },
 // 编辑器环境信息，请按照实际情况填写，下面的地址信息是以物理多租环境举例，若第三方对接的是逻辑多
租环境，填写editorUrl和collaborationUrl时域名后需要加上租户ID，例如：
collaborationUrl: "wss://koopagedev.clouddocs.huawei.com/ws"
 env: {
 editorUrl: "https://koopagedev.clouddocs.huawei.com/editor",
 aiUrl: "https://koopagedev.clouddocs.huawei.com/kooai/api",
 apiUrl: "/api",
 collaborationUrl: "wss://koopagedev.clouddocs.huawei.com/koopage/ws",
 obsPrefix: "https://koopage-obs-public.obs.cn-north-7.ulanqab.huawei.com",
 DataAccessURL: ""
 }，
 settings: {
 link: {
 onOpen: (url)=>{}
 }
 }
}).then(editor => {
 window.editor = editor;
})


#编辑器基础选项
为您整理后的 Markdown 表格。为了清晰起见，我将 **`document`** 的内部结构直接详细列出，并同步保留了其他配置项。

### 云文档编辑器初始化配置表


### 表 4-1 编辑器基础选项

| 选项名称 | 选项类型 | 是否必选 | 默认值 | 选项说明 |
| :--- | :--- | :---: | :--- | :--- |
| **element** | `HTMLElement` | **是** | - | 编辑器挂载的 DOM 节点。 |
| **document** | `Object` | **是** | - | **编辑器需要打开的文档信息：**<br>• `docId`: 文档 ID (`string`)<br>• `docType`: 文档类型，`document` 为云文档，`template` 为模板<br>• `orgId?`: 文档归属组织 ID (可选)<br>• `wikiId?`: 文档归属知识库 ID (可选) |
| **auth** | `Function` | **是** | - | **打开文档需要的用户信息回调，返回：**<br>• `appId`: 应用 ID<br>• `userId`: 用户 ID<br>• `token`: 用户 Token<br>• `user?`: 用户基本信息（含 `id`, `name`, `realName`, `avatar`）<br>• `extraData?`: 第三方自定义消息头扩展参数 |
| **editable** | `Boolean` | 否 | `true` | **编辑器打开模式：**<br>• `true`: 可编辑模式<br>• `false`: 只读模式（预览模式） |
| **extensions** | `Object` | **是** | - | **编辑器文档块配置：**<br>`{[kit: string]: boolean \| ExtensionConfig}`<br>如 `{ LocalKit: true, ServerKit: true }` 为基础配置，默认填 `true` 即可。 |
| **content** | `HTMLContent` \| `JSONContent` | 否 | `undefined` | 文档内容。如果设置此参数，文档打开时内容会被还原为该设置值。 |
| **languages** | `en-US` \| `zh-CN` | 否 | `zh-CN` | 语言选择，默认为中文。 |
| **theme** | `String` | 否 | - | 设置编辑器主题，目前支持 `light`、`dark`。默认取浏览器主题设置。 |
| **env** | `Partial` | **是** | - | 编辑器连接的环境信息。 |
| **autofocus** | `Boolean` | 否 | - | **光标是否自动聚焦：**<br>• `true`: 创建后自动聚焦<br>• `false`: 不自动聚焦，点击后才聚焦<br>• 未设置时：空文档默认自动聚焦，非空文档不自动聚焦。 |
| **mode** | `Number` | 否 | - | **编辑器模式（位域控制）：**<br>从右到左每一位代表一种模式：<br>• 第一位：定义模式（设置为 1）<br>• 第二位：修订模式（设置为 2） |
| **settings** | `Object` | 否 | - | **高级设置选项：**<br>• `resumeLastViewedPosition?`: `boolean`。是否跳转到上次浏览位置。需结合系统配置 `resumeLastViewedPositionWhenReopened` 共同判断。 |

### 表 4-2 extension 可支持配置信息

| 参数 | 含义 | 可配置内容 |
| :--- | :--- | :--- |
| **LocalKit** | 基础配置 | <ul><li>`link: {showPopOps: () => void}` 自定义链接 Block。</li><li>`textMenu`: 划词工具栏配置条款相关选项，详见**自定义合同条款**。</li><li>`composite`: 富文本配置相关，详见**自定义富文本**。</li></ul> |
| **ServerKit** | 部分自定义配置内容 | <ul><li>`mention`: 提及 Block（@ 功能），详见**自定义 @ 功能**。</li><li>`aiInsert`: AI 选项，Boolean 类型。</li><li>`comment`: 划词评论功能，详见**自定义划词评论**。</li></ul> |
| **ContractKit** | 合同配置相关，详见**自定义合同条款** | <ul><li>`contract`: 合同 Block 相关。</li><li>`variable`: 变量 Block 相关。</li></ul> |


### 表 4-4 编辑协同选项

| 选项名称 | 选项类型 | 是否必选 | 默认值 | 选项说明 |
| :--- | :--- | :---: | :--- | :--- |
| **disabledCollaborative** | `Boolean` | 否 | `false` | **是否关闭协同：**<br>• `true`: 关闭协同功能。<br>• `false`: 不关闭协同功能。 |
| **editableCollaborative** | `Boolean` | 否 | `true` | **是否以编辑方式打开协同：**<br>• `true`: 以编辑方式打开协同，**优先级高于基础选项中的 `editable`**。<br>• `false`: 以只读方式打开协同。 |

---

### 代码示例参考

```javascript
// 示例 1：关闭协同功能
KooEditor.create({
  disabledCollaborative: true
});

// 示例 2：只读方式打开文档，但允许以编辑方式打开协同（允许通过代码修改文档内容）
KooEditor.create({
  editable: false,
  editableCollaborative: true
});
```


编辑器地址信息：

根据您提供的图片内容，提取出的 `innovation` 节点 JSON 配置如下。由于图片右侧部分 URL 较长被遮挡或截断，标注了 `...` 的部分为根据上下文推断或截断处：

```json
"innovation": {
    "pathUrl": "https://innovation.huaweiapaas.com/koopage",
    "contentUrl": "https://innovation.huaweiapaas.com",
    "templateUrl": "https://innovation.huaweiapaas.com/template",
    "obsPrefix": "https://koospace.obs.cn-north-4.myhuaweicloud.com",
    "baseUrl": "/v1/note",
    "mindEditor": "https://innovation.huaweiapaas.com/mindeditor/",
    "boardEditor": "https://innovation.huaweiapaas.com/boardeditor/",
    "drawEditor": "https://innovation.huaweiapaas.com/draweditor/",
    "slideEditor": "https://innovation.huaweiapaas.com/slideeditor/",
    "collaborationUrl": "wss://innovation.huaweiapaas.com/koopage/mindboard/ws",
}
```

