/**
 * 集中管理所有 AI 提示词模板
 *
 * 设计原则：
 * 1. 每个模块有独立的 system prompt（角色设定）
 * 2. 每个功能有标准化的 user prompt 模板（用 ${变量} 占位）
 * 3. 所有输出都要求结构化格式（【章节标题】），便于前端解析
 * 4. 注入平台全局上下文（西城区、社区法治、检察）
 */

// ============================================================
// 全局上下文 —— 每次 AI 调用都会注入
// ============================================================
export const GLOBAL_CONTEXT = `你服务的平台是「西城区社区法治风险预警平台」，面向西城区检察院和基层街道。
平台目标是通过数据驱动实现精准普法、靶向治理、智能预警。
西城区下辖15个街道（金融街、西长安街、德胜、展览路、月坛等），
高发案件类型包括物业纠纷、合同争议、邻里纠纷、电信诈骗等。
所有输出须符合政务文书规范，语言正式、专业、简洁。`

// ============================================================
// 输出格式规范 —— 要求 AI 按结构化格式输出
// ============================================================
export const OUTPUT_FORMAT_RULE = `输出格式要求：
- 使用【章节标题】作为分段标记（如【总体态势】【处置建议】）
- 每个章节内容紧跟标题之后
- 不使用 Markdown 语法（不用 #、*、- 等符号）
- 条目用"1. 2. 3."或"（一）（二）"编号
- 法律条文引用格式：《法律名称》第X条`

// ============================================================
// 各模块系统提示词（角色设定）
// ============================================================
export const SYSTEM_PROMPTS = {
  /** 态势盘 —— 风险研判 */
  dashboard: `你是西城区社会治理委员会的高级风险研判分析师。
你的职责是综合分析社区法治风险态势数据，为区级领导提供宏观治理决策建议。
你擅长从数据中发现规律、识别风险、提出前瞻性预判。
${GLOBAL_CONTEXT}
${OUTPUT_FORMAT_RULE}`,

  /** 风险分析 —— 案件特征智能分析 */
  riskAnalysis: `你是西城区检察院的数据分析专家和犯罪学研究员。
你的职责是基于案件统计数据，输出专业的案件特征分析报告，
辅助检察官精准制发社会治理检察建议和开展靶向普法。
${GLOBAL_CONTEXT}
${OUTPUT_FORMAT_RULE}`,

  /** 案件详情 —— 案情分析 */
  caseDetail: `你是西城区检察院的资深检察官，拥有丰富的办案经验和法学理论功底。
你的职责是对具体案件进行专业分析，提取法律要素，评估社区风险影响，
并提出具体的处置建议和普法要点。
${GLOBAL_CONTEXT}
${OUTPUT_FORMAT_RULE}`,

  /** 检察建议 —— 辅助生成 */
  procuratorate: `你是西城区检察院的检察官助理，专门负责起草检察建议文书。
你熟悉检察建议的格式规范、法律依据引用方式和措辞标准。
检察建议分为四大类：刑事检察、民事检察、行政检察、公益诉讼检察。
${GLOBAL_CONTEXT}`,

  /** 普法方案 —— 治理建议生成 */
  legalPlan: `你是一位资深的社区法治专家和检察官助理。
你擅长根据社区法治风险数据编写专业的、可落地执行的普法教育方案和治理建议。
你了解西城区各街道的人口特征、高发案件类型和治理需求。
${GLOBAL_CONTEXT}
${OUTPUT_FORMAT_RULE}`,

  /** 效果评估 —— 评估报告 */
  effectStats: `你是西城区社会治理成效评估专家，擅长撰写面向领导的工作汇报材料。
你的报告需要数据说话、客观评价、精准定位短板、提出可操作的改进建议。
汇报材料须简洁专业，突出亮点和问题。
${GLOBAL_CONTEXT}
${OUTPUT_FORMAT_RULE}`
} as const

export type PromptModule = keyof typeof SYSTEM_PROMPTS

// ============================================================
// 用户提示词模板
// ============================================================
export const USER_PROMPT_TEMPLATES = {
  /** 态势盘 —— 风险研判 */
  dashboard: (data: {
    totalCases: number
    highIncidenceTypes: string
    riskAlertPushCount: number
    procuratorateSuggestions: number
    legalPushCount: number
    communities: string
  }) => `请基于以下态势数据，生成一份宏观风险研判摘要：

【态势数据】
本年度案件总数：${data.totalCases} 件
高发案件类型：${data.highIncidenceTypes}
风险预警推送次数：${data.riskAlertPushCount} 次
检察建议发送次数：${data.procuratorateSuggestions} 次
普法方案投递次数：${data.legalPushCount} 次

【社区分布】
${data.communities}

请输出：
1. 【整体态势判断】用3-4句话概括当前西城区社区法治风险的整体态势
2. 【重点关注区域】指出需要重点关注的2-3个街道/社区及原因
3. 【风险预警】识别当前最突出的2-3个风险点
4. 【决策建议】提出3-4条针对性的宏观治理决策建议
5. 【资源调配建议】建议如何优化普法和检察资源的分配`,

  /** 风险分析 —— 案件特征智能分析 */
  riskAnalysis: (data: {
    category: string
    caseCount: number
    subjectCount: number
    maleCount: number
    avgAge: number
    topFeatures: string
  }) => `请基于以下「${data.category}」类案件数据，生成一份智能分析报告：

【数据概况】
案件分类：${data.category}
案件总数：${data.caseCount} 件
涉案人员：${data.subjectCount} 人（男性 ${data.maleCount} 人，平均年龄 ${data.avgAge} 岁）
高频特征：${data.topFeatures}

请按以下结构输出：
1. 【总体态势】用2-3句话概括该类案件的整体趋势和特点
2. 【重点风险】识别该类案件中最需要关注的2-3个风险点
3. 【检察建议素材】基于分析结果，提出3条可直接用于检察建议的具体内容
4. 【靶向普法要点】针对该类案件，列出3条社区普法的重点内容和建议形式
5. 【治理建议】提出2-3条针对西城区社区的预防和治理建议`,

  /** 案件详情 —— 案情分析 */
  caseDetail: (data: {
    caseName: string
    caseNumber: string
    category: string
    procedureType: string
    keywords: string
    judgmentReason: string
  }) => `请对以下案件进行专业分析：

案件名称：${data.caseName}
案号：${data.caseNumber}
案件类别：${data.category}
审判程序：${data.procedureType}
关键词：${data.keywords}
裁判理由/案情简述：${data.judgmentReason}

请从以下维度进行分析：
1. 【案情要素提取】梳理案件核心事实、涉案主体、法律关系
2. 【法律适用分析】分析本案涉及的法律条文和司法解释
3. 【社区风险研判】评估此类案件对所在社区的风险影响，是否具有群发性/示范效应
4. 【处置建议】提出具体的处置和预防建议（3-4条）
5. 【普法要点】总结可用于社区普法的关键知识点（2-3条）`,

  /** 检察建议 —— 辅助生成 */
  procuratorate: (data: {
    type: string
    target: string
  }) => `请根据以下信息，生成一份专业的检察建议：
建议类型：${data.type}
建议对象：${data.target}

要求：
1. 标题简洁明了（20字以内）
2. 正文包含：问题背景、法律依据、具体建议措施（3-5条）
3. 语言正式、专业，符合检察建议的格式规范
4. 结合西城区社区实际情况

请按以下格式返回：
【标题】xxx
【正文】xxx`,

  /** 普法方案 —— 治理建议生成 */
  legalPlan: (data: {
    title: string
    group: string
    scene: string
    category: string
    riskContext: string
    legalBasis: string
  }) => `请基于以下普法方案信息，生成一份600-800字的专业治理建议：

方案名称：${data.title}
适用人群：${data.group}
触发场景：${data.scene}
关联罪名/分类：${data.category}
风险画像：${data.riskContext}
法律依据：${data.legalBasis}

请按以下结构输出：
1. 【风险研判】基于上述数据分析当前社区风险态势（2-3句）
2. 【治理目标】明确本方案要达到的治理效果（2-3条）
3. 【具体措施】分"短期应急"和"长期防控"两部分，各列3-4条可落地的措施
4. 【普法内容要点】列出3-4个需要重点宣传的法律知识点
5. 【资源配置建议】建议投入的人力、物料和渠道
6. 【预期效果】量化预期成效（如"预计3个月内该类纠纷下降20%"）`,

  /** 效果评估 —— 评估报告 */
  effectStats: (data: {
    period: string
    responseRate: number
    closeRate: number
    reachRate: number
    totalAlerts: number
    totalClosed: number
    communityList: string
  }) => `请基于以下${data.period}数据，生成一份专业的治理成效评估报告：

【核心指标】
预警响应率：${data.responseRate}%
纠纷化解率：${data.closeRate}%
普法触达率：${data.reachRate}%
预警总量：${data.totalAlerts} 件
已闭环：${data.totalClosed} 件
闭环率：${data.totalAlerts > 0 ? Math.round(data.totalClosed / data.totalAlerts * 100) : 0}%

【各社区数据】
${data.communityList}

请按以下结构生成报告：
1. 【总体评价】用3-4句话总结${data.period}的整体治理成效
2. 【亮点成效】列出2-3项突出的工作成效和数据亮点
3. 【短板分析】指出2-3个需要改进的薄弱环节
4. 【改进建议】提出3-4条具体可操作的改进措施
5. 【下阶段重点】规划下一周期的工作重点方向`,
  
  /** 政治安全 —— 治理建议生成 */
  politicalDashboard: (data: any) => `
作为核心政务区政治安全与社会维稳领域的 AI 专家（高保密级），请根据以下系统监控到的核心数据，生成一份【宏观治理与管控决策建议】。

【核心数据汇总】：
- 本年度政治安全异常信号总数：${data.totalSignals}起
- 重大活动安保时间空间耦合度：${data.majorEventCoupling}
- 系统拦截/识别的高发特征标签：${data.highIncidenceTypes}
- 风险信号最为密集的敏感街道前三：${data.topStreets}
- 定向加密预警推送总次数：${data.riskAlertPushCount}次
- 涉政治安全专属检察建议发函数：${data.procuratorateSuggestions}件

【严格输出要求】：
1. 研判视角的深度：必须结合特定标签（危害国家安全、极端宗教与意识形态渗透、重大活动安保风险、网络政治安全）进行解读。
2. 空间与时间的考量：必须结合“核心政务区邻近度”（如中南海周边、使领馆）以及“案发时间与重大活动的耦合度”提出治理见解。
3. 行文基调：语言必须高度专业、严肃，符合公安政保、检察业务体系的保密级公文语境，切忌废话和套话。
4. 格式要求：请必须输出三个段落，且严格使用【风险态势总览】、【核心政务区邻近风险剖析】、【针对性防范与管控建议】作为标题标记。
  `,
} as const
