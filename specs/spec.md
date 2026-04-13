# 云笔记 - 产品需求文档

## Overview
- **Summary**: 云笔记是一款支持多端协同的笔记应用，使用Electron框架实现同一代码库支持PC端、移动端、安卓和iOS平台，提供丰富的笔记类型和功能。
- **Purpose**: 解决用户在不同设备上的笔记管理需求，支持多种笔记类型，提供AI助手等高级功能。
- **Target Users**: 个人用户，需要在多端协同使用笔记的用户。

## Goals
- 实现多端协同的云笔记应用
- 支持多种笔记类型（文本、大纲、手写、语音）
- 提供完善的笔记本管理和回收站功能
- 集成AI助手，提供智能功能
- 支持国际化（中文和英文）
- 实现与蓝版Welink和IDaaS的认证集成

## Non-Goals (Out of Scope)
- 不提供用户注册功能
- 不支持离线模式
- 不实现实时协作编辑
- 不支持视频笔记类型

## Background & Context
- 使用Electron框架实现跨平台支持
- 对接蓝版Welink的认证和IDaaS认证（OAuth）
- 现有搜索服务，直接调用
- 编辑器使用Tiptap，预留架构支持后续对接不同编辑器

## Functional Requirements
- **FR-1**: 认证鉴权
  - 对接蓝版Welink的认证（从Welink APP导航栏进入）
  - 对接IDaaS认证（直接输入域名访问）
  - 首次登录引导
- **FR-2**: 国际化支持
  - 实现中文和英文两种语言
- **FR-3**: 左侧导航栏
  - 新建笔记
  - 近期笔记
  - 星标笔记
  - 我的分享
  - 笔记本
  - 回收站
  - 导航栏折叠/展开功能
- **FR-4**: 新建笔记类型
  - 文本笔记
  - 大纲笔记（脑图）
  - 手写笔记（绘图）
  - 语音笔记
- **FR-5**: 语音笔记功能
  - 语音实时转文字
  - 支持中英文语音
  - 语音转文字插入到文本笔记
  - 语音波形可视化
- **FR-5.1**: 语音笔记高级功能
  - 音频播放控制（播放/暂停、进度条、音量控制、播放速度调节）
  - 语音栏支持多段语音
  - 语言选择
  - 观点提取
- **FR-6**: 笔记本管理
  - 初始化"我的笔记"和"会议笔记"两个笔记本（不可删除）
  - 支持用户新增其他笔记本
  - 新建笔记默认保存到"我的笔记"
  - 笔记本颜色自定义
- **FR-7**: 回收站功能
  - 笔记软删除到回收站
  - 回收站笔记永久存在
  - 支持批量恢复和批量删除
  - 支持清空回收站
  - 支持按删除时间排序和搜索
- **FR-8**: 批量操作
  - 支持笔记的批量选择和操作
- **FR-9**: 笔记操作
  - 笔记本名称与笔记内部标题修改联动
  - 笔记支持全屏、分享、删除
  - 更多选项（历史记录）
  - 标签管理
- **FR-10**: 搜索功能
  - 支持标题和内容搜索
  - 调用现有搜索服务
  - 支持按笔记类型、笔记本筛选
  - 支持语音笔记转录内容搜索
- **FR-11**: 导入导出
  - 支持笔记的导入导出
  - 支持多种导出格式
- **FR-12**: AI助手
  - 总结摘要
  - 改写
  - 扩写
  - 可拖拽调整大小的AI助手面板
- **FR-13**: 编辑器架构
  - 预留架构，支持后续对接不同编辑器
  - 实时保存功能
  - 历史版本管理
- **FR-14**: 租户体系
  - 系统支持租户体系

## Non-Functional Requirements
- **NFR-1**: 性能
  - 笔记加载速度快
  - 操作响应及时
- **NFR-2**: 安全
  - 认证安全
  - 数据传输加密
- **NFR-3**: 可靠性
  - 数据备份
  - 系统稳定性
- **NFR-4**: 可扩展性
  - 支持后续功能扩展
  - 支持多租户

## Constraints
- **Technical**: 
  - 使用Electron框架
  - 前端使用React
  - 后端使用Java
  - 数据库使用MySQL
- **Business**: 
  - 对接蓝版Welink和IDaaS认证
  - 不提供用户注册功能
- **Dependencies**: 
  - 蓝版Welink认证API
  - IDaaS认证API
  - 现有搜索服务

## Assumptions
- 蓝版Welink和IDaaS认证API可用
- 现有搜索服务已部署并可调用
- 开发环境已配置好Electron相关工具

## Acceptance Criteria

### AC-1: 认证鉴权
- **Given**: 用户从蓝版Welink APP导航栏进入
- **When**: 点击云笔记应用
- **Then**: 自动通过Welink认证登录
- **Verification**: `programmatic`

### AC-2: IDaaS认证
- **Given**: 用户直接输入域名访问
- **When**: 访问应用
- **Then**: 跳转到IDaaS认证页面，完成认证后登录
- **Verification**: `programmatic`

### AC-3: 首次登录引导
- **Given**: 用户首次登录应用
- **When**: 完成认证后
- **Then**: 显示欢迎界面和功能引导
- **Verification**: `human-judgment`

### AC-4: 国际化支持
- **Given**: 用户在设置中切换语言
- **When**: 选择中文或英文
- **Then**: 应用界面语言切换到对应语言
- **Verification**: `human-judgment`

### AC-5: 导航栏功能
- **Given**: 用户使用左侧导航栏
- **When**: 点击导航栏折叠/展开按钮
- **Then**: 导航栏切换折叠/展开状态
- **Verification**: `programmatic`

### AC-6: 新建笔记
- **Given**: 用户点击左侧导航栏的"新建笔记"按钮
- **When**: 选择笔记类型
- **Then**: 创建对应类型的笔记，并默认保存到"我的笔记"笔记本
- **Verification**: `programmatic`

### AC-7: 语音笔记
- **Given**: 用户创建语音笔记
- **When**: 开始录音
- **Then**: 语音实时转文字，并可插入到右侧文本笔记，显示语音波形
- **Verification**: `programmatic`

### AC-8: 语音笔记高级功能
- **Given**: 用户使用语音笔记功能
- **When**: 播放音频
- **Then**: 支持播放/暂停、进度条、音量控制、播放速度调节
- **Verification**: `human-judgment`

- **Given**: 用户使用语音笔记功能
- **When**: 录制多段语音
- **Then**: 语音栏支持显示和管理多段语音
- **Verification**: `programmatic`

- **Given**: 用户使用语音笔记功能
- **When**: 选择语言或提取观点
- **Then**: 系统正确处理语言选择和观点提取
- **Verification**: `programmatic`

### AC-9: 笔记本管理
- **Given**: 用户进入笔记本管理界面
- **When**: 创建新笔记本
- **Then**: 新笔记本出现在左侧导航栏，支持颜色自定义
- **Verification**: `programmatic`

### AC-10: 回收站功能
- **Given**: 用户删除笔记
- **When**: 进入回收站
- **Then**: 可以看到已删除的笔记，并支持批量恢复、批量删除和清空回收站
- **Verification**: `programmatic`

### AC-11: 搜索功能
- **Given**: 用户在搜索框输入关键词
- **When**: 点击搜索
- **Then**: 显示包含关键词的笔记（标题和内容），支持按笔记类型、笔记本筛选
- **Verification**: `programmatic`

- **Given**: 用户在搜索框输入关键词
- **When**: 点击搜索
- **Then**: 搜索结果包含语音笔记的转录内容
- **Verification**: `programmatic`

### AC-12: AI助手
- **Given**: 用户点击AI助手按钮
- **When**: 选择"总结摘要"功能
- **Then**: 生成笔记的总结摘要
- **Verification**: `human-judgment`

- **Given**: 用户使用AI助手
- **When**: 拖拽AI助手面板
- **Then**: AI助手面板大小可调整
- **Verification**: `programmatic`

### AC-13: 标签管理
- **Given**: 用户编辑笔记标签
- **When**: 添加或删除标签
- **Then**: 标签成功更新，在笔记列表页面可通过标签筛选
- **Verification**: `programmatic`

### AC-14: 历史记录
- **Given**: 用户打开笔记的历史记录
- **When**: 查看或恢复历史版本
- **Then**: 系统正确显示历史版本并支持恢复
- **Verification**: `programmatic`

### AC-15: 导入导出
- **Given**: 用户选择导入或导出笔记
- **When**: 执行操作
- **Then**: 成功导入或导出笔记文件，支持多种导出格式
- **Verification**: `programmatic`

### AC-16: 响应式设计
- **Given**: 用户在不同设备上访问应用
- **When**: 调整屏幕尺寸
- **Then**: 应用界面自适应不同屏幕尺寸
- **Verification**: `human-judgment`

### AC-17: 无障碍设计
- **Given**: 用户使用键盘或屏幕阅读器
- **When**: 操作应用
- **Then**: 应用支持键盘导航和屏幕阅读器
- **Verification**: `human-judgment`

## Open Questions
- [ ] 蓝版Welink和IDaaS认证的具体API接口文档
- [ ] 现有搜索服务的调用方式和参数
- [ ] 语音转文字的实现方式和API
- [ ] AI助手的具体实现方案和API