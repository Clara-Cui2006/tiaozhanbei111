import type { CaseCategory } from '../../types/platform'

export const CRIMINAL_LAW_CHAPTERS = [
  '危害国家安全罪',
  '危害公共安全罪',
  '破坏社会主义市场经济秩序罪',
  '侵犯公民人身权利、民主权利罪',
  '侵犯财产罪',
  '妨害社会管理秩序罪',
  '贪污贿赂罪'
] as const

type CriminalLawChapter = (typeof CRIMINAL_LAW_CHAPTERS)[number]

const chapterValue: Record<CriminalLawChapter, number> = {
  危害国家安全罪: 1,
  危害公共安全罪: 2,
  破坏社会主义市场经济秩序罪: 4,
  '侵犯公民人身权利、民主权利罪': 4,
  侵犯财产罪: 12,
  妨害社会管理秩序罪: 8,
  贪污贿赂罪: 1
}

const category = (name: string, chapters: CriminalLawChapter[]): CaseCategory => ({
  name,
  value: chapters.reduce((sum, chapter) => sum + chapterValue[chapter], 0),
  children: chapters.map((name) => ({ name, value: chapterValue[name] }))
})

export const RISK_GOVERNANCE_CATEGORIES: CaseCategory[] = [
  category('邻里与社区治理', ['侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪', '危害公共安全罪']),
  category('民生权益保障', ['侵犯公民人身权利、民主权利罪', '侵犯财产罪', '破坏社会主义市场经济秩序罪', '妨害社会管理秩序罪']),
  category('公共安全治理', ['危害公共安全罪', '妨害社会管理秩序罪', '破坏社会主义市场经济秩序罪']),
  category('生态环境与市容治理', ['妨害社会管理秩序罪', '破坏社会主义市场经济秩序罪', '危害公共安全罪']),
  category('市场秩序与企业经营', ['破坏社会主义市场经济秩序罪', '侵犯财产罪', '妨害社会管理秩序罪', '贪污贿赂罪']),
  category('刑事犯罪与社会治安', ['危害国家安全罪', '危害公共安全罪', '侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪', '贪污贿赂罪'])
]

export const RISK_SOURCE_CATEGORIES: Record<string, string[]> = {
  邻里与社区治理: ['人身伤害类犯罪', '侵财类犯罪', '妨害社会管理类犯罪', '危害公共安全类犯罪'],
  民生权益保障: ['人身伤害类犯罪', '侵财类犯罪', '妨害社会管理类犯罪'],
  公共安全治理: ['危害公共安全类犯罪', '妨害社会管理类犯罪'],
  生态环境与市容治理: ['妨害社会管理类犯罪', '危害公共安全类犯罪'],
  市场秩序与企业经营: ['侵财类犯罪', '妨害社会管理类犯罪'],
  刑事犯罪与社会治安: ['侵财类犯罪', '人身伤害类犯罪', '危害公共安全类犯罪', '妨害社会管理类犯罪']
}

export const resolveRiskSourceCategories = (categoryName: string): string[] =>
  RISK_SOURCE_CATEGORIES[categoryName] ?? [categoryName]

const SOURCE_CATEGORY_CRIMES: Record<string, string[]> = {
  侵财类犯罪: ['盗窃罪', '诈骗罪', '职务侵占罪', '抢夺罪', '行贿罪'],
  人身伤害类犯罪: ['故意伤害罪', '寻衅滋事罪', '非法拘禁罪', '聚众斗殴罪'],
  危害公共安全类犯罪: ['危险驾驶罪', '交通肇事罪'],
  妨害社会管理类犯罪: ['掩饰、隐瞒犯罪所得罪', '生产销售有毒有害食品罪', '侵犯公民个人信息罪', '虚开增值税专用发票罪', '帮助信息网络犯罪活动罪', '容留他人吸毒罪']
}

const SOURCE_CATEGORY_FEATURE_WORDS: Record<string, string[]> = {
  侵财类犯罪: ['入室盗窃', '扒窃', '网络诈骗', '电话诈骗', '居民小区', '商业区域', '交通工具内', '夜间作案', '单独作案', '团伙作案', '前科人员', '涉未成年人'],
  人身伤害类犯罪: ['公共场所', '居民小区', '白天作案', '夜间作案', '单独作案', '累犯', '债务纠纷', '涉未成年人'],
  危害公共安全类犯罪: ['醉酒驾驶', '公共场所', '白天作案', '夜间作案', '单独作案', '交通工具内'],
  妨害社会管理类犯罪: ['团伙作案', '公共场所', '居民小区', '夜间作案', '前科人员', '累犯', '涉未成年人', '公司办公区', '线上淘宝店']
}

const unique = (values: string[]) => [...new Set(values)]

export const resolveRiskCrimes = (categoryName: string): string[] =>
  unique(resolveRiskSourceCategories(categoryName).flatMap((source) => SOURCE_CATEGORY_CRIMES[source] ?? []))

export const resolveRiskFeatureWords = (categoryName: string): string[] =>
  unique(resolveRiskSourceCategories(categoryName).flatMap((source) => SOURCE_CATEGORY_FEATURE_WORDS[source] ?? []))
