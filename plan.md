## Plan: 非遗学艺后台管理模块（7个核心模块）

本方案严格按 7 个核心模块设计，与当前项目 backend + web + miniprogram 能力一一映射，不增不减，目标是快速形成可演示、可开发、可验收的后台管理体系。

**总体实施原则**
- 前端形态：复用现有 web，新增 /admin 路由域与管理布局。
- 后端形态：新增 /api/admin/* 路由分组，保留现有 C 端接口不破坏。
- 权限模型：沿用 User.role（admin/user/artist），后台全部接口默认 admin 可访问。
- 状态驱动：通过 status/isVisible/isActive 等字段控制前台展示与业务流转。

**模块 1：用户管理**
- 功能范围
- 查看所有用户列表（分页、搜索、角色筛选、注册时间筛选）
- 查看用户学习记录、答题记录、拥有藏品
- 用户禁用/解禁、查看详情（比赛演示重点）
- 对应现有基础
- 用户模型：backend/src/models/User.js
- 学习/答题关联：backend/src/models/HeritageQaMessage.js、backend/src/models/HeritageQuizSession.js、backend/src/models/HeritageQuizSessionAnswer.js
- 用户路由基础：backend/src/routes/users.js
- 建议新增能力
- 用户状态字段：isActive、disabledReason、disabledAt
- 管理接口：/api/admin/users、/api/admin/users/:id、/api/admin/users/:id/status

**模块 2：非遗课程管理**
- 功能范围
- 新增/编辑/删除 6 大非遗课程（如书法、剪纸、古琴等）
- 上传课程封面、步骤、图文内容
- 控制课程显示/隐藏
- 对应现有基础
- 前端已有学习相关页面：web/src/pages/Learn.js、web/src/pages/HeritageLearn.js
- 后端已有 AI 学艺链路：backend/src/routes/ai.js
- 建议新增能力
- 课程实体（新表）：heritage_courses（title/category/cover/steps/content/isVisible/sort）
- 管理接口：/api/admin/courses（CRUD + 上下架 + 排序）

**模块 3：题库 & 闯关管理**
- 功能范围
- 题库管理：批量增删改查题目、导入 Excel 题目
- 关卡管理：配置关卡、题目数量、通关条件
- 奖励配置：设置闯关奖励藏品与积分
- 对应现有基础
- 题库模型：backend/src/models/HeritageQuizQuestion.js
- 会话模型：backend/src/models/HeritageQuizSession.js、backend/src/models/HeritageQuizSessionAnswer.js
- 题库逻辑与提示词：backend/src/utils/heritageQaQuiz.js
- AI 路由承载：backend/src/routes/ai.js
- 建议新增能力
- 关卡配置表（新表）：heritage_quiz_levels
- 奖励规则表（新表）：heritage_quiz_rewards
- Excel 导入接口：/api/admin/quiz/questions/import
- 批量接口：/api/admin/quiz/questions/batch

**模块 4：数字藏品管理**
- 功能范围
- 新增/编辑藏品（徽章、数字藏品）
- 上传藏品图片、设置稀有度
- 查看哪些用户拥有该藏品
- 对应现有基础
- 当前暂无独立藏品模型（需补齐）
- 闯关奖励与积分可复用模块 3 的配置链路
- 建议新增能力
- 藏品表（新表）：collectibles（name/type/image/rarity/description/isActive）
- 用户藏品关系表（新表）：user_collectibles（userId/collectibleId/source/sourceRefId/acquiredAt）
- 管理接口：/api/admin/collectibles、/api/admin/collectibles/:id/owners

**模块 5：用户作品管理**
- 功能范围
- 查看用户上传作品、AI 生成作品
- 审核/删除/推荐作品
- 联动作品广场展示
- 对应现有基础
- 作品模型：backend/src/models/Artwork.js
- 作品路由：backend/src/routes/artworks.js
- AI 作品链路：backend/src/routes/ai.js
- 作品前台页面：web/src/pages/Gallery.js、web/src/pages/MyArtworks.js
- 建议新增能力
- 作品审核状态：draft/pending_review/published/hidden/rejected
- 推荐字段：isRecommended、recommendedAt
- 管理接口：/api/admin/artworks/review、/api/admin/artworks/:id/recommend

**模块 6：系统设置**
- 功能范围
- 修改站点名称、LOGO、公告
- 配置 AI 接口开关
- 备案信息、关于页面内容
- 对应现有基础
- 环境与服务配置：backend/src/config/*、backend/src/utils/qwenImageEdit.js、backend/src/utils/volcengine.js
- 首页/资讯承载：backend/src/routes/home.js、backend/src/routes/news.js
- 建议新增能力
- 系统设置表（新表）：system_settings（settingKey/settingValue/group/updatedBy）
- 管理接口：/api/admin/settings（按 group 读写）
- 前台读取：启动时缓存 + 配置变更后失效刷新

**模块 7：数据统计面板（答辩重点）**
- 功能范围
- 用户总数、答题总数、作品总数
- 各非遗门类学习热度
- 闯关完成率、藏品发放数量
- 简洁专业图表首屏展示
- 对应现有基础
- 用户/作品/题库会话数据已存在于现有模型
- 前端已有 antd 生态可快速接图表库
- 建议新增能力
- 统计接口：/api/admin/dashboard/overview、/trend、/quiz、/collectibles
- 指标口径统一：日/周/月 + 类别维度（书法、剪纸等）

**实施顺序（建议）**
1. 权限与后台路由骨架：先打通 /admin 与 /api/admin/*。
2. 模块 1 + 模块 5：先完成用户与作品管理，形成可见闭环。
3. 模块 3 + 模块 4：完成题库闯关与奖励藏品主链路。
4. 模块 2 + 模块 6：补齐课程与系统配置可运营能力。
5. 模块 7：最后汇总指标与图表，作为答辩展示页。

**验收标准（按模块）**
1. 用户管理：可查、可看学习答题记录、可禁用/解禁。
2. 课程管理：6 大课程可完整增删改查并控制显示。
3. 题库闯关：题目批量管理 + Excel 导入 + 关卡与奖励生效。
4. 数字藏品：藏品可维护，且可查询拥有者。
5. 作品管理：审核与推荐可直接影响作品广场展示。
6. 系统设置：站点信息、AI 开关、备案与关于内容可后台改。
7. 数据看板：核心指标准确，图表首屏可用且可演示。