# 数据收集与训练数据规范

本文档定义平台所需的各类数据的收集标准、格式规范和质量要求，用于支撑 AI 模型（智谱 GLM-4.5）的精准输出和未来的模型微调训练。

---

## 一、数据分类总览

| # | 数据类别 | 来源 | 用途 | 优先级 |
|---|---|---|---|---|
| 1 | 案件基础数据 | 法院/检察院 | 案件分析、风险研判、AI 智能分析 | 必需 |
| 2 | 社区风险点数据 | 街道办/网格员 | 地图可视化、热力图、风险预警 | 必需 |
| 3 | 检察建议数据 | 检察院 | 检察建议管理、AI 辅助生成 | 必需 |
| 4 | 普法方案数据 | 检察院/司法所 | 普法推荐、AI 治理建议 | 必需 |
| 5 | 效果评估数据 | 各街道 | 效果评估统计、AI 评估报告 | 重要 |
| 6 | 12345投诉数据 | 12345热线 | 普法紧迫度红点、风险研判 | 重要 |
| 7 | 法律知识库 | 法律法规数据库 | AI 法律依据引用、知识图谱 | 重要 |
| 8 | 人口数据 | 民政局/街道办 | 人群精准匹配、靶向普法 | 可选 |

---

## 二、各类数据格式规范

### 2.1 案件基础数据

**文件格式**: JSON / CSV
**编码**: UTF-8
**更新频率**: 建议每月

```json
{
  "id": 1,
  "caseName": "张某诈骗案",
  "caseNumber": "(2026)京0102刑初123号",
  "category": "侵财类犯罪",
  "subCategory": "诈骗罪（含电信网络诈骗）",
  "procedureType": "一审",
  "community": "金融街街道",
  "keywords": "电信诈骗,老年群体,冒充公检法",
  "judgmentReason": "被告人张某通过电话冒充公安机关工作人员...",
  "caseDate": "2026-03-15",
  "status": "已判决",
  "subjects": [
    {
      "name": "张某",
      "age": 32,
      "gender": "男",
      "occupation": "无固定职业",
      "specialIdentity": "",
      "isResident": false,
      "crime": "诈骗罪",
      "summary": "通过电话冒充公安，骗取老年人存款共计12万元"
    }
  ],
  "features": {
    "method": "电话诈骗",
    "location": "居民家中",
    "isGangCrime": false,
    "involvesMinor": false,
    "amount": 120000,
    "victimCount": 3
  }
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | 是 | 唯一标识 |
| `caseName` | string | 是 | 案件名称 |
| `caseNumber` | string | 是 | 案号，格式：(年份)京XXXX刑/民初XXX号 |
| `category` | string | 是 | 一级分类，取值见下表 |
| `subCategory` | string | 是 | 二级分类（具体罪名） |
| `procedureType` | string | 是 | 一审/二审/再审/死刑复核 |
| `community` | string | 是 | 所属街道，如"金融街街道" |
| `keywords` | string | 是 | 逗号分隔的关键词 |
| `judgmentReason` | string | 是 | 裁判理由/案情简述（100-500字） |
| `caseDate` | string | 是 | 案发日期，ISO格式 YYYY-MM-DD |
| `status` | string | 是 | 已判决/审理中/已撤诉 |
| `subjects` | array | 是 | 涉案主体列表 |
| `features` | object | 否 | 案件特征标签 |

**一级分类标准（`category` 取值）**:

| 一级分类 | 包含的二级分类（具体罪名） |
|---|---|
| 侵财类犯罪 | 诈骗罪（含电信网络诈骗）、盗窃罪、抢夺罪 |
| 人身伤害类犯罪 | 故意伤害罪、寻衅滋事罪、非法拘禁罪 |
| 危害公共安全类犯罪 | 危险驾驶罪、交通肇事罪 |
| 妨害社会管理类犯罪 | 聚众斗殴罪、容留他人吸毒罪、帮信罪 |

### 2.2 社区风险点数据

**文件格式**: JSON
**更新频率**: 实时/每日

```json
{
  "community": "金融街街道",
  "longitude": 116.3668,
  "latitude": 39.9152,
  "riskScore": 89,
  "level": "高",
  "annualCases": 45,
  "highIncidenceTypes": "物业纠纷、合同争议",
  "riskAlertPushCount": 32,
  "procuratorateSuggestionCount": 8,
  "legalPlanDeliveryCount": 15,
  "dimensionScores": {
    "商业商圈": 85,
    "历史文化街区": 30,
    "15分钟生活圈": 72,
    "功能属性": 68,
    "人口流动": 90,
    "潮汐特征": 55,
    "风险承载力": 78,
    "社会资本": 45,
    "产业生态": 82,
    "数字化程度": 60
  }
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `community` | string | 是 | 街道/社区名称 |
| `longitude` | number | 是 | 经度 |
| `latitude` | number | 是 | 纬度 |
| `riskScore` | number | 是 | 综合风险分值 0-100 |
| `level` | string | 是 | 高/中/低 |
| `annualCases` | number | 是 | 年度案件数量 |
| `highIncidenceTypes` | string | 是 | 高发案件类型，顿号分隔 |
| `dimensionScores` | object | 否 | 10维分类评分，每维0-100 |

### 2.3 检察建议数据

```json
{
  "id": 1,
  "title": "关于加强社区消防安全管理的检察建议",
  "type": "行政检察",
  "content": "建议社区加强消防安全检查...",
  "target": "金融街街道办事处",
  "issueDate": "2026-04-10",
  "status": "已反馈",
  "relatedCases": [1, 3, 5],
  "community": "金融街街道"
}
```

**`type` 取值**: 刑事检察 / 民事检察 / 行政检察 / 公益诉讼检察
**`status` 取值**: 待处理 / 处理中 / 已反馈 / 已驳回

### 2.4 普法方案数据

```json
{
  "id": 101,
  "title": "物业服务合同解读方案",
  "applicableGroup": "业主委员会",
  "triggerScene": "物业矛盾高发",
  "relatedCategory": "侵财类犯罪",
  "tags": ["高发预警", "人群精准匹配"],
  "autoGenNote": "基于近期社区内物业纠纷增长15%自动生成",
  "resources": [
    { "icon": "🎬", "label": "视频", "count": 2 },
    { "icon": "📄", "label": "PPT", "count": 1 },
    { "icon": "🎨", "label": "传单", "count": 5 }
  ],
  "coverageTarget": 5000,
  "durationDays": 15,
  "approvalRate": 95,
  "pilotCommunities": 3,
  "content": "一、目标：...\n二、内容：...",
  "riskContext": {
    "riskLevel": "高风险",
    "trendPortrait": "近3个月物业纠纷增长15%",
    "subjectPortrait": "以40-60岁业主为主",
    "featureWords": "物业费争议、维修基金、公共区域"
  },
  "legalBasis": [
    {
      "type": "法律",
      "name": "《物业管理条例》第四十一条",
      "content": "业主应当按照物业服务合同的约定交纳物业服务费用"
    }
  ]
}
```

### 2.5 效果评估数据

```json
{
  "period": "2026-04",
  "rates": {
    "responseRate": 88,
    "closeRate": 76,
    "reachRate": 92
  },
  "communityStats": [
    {
      "community": "金融街街道",
      "alerts": 15,
      "closed": 12,
      "activities": 6
    }
  ],
  "trend": [
    {
      "date": "04-01",
      "alertCount": 5,
      "closeRate": 80
    }
  ]
}
```

### 2.6 法律知识库数据

**用于 AI 引用法律依据**

```json
{
  "id": 1,
  "type": "法律",
  "name": "《中华人民共和国民法典》",
  "article": "第二百七十八条",
  "content": "下列事项由业主共同决定：...",
  "relatedCategories": ["侵财类犯罪"],
  "relatedScenes": ["物业纠纷", "合同争议"],
  "effectiveDate": "2021-01-01"
}
```

---

## 三、数据质量要求

### 3.1 必须满足的条件

| # | 要求 | 说明 |
|---|---|---|
| 1 | **脱敏处理** | 所有真实案件数据须进行当事人姓名脱敏（如"张某"） |
| 2 | **编码统一** | 全部使用 UTF-8 编码 |
| 3 | **分类准确** | 案件分类须严格按照上述一级/二级分类标准 |
| 4 | **字段完整** | 必填字段不得为空 |
| 5 | **格式规范** | 日期 YYYY-MM-DD，案号按法院格式 |
| 6 | **无重复** | id 字段全局唯一 |

### 3.2 建议满足的条件

| # | 要求 | 说明 |
|---|---|---|
| 1 | 案情简述 100-500 字 | 太短无法分析，太长影响 AI 效率 |
| 2 | 关键词 3-8 个 | 逗号分隔，便于搜索和 AI 提取 |
| 3 | 涉案主体完整 | 至少包含姓名(脱敏)、年龄、性别 |
| 4 | 地理坐标精确到小数点后 4 位 | 经纬度精度要求 |

---

## 四、AI 提示词注入数据映射

以下说明每个 AI 功能需要哪些数据字段：

### 4.1 态势盘 → AI 风险研判

| 注入字段 | 数据来源 | 说明 |
|---|---|---|
| totalCases | 案件数据聚合 | 本年度案件总数 |
| highIncidenceTypes | 案件数据统计 | 最高发的案件类型名称 |
| riskAlertPushCount | 预警推送记录 | 累计推送次数 |
| procuratorateSuggestions | 检察建议记录 | 累计发送次数 |
| legalPushCount | 普法方案记录 | 累计投递次数 |
| communities | 社区风险点数据 | 各社区名称+案件数 |

### 4.2 风险分析 → AI 案件特征分析

| 注入字段 | 数据来源 | 说明 |
|---|---|---|
| category | 用户选择 | 当前选中的一级分类 |
| caseCount | 案件数据筛选 | 该分类下案件总数 |
| subjectCount | 涉案主体数据 | 该分类涉案人员总数 |
| maleCount | 涉案主体数据 | 男性人数 |
| avgAge | 涉案主体数据 | 平均年龄 |
| topFeatures | 案件特征词 | 前5个高频特征词 |

### 4.3 案件详情 → AI 案情分析

直接使用案件基础数据的全部字段。

### 4.4 检察建议 → AI 辅助生成

| 注入字段 | 数据来源 | 说明 |
|---|---|---|
| type | 用户选择 | 四大检察类型 |
| target | 用户输入 | 建议对象名称 |

### 4.5 普法方案 → AI 治理建议

| 注入字段 | 数据来源 | 说明 |
|---|---|---|
| title | 方案数据 | 方案名称 |
| group | 方案数据 | 适用人群 |
| scene | 方案数据 | 触发场景 |
| category | 方案数据 | 关联案件分类 |
| riskContext | 风险画像数据 | 风险等级+趋势+主体+特征 |
| legalBasis | 法律知识库 | 相关法律条文 |

### 4.6 效果评估 → AI 评估报告

| 注入字段 | 数据来源 | 说明 |
|---|---|---|
| period | 用户选择 | 本周/本月/全年 |
| responseRate | 效果评估数据 | 预警响应率 |
| closeRate | 效果评估数据 | 纠纷化解率 |
| reachRate | 效果评估数据 | 普法触达率 |
| totalAlerts | 效果评估数据 | 预警总量 |
| totalClosed | 效果评估数据 | 已闭环数 |
| communityList | 社区统计数据 | 各社区明细 |

---

## 五、未来模型微调数据准备

如需对智谱 GLM 进行微调以提升输出质量，需准备以下训练数据：

### 5.1 训练数据格式（JSONL）

```jsonl
{"messages": [{"role": "system", "content": "你是西城区检察院的数据分析专家..."}, {"role": "user", "content": "请基于以下侵财类犯罪数据..."}, {"role": "assistant", "content": "【总体态势】西城区侵财类犯罪呈现..."}]}
{"messages": [{"role": "system", "content": "你是西城区检察院的资深检察官..."}, {"role": "user", "content": "请对以下案件进行分析..."}, {"role": "assistant", "content": "【案情要素提取】本案系一起典型的..."}]}
```

### 5.2 训练数据量建议

| 模块 | 建议数据条数 | 说明 |
|---|---|---|
| 风险研判 | 50-100条 | 不同社区组合的研判范例 |
| 案件分析 | 100-200条 | 覆盖各分类的案件分析范例 |
| 检察建议 | 50-100条 | 四大检察类型各25条 |
| 普法方案 | 30-50条 | 不同场景的治理建议范例 |
| 评估报告 | 20-30条 | 不同时段和数据组合 |

### 5.3 数据收集步骤

1. 平台上线后，每次 AI 生成的内容由检察官审核修改
2. 审核通过的"prompt → 修改后output"对作为高质量训练数据
3. 积累足够数据后进行模型微调
4. 微调后的模型替换通用模型，提升输出的专业性和准确性

---

## 六、数据文件存放规范

```
data/
├── cases/                    # 案件数据
│   ├── cases_2026.json       # 按年度组织
│   └── schema.json           # 数据结构定义
├── communities/              # 社区风险点数据
│   └── risk_points.json
├── procuratorate/            # 检察建议数据
│   └── suggestions.json
├── legal-plans/              # 普法方案数据
│   └── plans.json
├── legal-knowledge/          # 法律知识库
│   └── laws.json
├── effects/                  # 效果评估数据
│   └── stats_2026.json
└── training/                 # 模型训练数据
    ├── risk_analysis.jsonl
    ├── case_analysis.jsonl
    ├── procuratorate.jsonl
    ├── legal_plan.jsonl
    └── effect_report.jsonl
```
