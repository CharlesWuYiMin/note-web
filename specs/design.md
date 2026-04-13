﻿# 云笔�?- 设计文档

## 1. 项目概述

云笔记是一款支持多端协同的笔记应用，使用Electron框架实现同一代码库支持PC端、移动端、安卓和iOS平台，提供丰富的笔记类型和功能�?
### 1.1 核心功能

- 多端协同：支持PC端、移动端、安卓和iOS平台
- 多种笔记类型：文本笔记、大纲笔记、手写笔记、语音笔�?- 笔记本管理：支持创建、编辑、删除笔记本
- 回收站功能：支持笔记软删除和恢复
- AI助手：提供总结摘要、改写、扩写等智能功能
- 国际化支持：支持中文和英文两种语言
- 认证集成：对接蓝版Welink和IDaaS认证

### 1.2 技术架�?
- 前端：React 19 + Vite + Zustand + Ant Design
- 后端：Spring Boot 3.5.9 + MyBatis Plus + MySQL 8.0
- 认证：OAuth 2.0 + JWT
- 跨平台：Electron + React Native

## 2. 技术选型

### 2.1 前端技�?
- **框架**：React 19
- **构建工具**：Vite
- **状态管�?*：Redux Toolkit
- **路由**：React Router
- **国际�?*：react-i18next
- **UI 组件�?*：Ant Design
- **富文本编辑器**：Slate.js
- **图表�?*：ECharts（用于大纲笔记）
- **绘图�?*：Fabric.js（用于手写笔记）
- **语音处理**：Web Speech API + 第三方语音转文字服务
- **音频处理**：Howler.js（用于音频播放控制）
- **跨平�?*：Electron + React Native

### 2.2 后端技�?
- **框架**：Spring Boot 3.5.9
- **ORM**：MyBatis Plus
- **数据�?*：MySQL 8.0
- **认证**：OAuth 2.0 + JWT
- **API 文档**：Swagger 3
- **日志**：Logback
- **缓存**：Redis
- **消息队列**：RabbitMQ（可选）
- **音频处理**：FFmpeg（用于音频转换和处理�?- **对象存储**：OBS SDK（用于音频文件存储）

### 2.3 认证服务

- **框架**：Spring Boot
- **认证协议**：OAuth 2.0
- **集成**：蓝版Welink认证 + IDaaS认证

## 3. 目录结构

### 3.1 前端目录结构（note-web�?
```
note-web/
├── public/              # 静态资�?├── src/                # 源代�?�?  ├── assets/         # 资源文件
�?  ├── components/     # 组件
�?  ├── hooks/          # 自定义钩�?�?  ├── layouts/        # 布局
�?  ├── pages/          # 页面
�?  ├── services/       # API服务
�?  ├── store/          # Redux store
�?  ├── utils/          # 工具函数
�?  ├── App.jsx         # 应用入口
�?  └── main.jsx        # 主入�?├── config.json         # 配置文件
├── .env                # 环境变量
├── package.json        # 包配�?└── vite.config.js      # Vite配置
```

### 3.2 后端目录结构（note-server�?
```
note-server/
├── src/                # 源代�?�?  ├── main/           # 主代�?�?  �?  ├── java/       # Java代码
�?  �?  └── resources/  # 资源文件
�?  └── test/           # 测试代码
├── pom.xml             # Maven配置
└── application.yml     # 应用配置
```

## 4. 数据库设�?
### 4.1 核心表结�?
#### 4.1.1 租户表（tenant�?
| 字段�?         | 数据类型           | 约束                | 描述   |
| :----------- | :------------- | :---------------- | :--- |
| `id`         | `BIGINT`       | `PRIMARY KEY`     | 租户ID |
| `name`       | `VARCHAR(100)` | `NOT NULL`        | 租户名称 |
| `code`       | `VARCHAR(50)`  | `UNIQUE NOT NULL` | 租户编码 |
| `created_at` | `DATETIME`     | `NOT NULL`        | 创建时间 |
| `updated_at` | `DATETIME`     | `NOT NULL`        | 更新时间 |

#### 4.1.2 用户表（user�?
| 字段�?            | 数据类型           | 约束                | 描述    |
| :-------------- | :------------- | :---------------- | :---- |
| `id`            | `BIGINT`       | `PRIMARY KEY`     | 用户ID  |
| `tenant_id`     | `BIGINT`       | `FOREIGN KEY`     | 租户ID  |
| `username`      | `VARCHAR(100)` | `NOT NULL`        | 用户�?  |
| `email`         | `VARCHAR(100)` | `UNIQUE NOT NULL` | 邮箱    |
| `password_hash` | `VARCHAR(255)` | `NOT NULL`        | 密码哈希  |
| `avatar`        | `VARCHAR(255)` | <br />            | 头像URL |
| `created_at`    | `DATETIME`     | `NOT NULL`        | 创建时间  |
| `updated_at`    | `DATETIME`     | `NOT NULL`        | 更新时间  |

#### 4.1.3 笔记本表（notebook�?
| 字段�?          | 数据类型           | 约束                       | 描述      |
| :------------ | :------------- | :----------------------- | :------ |
| `id`          | `VARCHAR(100)` | `PRIMARY KEY`            | 笔记本ID   |
| `tenant_id`   | `BIGINT`       | `FOREIGN KEY`            | 租户ID    |
| `user_id`     | `BIGINT`       | `FOREIGN KEY`            | 用户ID    |
| `name`        | `VARCHAR(100)` | `NOT NULL`               | 笔记本名�?  |
| `description` | `VARCHAR(255)` | <br />                   | 笔记本描�?  |
| `is_default`  | `BOOLEAN`      | `NOT NULL DEFAULT FALSE` | 是否默认笔记�?|
| `created_at`  | `DATETIME`     | `NOT NULL`               | 创建时间    |
| `updated_at`  | `DATETIME`     | `NOT NULL`               | 更新时间    |

#### 4.1.4 笔记表（note�?
| 字段�?          | 数据类型           | 约束                          | 描述                                   |
| :------------ | :------------- | :-------------------------- | :----------------------------------- |
| `id`          | `VARCHAR(100)` | `PRIMARY KEY`               | 笔记ID                                 |
| `tenant_id`   | `BIGINT`       | `FOREIGN KEY`               | 租户ID                                 |
| `user_id`     | `BIGINT`       | `FOREIGN KEY`               | 用户ID                                 |
| `notebook_id` | `BIGINT`       | `FOREIGN KEY`               | 笔记本ID                                |
| `title`       | `VARCHAR(200)` | `NOT NULL`                  | 笔记标题                                 |
| `type`        | `VARCHAR(20)`  | `NOT NULL`                  | 笔记类型（text/outline/handwritten/voice�?|
| `status`      | `VARCHAR(20)`  | `NOT NULL DEFAULT 'active'` | 笔记状态（active/deleted�?                |
| `is_starred`  | `BOOLEAN`      | `NOT NULL DEFAULT FALSE`    | 是否星标                                 |
| `document_id` | `VARCHAR(100)` | `NOT NULL`                  | 内容服务文档ID                             |
| `created_at`  | `DATETIME`     | `NOT NULL`                  | 创建时间                                 |
| `updated_at`  | `DATETIME`     | `NOT NULL`                  | 更新时间                                 |

#### 4.1.5 语音笔记表（voice\_note�?
| 字段�?                | 数据类型           | 约束                              | 描述                                        |
| :------------------ | :------------- | :------------------------------ | :---------------------------------------- |
| `id`                | `BIGINT`       | `PRIMARY KEY`                   | 语音笔记ID                                    |
| `note_id`           | `BIGINT`       | `FOREIGN KEY`                   | 笔记ID                                      |
| `audio_url`         | `VARCHAR(500)` | `NOT NULL`                      | 音频文件URL                                   |
| `audio_duration`    | `INT`          | `NOT NULL`                      | 音频时长（秒�?                                  |
| `audio_size`        | `BIGINT`       | `NOT NULL`                      | 音频文件大小（字节）                                |
| `storage_type`      | `VARCHAR(20)`  | `NOT NULL DEFAULT 'filesystem'` | 存储类型（filesystem/OBS�?                     |
| `transcript`        | `LONGTEXT`     | <br />                          | 语音转文字内�?                                  |
| `language`          | `VARCHAR(10)`  | `NOT NULL`                      | 语言类型                                      |
| `transcript_status` | `VARCHAR(20)`  | `NOT NULL DEFAULT 'pending'`    | 转录状态（pending/processing/completed/failed�?|
| `created_at`        | `DATETIME`     | `NOT NULL`                      | 创建时间                                      |
| `updated_at`        | `DATETIME`     | `NOT NULL`                      | 更新时间                                      |

#### 4.1.6 分享表（share�?
| 字段�?         | 数据类型           | 约束                | 描述   |
| :----------- | :------------- | :---------------- | :--- |
| `id`         | `BIGINT`       | `PRIMARY KEY`     | 分享ID |
| `tenant_id`  | `BIGINT`       | `FOREIGN KEY`     | 租户ID |
| `note_id`    | `BIGINT`       | `FOREIGN KEY`     | 笔记ID |
| `share_code` | `VARCHAR(100)` | `UNIQUE NOT NULL` | 分享�? |
| `expires_at` | `DATETIME`     | <br />            | 过期时间 |
| `created_at` | `DATETIME`     | `NOT NULL`        | 创建时间 |
| `updated_at` | `DATETIME`     | `NOT NULL`        | 更新时间 |

#### 4.1.7 配置表（sys\_config�?
| 字段�?           | 数据类型           | 约束                | 描述   |
| :------------- | :------------- | :---------------- | :--- |
| `id`           | `BIGINT`       | `PRIMARY KEY`     | 配置ID |
| `tenant_id`    | `BIGINT`       | `FOREIGN KEY`     | 租户ID |
| `config_key`   | `VARCHAR(100)` | `UNIQUE NOT NULL` | 配置�? |
| `config_value` | `TEXT`         | `NOT NULL`        | 配置�? |
| `description`  | `VARCHAR(255)` | <br />            | 配置描述 |
| `created_at`   | `DATETIME`     | `NOT NULL`        | 创建时间 |
| `updated_at`   | `DATETIME`     | `NOT NULL`        | 更新时间 |

该表中初始化配置sql�?1 | 0000 | content\_server\_ip | <http://localhost:5002> | content服务域名 | now() | now()
2 | 0000 | authkit\_server\_ip | <http://localhost:8000> | authkit服务域名 | now() | now()
3 | 0000 | redirect\_uri      | <http://example>        | 登录跳转域名    | now() | now()

**语音AI模型配置�?*�?
| 配置�?                 | 配置�?                                                                 | 描述              |
| :------------------- | :------------------------------------------------------------------- | :-------------- |
| `voice.ai.enabled`   | `true`                                                               | 是否启用语音AI功能      |
| `voice.ai.model`     | `fun-asr`                                                            | 语音识别模型（fun-asr�?|
| `voice.ai.endpoint`  | `https://api.modelscope.cn/api/v1/services/audio/speech-recognition` | 模型服务端点          |
| `voice.ai.api_key`   | `your-api-key`                                                       | API访问密钥         |
| `voice.ai.languages` | `["zh-CN", "en-US"]`                                                 | 支持的语言列表         |
| `voice.ai.timeout`   | `30000`                                                              | 请求超时时间（毫秒）      |

#### 4.1.9 系统提示词表（ai\_prompt�?
| 字段�?         | 数据类型           | 约束                       | 描述           |
| :----------- | :------------- | :----------------------- | :----------- |
| `id`         | `BIGINT`       | `PRIMARY KEY`            | 提示词ID        |
| `tenant_id`  | `BIGINT`       | `FOREIGN KEY`            | 租户ID         |
| `task_type`  | `VARCHAR(50)`  | `NOT NULL`               | 任务类型         |
| `name`       | `VARCHAR(100)` | `NOT NULL`               | 提示词名�?       |
| `prompt`     | `TEXT`         | `NOT NULL`               | 提示词内�?       |
| `params`     | `JSON`         | <br />                   | 参数配置（JSON格式�?|
| `is_default` | `BOOLEAN`      | `NOT NULL DEFAULT FALSE` | 是否默认提示�?     |
| `created_at` | `DATETIME`     | `NOT NULL`               | 创建时间         |
| `updated_at` | `DATETIME`     | `NOT NULL`               | 更新时间         |

## 4.2 配置管理

### 4.2.1 note-server配置文件

#### 4.2.1.1 应用配置文件 (application.yml)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/cloud_note?useSSL=false&serverTimezone=UTC
    username: root
  profiles:
    active: dev
  data:
    redis:
      host: 127.0.0.1
      port: 6379
      database: 0
      timeout: 5s


# 认证配置
auth:
  idaas:
    client-id: your-client-id
    client-secret: your-client-secret
    redirect-uri: http://localhost:3000/cloudnote/recent
  welink:
    client-id: your-welink-client-id
    client-secret: your-welink-client-secret
    redirect-uri: http://localhost:3000/welink-callback

# 存储配置
storage:
  object-storage:
    enabled: false

# 日志配置
logging:
  level:
    com.cloudnote: info
```

### 4.2.2 前端环境变量配置文件

为了统一管理不同环境的配置，专门构建一个配置文�?config.json，替代原来的多个环境变量文件，后续编辑器相关配置也会根据环境放到这个配置文件中�?
#### 4.2.2.1 配置文件结构

**基础配置文件**�?env

```javascript
# 基础配置
VITE_APP_NAME=云笔�?VITE_APP_VERSION=1.0.0

# 环境标识
VITE_APP_ENV=development
```

**配置文件**：config.json

```json
{
  "development": {
    "app": {
      "name": "云笔�?,
      "version": "1.0.0",
      "env": "development",
      "debug": true
    },
    "api": {
      "baseUrl": "/v1/note",
      "contentServer": "http://localhost:8081"
    },
    "auth": {
      "idaas": {
        "redirectUri": "http://localhost:3000/cloudnote/recent",
        "authUrl": "https://idaas.example.com/oauth2/authorize",
        "clientId": "dev-client-id"
      },
      "welink": {
        "redirectUri": "http://localhost:3000/welink-callback",
        "clientId": "dev-welink-client-id"
      }
    },
    "editor": {
      "plugins": true,
      "upload": {
        "enabled": true,
        "url": "http://localhost:3000/api/upload",
        "maxSize": {
          "image": 5242880,
          "video": 52428800
        }
      }
    }
  },
  "test": {
    "app": {
      "name": "云笔�?,
      "version": "1.0.0",
      "env": "test",
      "debug": false
    },
    "api": {
      "baseUrl": "/v1/note",
      "contentServer": "https://test-content.example.com"
    },
    "auth": {
      "idaas": {
        "redirectUri": "https://test-note.example.com/cloudnote/recent",
        "authUrl": "https://idaas.example.com/oauth2/authorize",
        "clientId": "test-client-id"
      },
      "welink": {
        "redirectUri": "https://test-note.example.com/welink-callback",
        "clientId": "test-welink-client-id"
      }
    },
    "editor": {
      "plugins": true,
      "upload": {
        "enabled": true,
        "url": "https://test-note.example.com/api/upload",
        "maxSize": {
          "image": 5242880,
          "video": 52428800
        }
      }
    }
  },
  "staging": {
    "app": {
      "name": "云笔�?,
      "version": "1.0.0",
      "env": "staging",
      "debug": false
    },
    "api": {
      "baseUrl": "/v1/note",
      "contentServer": "https://staging-content.example.com"
    },
    "auth": {
      "idaas": {
        "redirectUri": "https://staging-note.example.com/cloudnote/recent",
        "authUrl": "https://idaas.example.com/oauth2/authorize",
        "clientId": "staging-client-id"
      },
      "welink": {
        "redirectUri": "https://staging-note.example.com/welink-callback",
        "clientId": "staging-welink-client-id"
      }
    },
    "editor": {
      "plugins": true,
      "upload": {
        "enabled": true,
        "url": "https://staging-note.example.com/api/upload",
        "maxSize": {
          "image": 5242880,
          "video": 52428800
        }
      }
    }
  },
  "production": {
    "app": {
      "name": "云笔�?,
      "version": "1.0.0",
      "env": "production",
      "debug": false
    },
    "api": {
      "baseUrl": "/v1/note",
      "contentServer": "https://prod-content.example.com"
    },
    "auth": {
      "idaas": {
        "redirectUri": "https://prod-note.example.com/cloudnote/recent",
        "authUrl": "https://idaas.example.com/oauth2/authorize",
        "clientId": "prod-client-id"
      },
      "welink": {
        "redirectUri": "https://prod-note.example.com/welink-callback",
        "clientId": "prod-welink-client-id"
      }
    },
    "editor": {
      "plugins": true,
      "upload": {
        "enabled": true,
        "url": "https://prod-note.example.com/api/upload",
        "maxSize": {
          "image": 5242880,
          "video": 52428800
        }
      }
    }
  }
}
```

**配置文件设计思想**�?
1. **环境分类**：按照不同部署环境（development、test、staging、production）进行分类，便于统一管理各环境的配置�?2. **配置层级**�?   - 应用基本信息（app）：应用名称、版本、环境标识、调试模�?   - API配置（api）：API基础路径、内容服务地址
   - 认证配置（auth）：IDaaS和Welink的重定向地址、授权地址、客户端ID
   - 编辑器配置（editor）：插件开关、上传配置（地址、文件大小限制）
3. **使用方式**：前端代码可以根据当前环境加载对应的配置，例如：
   ```javascript
   // 加载配置文件
   import config from '../config.json';

   // 根据当前环境获取配置
   const currentEnv = import.meta.env.VITE_APP_ENV || 'development';
   const envConfig = config[currentEnv];

   // 使用配置
   const apiBaseUrl = envConfig.api.baseUrl;
   const authConfig = envConfig.auth;
   ```
4. **优势**�?   - 集中管理所有环境的配置，避免配置文件分�?   - 配置结构清晰，易于维护和扩展
   - 替代了多个环境变量文件（.env系列），简化了配置管理
   - 支持前端代码在运行时动态获取配置，适应不同部署环境

#### 4.2.2.2 前端使用示例

**认证配置使用**�?
```javascript
// 登录组件中使用配置文�?import config from '../config.json';

const loginWithIdaas = () => {
  const currentEnv = import.meta.env.VITE_APP_ENV || 'development';
  const envConfig = config[currentEnv];
  
  const authUrl = envConfig.auth.idaas.authUrl;
  const redirectUri = envConfig.auth.idaas.redirectUri;
  const clientId = envConfig.auth.idaas.clientId;
  
  const loginUrl = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  window.location.href = loginUrl;
};
```

**编辑器配置使�?*�?
```javascript
// 编辑器初始化配置
import config from '../config.json';

const currentEnv = import.meta.env.VITE_APP_ENV || 'development';
const envConfig = config[currentEnv];

const editorConfig = {
  plugins: envConfig.editor.plugins,
  upload: {
    enabled: envConfig.editor.upload.enabled,
    url: envConfig.editor.upload.url,
    maxSize: {
      image: envConfig.editor.upload.maxSize.image,
      video: envConfig.editor.upload.maxSize.video
    }
  }
};

// 初始化编辑器
const editor = new Editor('#editor', editorConfig);
```

#### 4.2.2.3 配置管理说明

1. **配置分类**�?   - 基础配置：应用名称、版本号�?   - 环境配置：环境标识、调试模式等
   - 认证配置：OAuth授权地址、重定向地址�?   - 编辑器配置：上传地址、文件大小限制等
2. **配置更新**�?   - 新增配置时，只需在config.json文件中添加对应配置到所有环�?   - 修改配置时，只需同步更新config.json文件中的对应配置
   - 敏感配置（如client secret）不应存储在前端配置文件中，应通过后端接口获取
3. **构建流程**�?   - 构建时根�?`--mode` 参数设置VITE\_APP\_ENV环境变量
   - 前端代码根据VITE\_APP\_ENV加载对应环境的配�?4. **安全性考虑**�?   - 前端配置文件会被编译到代码中，不应包含敏感信�?   - 敏感配置应通过后端接口获取，并进行适当的权限控�?
is## 5. API 设计

### 5.1 认证相关 API

#### 5.1.1 统一认证接口

- **POST /v1/note/login**
  - 描述：统一认证接口，支�?IDaaS �?Welink 免登认证
  - 请求参数�?    ```json
    {
      "appId": "应用ID",
      "code": "授权�?,
      "authType": "认证类型，值为 weDocsIDaas �?weDocs",
      "redirectUri": "重定向地址"
    }
    ```
  - 响应�?    ```json
    {
      "code": 200,
      "message": "success",
      "data": {
        "token": "JWT token",
        "user": {
          "id": "用户ID",
          "username": "用户�?,
          "email": "邮箱"
        }
      }
    }
    ```

### 5.2 笔记本相�?API

参�?specs/note.md

## 6. 前端设计

### 6.1 页面结构

- **主页�?*�?  - 左侧导航栏：近期笔记，星标笔记，我的分享，笔记本、回收站，支持折叠功�?  - 右侧内容区：笔记列表和编辑区，支持拖拽调�?  - AI助手面板：可拖拽调整大小的智能助手面板，默认关闭
  - 点击近期笔记，星标笔记，我的分享，笔记本、回收站，都是渲染主页面的格�?- **设置�?*：用户设置、语言切换，退出登�?
### 6.2 组件设计

#### 6.2.1 导航栏组�?
- 功能：提供导航功�?- 包含：新建笔记按钮、笔记本列表、近期笔记、星标笔记、我的分享、回收站
- **UX设计**�?  - 支持折叠/展开功能，折叠后显示图标�?tooltip
  - 新建笔记按钮使用渐变背景，突出显�?  - 导航项使用卡片式设计，激活状态有明显视觉反馈
  - 支持响应式布局，在不同屏幕尺寸下自动调�?
#### 6.2.2 笔记列表组件

- 功能：显示笔记列表，排序
- 包含：笔记标题、创建时间、更新时�?- **UX设计**�?  - 笔记项使用卡片式设计，无分隔�?  - 激活笔记有特殊背景色和边框
  - 支持排序功能：排序依据（创建时间、修改时间、笔记名称），排序（创建时间、修改时�?从新到旧 ，从旧到新；笔记名称：从A到Z，从Z到A�?  - 支持批量操作和快速操作（星标、分享、删除）

#### 6.2.3 编辑器组�?
- 功能：编辑笔记内�?- 包含：文本编辑器、大纲编辑器、手写编辑器、语音编辑器
- **UX设计**�?  - 文本编辑器支持富文本编辑，无默认背景和边�?  - 标题输入区域使用大字号，突出显示
  - 支持实时保存和历史版本管�?  - 编辑器工具栏集成常用功能，保持简�?
#### 6.2.4 语音笔记组件

- **功能**：录音、语音转文字、音频播放控�?- **包含**�?  - 录音控制：开�?暂停/停止录音按钮，录音时长显�?  - 音频播放器：播放/暂停、进度条、音量控制、播放速度调节
  - 语音栏：显示和管理多段语�?  - 转文字结果：实时显示转文字内�?- **特�?*�?  - 实时语音转文字：录音过程中实时显示转文字结果
  - 语音栏支持多段语音：支持录制和管理多段语�?- **UX设计**�?  - 语音波形可视化显�?  - 录音控制按钮使用直观的图�?  - 语音片段支持单独播放和管�?  - 转文字结果实时同步到右侧文本区域

#### 6.2.5 AI 助手组件

- 功能：提供AI功能
- 包含：总结摘要、改写、扩写等选项
- **UX设计**�?  - 悬浮式面板，可拖拽调整大�?  - 卡片式功能选项，带有图标和描述
  - 实时对话界面，显示AI回复
  - 支持将AI生成内容直接插入到笔�?
#### 6.2.6 分享组件

- 功能：分享笔�?- 包含：分享链接生成、过期时间设�?- **UX设计**�?  - 弹出式对话框，简洁明�?  - 分享开�?  - 分享链接一键复制功�?  - 分享范围：指定用户，任意用户

#### 6.2.7 笔记本管理组�?
- 功能：管理笔记本的创建、编辑、删�?- **UX设计**�?  - 网格布局的笔记本卡片
  - 卡片悬停效果和动�?  - 默认笔记本带有锁定标�?  - 新建笔记本按钮突出显�?  - 支持笔记本颜色自定义

#### 6.2.8 回收站组�?
- 功能：管理已删除的笔�?- **UX设计**�?  - 列表视图显示已删除笔�?  - 支持批量恢复和永久删�?  - 显示删除时间和原笔记本信�?  - 清空回收站功�?
### 6.3 状态管�?
使用 Redux Toolkit 管理全局状态，包括�?
- 用户信息
- 笔记本列�?- 笔记列表
- 笔记内容
- 语音笔记状�?- AI 助手状�?- UI 状态（如导航栏折叠状态、AI面板大小等）

### 6.4 国际�?
使用 react-i18next 实现国际化，支持中文和英文两种语言�?
### 6.5 UX设计系统

- **颜色系统**：基于Fresh Blue Spectrum，包括主色、辅色和中性色
- **排版系统**：使用Manrope作为标题字体，Inter作为正文字体
- **组件样式**：遵循设计系统规范，包括按钮、输入框、卡片等
- **交互设计**�?  - 微交互：按钮点击反馈、表单输入反�?  - 动画效果：页面切换、元素加载动�?  - 响应式设计：适配不同屏幕尺寸
- **无障碍设�?*�?  - 键盘导航支持
  - 屏幕阅读器兼�?  - 颜色对比度符合标�?
### 6.6 前端性能优化

- **代码分割**：按需加载组件和资�?- **懒加�?*：图片和非关键资源延迟加�?- **缓存策略**：合理使用浏览器缓存
- **减少网络请求**：合并请求，使用CDN
- **优化渲染**：避免不必要的重渲染
- **打包优化**：压缩代码，移除未使用的代码

## 7. UI设计

### 7.1 近期笔记

1. 认证成功后，默认调用 `/v1/note/notes` 获取近期笔记列表�?2. 登录后的默认落点�?`/cloudnote/recent`，也就是原来的主页�?3. 近期笔记页面支持按创建时间、修改时间、笔记名称等方式排序�?4. 点击笔记条目后，进入 `/cloudnote/recent/:id` 打开对应笔记�?
### 7.2 星标笔记

1. 点击左侧导航栏的“星标笔记”�?2. 调用星标列表接口，展示星标笔记列表�?3. 点击笔记条目后，进入 `/cloudnote/star/:id` 打开对应笔记�?
### 7.3 我的分享

1. 点击左侧导航栏的“我的分享”�?2. 调用分享列表接口，展示分享笔记列表�?3. 点击笔记条目后，进入笔记编辑页打开对应笔记�?
### 7.4 笔记�?
1. 点击左侧导航栏的“笔记本”�?2. 展开笔记本下拉列表，展示查询到的笔记本列表�?3. 点击笔记本后，查询该笔记本下的所有笔记�?4. 点击笔记本右侧�?”号，创建笔记本�?
### 7.5 回收�?
1. 点击左侧导航栏的“回收站”�?2. 触发查询已删除笔记列表�?3. 点击笔记条目后，进入笔记编辑页查看对应内容�?

### 7.6 商业发布版主页面框架

商业发布版采用“单工作台”结构，近期笔记、星标笔记、我的分享、笔记本、回收站共用同一套页面外壳，只在内容区展示不同数据视图。

- **默认入口**: 登录后默认进入 `/cloudnote/recent`，它承担原来 `home` 页面的角色。
- **页面外壳**: 当前实现由底层左侧导航栏、同层顶部工具栏、近期笔记抽屉、编辑工作区和按需展开的 AI 面板组成。
- **层级关系**: 左侧导航与顶部搜索栏属于同一层；笔记列表和编辑器组合成一张浮层主卡片，中间只保留极细分隔线。
- **品牌区**: 左侧导航顶部使用单行品牌标题 `WeLink 云笔记`，不再显示额外图标或副标题。
- **主工作区**: `/cloudnote/recent` 与 `/cloudnote/recent/:id` 都进入同一套编辑工作台，区别只在当前内容源与选中笔记。
- **侧栏职责**: 近期笔记列表独立放在可折叠侧栏中，支持排序、高亮当前笔记和快速切换。
- **交互节奏**: 页面强调“先进入工作台，再从侧栏切换笔记”的连续操作体验，减少页面跳转感。
- **图标资源**: 左侧导航功能图标使用标准图标库 `@ant-design/icons`；主页面其他辅助图标仍可复用本地静态 SVG 资源。
- **路径命名**:
  - `/cloudnote/recent`
  - `/cloudnote/recent/:id`
  - `/cloudnote/starred`
  - `/cloudnote/star/:id`
  - `/cloudnote/shares`
  - `/cloudnote/notebooks`
  - `/cloudnote/recyclebin`
## 9. 部署与集�?
### 9.1 部署架构

- **前端**：部署到 CDN 或静态文件服务器
- **后端**：部署到云服务器或容器平�?- **数据�?*：部署到云数据库服务
- **存储**：开发阶段使用本地文件系统，生产阶段使用 OBS 对象存储

### 9.2 集成方案

- **认证集成**：对接蓝�?Welink �?IDaaS 认证
- **搜索集成**：调用现有搜索服�?- **AI 集成**：对接第三方 AI 服务

## 10. 流程设计

### 10.1 登录流程

1. **用户进入任意页面**：用户可以从 `/cloudnote/recent/{noteid}`、`/cloudnote/star/{noteid}` 或其它受保护路由进入应用�?2. **全局初始�?*：`App.jsx` 中的 `AuthProvider` 在应用启动时执行认证检测�?3. **URL 参数识别**：`authService.detectAuthFromUrl()` 先识�?`type=weDocs&code=xxx`�?4. **区分认证类型**�?   - `type=weDocs&code=xxx`：Welink 免登
   - 其他：IDaaS OAuth 回调
5. **交换登录信息**：`useAuthStore.login()` 调用 `authService.login()`，向 `note-server` �?`POST /v1/note/login` 发�?`appId`、`code`、`authType`、`redirectUri`
6. **后端换取凭证**：`note-server` 校验授权码，并生�?`cloud_doc_token`、`cloud_doc_userid`、`cloud_doc_appid`
7. **前端恢复会话**：前端从 Cookie 读取认证三元组，更新 Zustand 状态为已登�?8. **清理回调参数**：`clearUrlAuthParams()` 删除地址栏中�?`code` �?`type`
9. **渲染原始页面**：认证完成后停留在用户最初访问的受保护路由上

> 说明：当前前端实现以 URL 回调自动换取 token 为主，不再依赖单独的 `/login` 回调页作为唯一入口；`/login` 仅作为未登录时的统一入口和备用处理页�?\--header 'ztsg\_ruuid: b3efe0851ec7ed6f-a79a-4a83-a4ae-0089894a58aa' \
\--data-raw '{
"appId": "20221018154303010-64A1-AB636CB87",
"code": "123456",
"redirectUri": "<https://koopagedev.clouddocs.huawei.com/cloudnote/recent>",
"appType": "weDocsIDaas/weDocs"
}'
返回�?{
"code": 0,
"success": true,
"data": {
"accessToken": "8a4a42e0d7f2d7bd5d4505039f900b3f",
"refreshToken": "bcf7852ec7e39e070c7d24f1d352399e",
"scope": "base.profile",
"expireTime": 1775573998,
"userInfo": {
"userId": "2a025386c56d45129404e9bbe3a42855",
"oneAccessUserId": "uuid\~dzAwODU1MDM0",
"userName": "w00855034",
"nickName": "吴志�?,
"mobile": "13787276263",
"profileUrl": "<https://w3-beta.huawei.com/w3lab/rest/yellowpage/face/00855034/120>",
"available": 1,
"isAdmin": 0,
"createTime": "2024-12-09 19:42:26",
"appId": "20221018154303010-64A1-AB636CB87",
"lowestDept": "软件云服务开发部",
"employeeType": "HWE",
"oauthType": 2
}
},
"message": "success"
}

### 10.2 新建笔记流程

1. 用户点击左侧导航栏的"新建"按钮
2. 选择笔记类型（文本、大纲、手写、语音）
3. note-web 调用 note-server �?`/v1/note/notes` API 创建笔记
4. note-server 调用 content-server �?/v1/content/documents 创建文档，其中的organization\_id与user\_id一一对应，organization\_id, wiki\_id(对应笔记本表（notebook表）的id字段)由note-server生产与维�?5. content-server 返回 document\_id
6. note-server �?content-server 返回�?document\_id 关联到笔记记�?7. 新笔记默认保存到"我的笔记"笔记�?8. note-web 打开新笔记的编辑界面

笔记类型和content类型的对应关系如�?
handwritten: 3
text/outline/handwritten�?

content-server api信息�?curl --location --request POST '<http://localhost:5002/v1/content/documents>' \
\--header 'Content-Type: application/json' \
\--header 'X-Cloud-Doc-Origin-AppId: 20221018154303010-64A1-AB636CB87' \
\--header 'userId: 2a025386c56d45129404e9bbe3a42855' \
\--data-raw '{
"type": "2",
"title": "postman-test-document",
"wiki\_id": "7d88380c-b49c-4910-9af0-307d0bd0e7ab"
}'
请求返回示例�?{
"title": "postman-test-document",
"document\_id": "7bf3111d-a643-4148-b233-bd8f4c417c45",
"organization\_id": "6686a03a-7a59-418e-b3c5-81d69168fdd4",
"wiki\_id": "7d88380c-b49c-4910-9af0-307d0bd0e7ab",
"create\_user\_id": "2a025386c56d45129404e9bbe3a42855",
"created\_at": "2026-04-07 21:12:11",
"updated\_at": "2026-04-07 21:12:11"
}

### 10.3 编辑笔记流程

1. 用户在编辑界面修改笔记内�?2. note-web 实时保存到本地状�?3. 编辑器自动保存触�?
### 10.4 笔记本管理流�?
1. 用户登录云笔记应�?2. 左侧导航栏显示默认笔记本�?我的笔记"�?会议笔记"�?3. 用户点击"新建笔记�?按钮
4. 输入笔记本名称和描述
5. note-web 调用 note-server �?`/v1/note/notebooks` API 创建笔记�?6. 新笔记本出现在左侧导航栏
7. 用户可以编辑或删除笔记本（默认笔记本不可删除�?
### 10.5 语音笔记流程

1. **创建语音笔记**：用户选择创建语音笔记
2. **录音准备**：note-web 显示语音笔记界面，左侧为语音控制区，右侧为文本笔记区
3. **开始录�?*：用户点击录音按钮开始录音，系统开始实时语音转文字
4. **录音控制**：用户可以暂�?继续录音，系统自动分�?5. **实时转文�?*：录音过程中，转文字结果实时显示在右侧文本笔记中
6. **语音栏管�?*：语音栏显示和管理多段语�?7. **保存笔记**：用户点击保存按钮，note-web 执行以下操作�?   - 调用`/v1/note/voice-notes/upload` API 上传音频文件
   - 调用`/v1/note/voice-notes/transcribe` API 获取完整的转文字结果（使用阿里Fun-ASR模型�?   - 调用`/v1/note/notes` API 保存笔记基本信息
8. **音频存储**�?   - 开发阶段：音频文件存储在本地文件系�?   - 生产阶段：音频文件存储在 OBS（对象存储服务）
9. **后续操作**：用户可以播放音频、编辑笔记等

**语音AI模型配置流程**�?
1. note-server �?sys\_config 表中读取语音AI模型配置
2. 检�?`voice.ai.enabled` 是否�?true
3. 获取 `voice.ai.model`、`voice.ai.endpoint`、`voice.ai.api_key` 等配�?4. 使用配置调用阿里Fun-ASR语音识别模型进行语音转文�?5. 将识别结果返回给前端

### 10.6 回收站流�?
1. 用户删除笔记
2. 笔记状态变�?deleted"
3. 笔记出现在回收站�?4. 用户可以在回收站中查看已删除的笔�?5. 用户可以选择恢复或永久删除笔�?6. 恢复笔记：笔记状态变�?active"，回到原笔记�?7. 永久删除：笔记从数据库中删除，同时调用content的硬删除接口�?   请求示例�?   curl --location --request POST '<http://localhost:5002/content/document/batchDelete>' \
   \--header 'Content-Type: application/json' \
   \--header 'X-Cloud-Doc-Origin-AppId: 20221018154303010-64A1-AB636CB87' \
   \--header 'userId: 2a025386c56d45129404e9bbe3a42855' \
   \--data-raw '{
   "ids": \[
   "0fd6321b-b0b0-47f7-8697-8135b7273889"
   ]
   }'
   返回示例�?   {
   "success": true,
   "statusCode": 200,
   "message": "success",
   "traceId": "15686759-2ddf-46aa-9c69-ab5a42a40f64",
   "data": null
   }

### 10.7 分享流程

1. 用户打开要分享的笔记
2. 点击分享按钮
3. 设置分享过期时间（可选）
4. note-web 调用 note-server �?`/v1/note/shares` API 创建分享
5. note-server 生成分享码和分享链接
6. 用户复制分享链接并发送给他人
7. 他人通过分享链接访问笔记
8. note-server 通过分享码验证并返回笔记内容

### 10.8 AI 助手流程

1. 用户点击 AI 助手按钮
2. note-web 显示 AI 助手弹窗，包�?总结摘要"�?改写"�?扩写"等选项
3. 用户选择功能并输入相关参�?4. note-web 调用 note-server �?`/v1/note/ai/chat` API，传�?task\_type 和相关参�?   - 总结摘要：`{"task_type": "summarize", "content": "笔记内容"}`
   - 改写：`{"task_type": "rewrite", "content": "原始内容", "params": {"style": "formal"}}`
   - 扩写：`{"task_type": "expand", "content": "原始内容", "params": {"length": "medium"}}`
5. note-server 根据 task\_type �?ai\_prompt 表中获取对应的系统提示词
6. note-server 将提示词与用户输入内容结合，调用 AI 服务处理请求
7. 处理结果返回�?note-web 并显�?8. 用户可以将结果插入到笔记�?
### 10.9 搜索流程

1. **输入关键�?*：用户在顶部搜索框输入关键词
2. **触发搜索**：用户点击搜索按钮或按回车键
3. **执行搜索**：note-web 调用 note-server 的搜�?API，note-server 调用现有搜索服务
4. **显示结果**：搜索结果以列表形式显示，包含笔记标题、类型、更新时�?5. **筛选结�?*：支持按笔记类型、笔记本进行筛�?6. **打开笔记**：用户点击搜索结果，打开对应笔记的编辑界�?
### 10.10 历史记录流程

1. **打开历史记录**：用户在笔记编辑界面点击"更多"按钮，选择"更多版本"
2. **获取历史记录**：note-web 调用 note-server �?`/v1/note/notes/{id}/history` API 获取历史记录，note-web调用content-server的api接口curl --location --request GET '<http://localhost:5002/content/document/history/0fd6321b-b0b0-47f7-8697-8135b7273889>' \
   \--header 'X-Cloud-Doc-Origin-AppId: 20221018154303010-64A1-AB636CB87' \
   \--header 'userId: 2a025386c56d45129404e9bbe3a42855'
   返回示例�?   {
   "success": true,
   "statusCode": 200,
   "message": "success",
   "traceId": "f2fa72ea-949b-4010-97f4-a630e60da4b6",
   "data": \[
   {
   "version": "1775201291245",
   "data": "{"default":{"type":"doc","content":\[{"type":"title","attrs":{"uuid":"fee023a6-7d34-4e8a-8ca7-c250d2bd57dc","cover":""}},{"type":"paragraph","attrs":{"uuid":"fa5b5060-8858-49ae-adc5-5177d1d85988","indent":0,"textAlign":"left"}}]}}",
   "userId": "2a025386c56d45129404e9bbe3a42855"
   }
   ]
   }

获取历史记录列表�?3\. **查看历史版本**：历史记录列表显示在界面上，按时间倒序排列
4\. **预览版本**：用户可以点击历史记录查看具体内�?5\. **恢复版本**：用户选择要恢复的历史版本，点�?恢复"按钮
6\. **确认恢复**：弹出确认对话框，用户确认后执行恢复操作
7\. **更新笔记**：通过列表中的content，更新当前的内容

### 10.11 导入导出流程

1. **导入**�?   - 用户点击导入按钮
   - 选择要导入的文件
   - note-web 上传文件并调�?note-server 的导�?API
   - note-server 解析文件并创建笔�?   - 导入结果返回�?note-web 并显�?2. **导出**�?   - 用户选择要导出的笔记
   - 点击导出按钮
   - note-web 调用 note-server 的导�?API
   - note-server 生成导出文件
   - 导出文件下载到用户本�?
### 10.12 标签管理流程

1. 用户打开笔记的标签管�?2. note-web 显示当前标签列表
3. 用户可以添加、删除标�?4. note-web 调用 note-server 的标签管�?API
5. 标签更新结果返回�?note-web 并显�?
### 10.13 语音搜索流程

1. **输入关键�?*：用户在搜索框输入关键词
2. **触发搜索**：用户点击搜索按钮或按回车键
3. **执行搜索**：note-web 调用 note-server �?`/v1/note/voice-notes/search` API，搜索语音笔记的转录内容
4. **显示结果**：搜索结果以列表形式显示，包含语音笔记标题、长度、转录内容预�?5. **播放预览**：用户可以点击搜索结果旁边的播放按钮，预览语音内�?6. **打开笔记**：用户点击搜索结果，打开对应语音笔记的编辑界�?
### 10.14 近期笔记流程

1. 用户登录后进入 `/cloudnote/recent`，进入统一的主工作台。
2. `MainLayout` 渲染左侧导航栏、顶部搜索栏、近期笔记侧栏、编辑工作区和 AI 面板。
3. 近期笔记侧栏调用 `/v1/note/notes` 获取笔记列表，并按更新时间、创建时间或名称排序。
4. 用户点击列表项后进入 `/cloudnote/recent/:id`，工作区切换到对应笔记的编辑状态。
5. 编辑工作区保留星标、全屏、分享、删除和更多操作入口。
6. 近期笔记侧栏支持折叠，方便在“列表浏览”和“专注编辑”之间切换。
7. 当 AI 面板打开时，右侧保留独立的辅助操作区，不干扰正文编辑。

## 11. 安全性考虑

### 11.1 认证安全

- 使用 OAuth 2.0 协议进行认证
- 使用 JWT 进行身份验证
- 密码哈希存储
- 防止 CSRF 攻击
- 防止 XSS 攻击

### 11.2 数据安全

- 数据传输加密（HTTPS�?- 敏感数据加密存储
- 定期数据备份
- 访问权限控制

### 11.3 存储安全

- 音频文件安全存储
- 防止文件上传漏洞
- 存储权限控制

## 12. 性能优化

### 12.1 前端优化

- 代码分割
- 懒加�?- 缓存策略
- 减少网络请求
- 优化渲染性能

### 12.2 后端优化

- 数据库索引优�?- 缓存机制
- 异步处理
- 负载均衡
- 服务降级

## 13. 监控与日�?
### 13.1 前端监控

- 错误监控
- 性能监控
- 用户行为分析

### 13.2 后端监控

- 服务健康检�?- 性能监控
- 错误日志
- 访问日志

## 14. 扩展性考虑

### 14.1 功能扩展

- 支持更多笔记类型
- 支持更多 AI 功能
- 支持更多认证方式
- 支持更多存储方式

### 14.2 架构扩展

- 微服务架�?- 容器化部�?- 弹性伸�?- 多租户支�?
## 15. 总结

本设计文档详细描述了云笔记应用的技术架构、功能模块、API 设计、数据库设计、前端设计、后端设计以及各种流程设计。该设计基于现代技术栈，支持多端协同、多种笔记类型、AI 助手等高级功能，为用户提供了一个功能丰富、体验良好的云笔记应用�?
同时，本设计还考虑了安全性、性能优化、监控与日志、扩展性等方面，确保应用的稳定性、可靠性和可扩展性�?
### 15.1 实现约束

所有特性在实现上，要组件化、模块化，方便后续产品的演进，严禁在一个代码文件中不停添加功能实现。具体要求如下：

1. **组件�?*�?   - 前端代码应按照功能模块进行组件化设计，每个组件职责单一，可复用性高
   - 后端代码应按照业务逻辑进行模块化设计，每个模块职责清晰，接口明�?   - 组件之间通过明确的接口进行通信，避免紧耦合
2. **模块�?*�?   - 数据模型应设计合理，符合业务逻辑
   - 业务逻辑应抽象为服务层，便于后续扩展和维�?   - 配置管理应集中化，便于统一管理和修�?3. **代码组织**�?   - 代码文件应按照功能模块进行组织，结构清晰
   - 避免在一个代码文件中实现多个不相关的功能
   - 遵循代码规范和最佳实践，提高代码可读性和可维护�?
通过本设计文档，开发团队可以清晰了解云笔记应用的整体架构和实现细节，为后续的开发、测试和部署提供指导�?
