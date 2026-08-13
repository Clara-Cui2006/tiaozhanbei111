import type { CaseCategory } from '../../types/platform'
import { PRIORITY_TAGS, type PriorityTag } from '../priority-alerts'

export const CRIMINAL_LAW_CHAPTERS = [
  '危害国家安全罪',
  '危害公共安全罪',
  '破坏社会主义市场经济秩序罪',
  '侵犯公民人身权利、民主权利罪',
  '侵犯财产罪',
  '妨害社会管理秩序罪',
  '危害国防利益罪',
  '贪污贿赂罪',
  '渎职罪',
  '军人违反职责罪'
] as const

export type CriminalLawChapter = (typeof CRIMINAL_LAW_CHAPTERS)[number]

const chapterValue: Record<CriminalLawChapter, number> = {
  危害国家安全罪: 2,
  危害公共安全罪: 4,
  破坏社会主义市场经济秩序罪: 8,
  '侵犯公民人身权利、民主权利罪': 6,
  侵犯财产罪: 9,
  妨害社会管理秩序罪: 7,
  危害国防利益罪: 1,
  贪污贿赂罪: 3,
  渎职罪: 2,
  军人违反职责罪: 1
}

export const PRIORITY_TOPIC_CHAPTERS: Record<PriorityTag, CriminalLawChapter[]> = {
  '违规异地执法和趋利性执法司法': ['侵犯公民人身权利、民主权利罪', '侵犯财产罪', '贪污贿赂罪', '渎职罪'],
  检护民生: ['危害公共安全罪', '侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪'],
  法治化营商环境: ['破坏社会主义市场经济秩序罪', '侵犯财产罪', '妨害社会管理秩序罪', '贪污贿赂罪', '渎职罪'],
  涉外检察: ['危害国家安全罪', '危害公共安全罪', '破坏社会主义市场经济秩序罪', '危害国防利益罪', '军人违反职责罪'],
  涉老检察: ['侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪'],
  涉医检察: ['危害公共安全罪', '破坏社会主义市场经济秩序罪', '侵犯公民人身权利、民主权利罪', '妨害社会管理秩序罪'],
  金融检察: ['破坏社会主义市场经济秩序罪', '侵犯财产罪', '妨害社会管理秩序罪', '贪污贿赂罪']
}

export const RISK_PRIORITY_TOPICS: CaseCategory[] = PRIORITY_TAGS.map((name) => ({
  name,
  value: PRIORITY_TOPIC_CHAPTERS[name].reduce((sum, chapter) => sum + chapterValue[chapter], 0),
  children: PRIORITY_TOPIC_CHAPTERS[name].map((chapter) => ({ name: chapter, value: chapterValue[chapter] }))
}))

export const resolveChapterTopics = (chapterName: string): PriorityTag[] =>
  PRIORITY_TAGS.filter((topic) => PRIORITY_TOPIC_CHAPTERS[topic].includes(chapterName as CriminalLawChapter))

export const resolveVisibleChapters = (topicName: string): CriminalLawChapter[] =>
  topicName ? [...(PRIORITY_TOPIC_CHAPTERS[topicName as PriorityTag] ?? [])] : [...CRIMINAL_LAW_CHAPTERS]

export const resolveVisibleTopics = (chapterName: string): PriorityTag[] =>
  chapterName ? resolveChapterTopics(chapterName) : [...PRIORITY_TAGS]

export const RISK_SOURCE_CATEGORIES: Record<PriorityTag, string[]> = {
  '违规异地执法和趋利性执法司法': ['侵财类犯罪', '妨害社会管理类犯罪'],
  检护民生: ['人身伤害类犯罪', '侵财类犯罪', '危害公共安全类犯罪', '妨害社会管理类犯罪'],
  法治化营商环境: ['侵财类犯罪', '妨害社会管理类犯罪'],
  涉外检察: ['危害公共安全类犯罪', '妨害社会管理类犯罪'],
  涉老检察: ['人身伤害类犯罪', '侵财类犯罪'],
  涉医检察: ['人身伤害类犯罪', '危害公共安全类犯罪', '妨害社会管理类犯罪'],
  金融检察: ['侵财类犯罪', '妨害社会管理类犯罪']
}

export const resolveRiskSourceCategories = (categoryName: string): string[] =>
  RISK_SOURCE_CATEGORIES[categoryName as PriorityTag]
  ?? (CRIMINAL_LAW_CHAPTERS.includes(categoryName as CriminalLawChapter)
    ? unique(resolveChapterTopics(categoryName).flatMap((topic) => RISK_SOURCE_CATEGORIES[topic]))
    : [categoryName])

const SOURCE_CATEGORY_CRIMES: Record<string, string[]> = {
  侵财类犯罪: ['盗窃罪', '诈骗罪', '职务侵占罪', '抢夺罪', '行贿罪'],
  人身伤害类犯罪: ['故意伤害罪', '寻衅滋事罪', '非法拘禁罪', '聚众斗殴罪'],
  危害公共安全类犯罪: ['危险驾驶罪', '交通肇事罪'],
  妨害社会管理类犯罪: ['掩饰、隐瞒犯罪所得罪', '生产销售有毒有害食品罪', '侵犯公民个人信息罪', '虚开增值税专用发票罪', '帮助信息网络犯罪活动罪', '容留他人吸毒罪']
}

const SOURCE_CATEGORY_FEATURE_WORDS: Record<string, string[]> = {
  侵财类犯罪: ['入室盗窃', '扒窃', '网络诈骗', '电话诈骗', '居民小区', '商业区域', '交通工具内', '夜间作案', '单独作案', '团伙作案', '前科人员', '涉未成年人', '公司办公区'],
  人身伤害类犯罪: ['公共场所', '居民小区', '白天作案', '夜间作案', '单独作案', '累犯', '债务纠纷', '涉未成年人'],
  危害公共安全类犯罪: ['醉酒驾驶', '公共场所', '白天作案', '夜间作案', '单独作案', '交通工具内'],
  妨害社会管理类犯罪: ['团伙作案', '公共场所', '居民小区', '夜间作案', '前科人员', '累犯', '涉未成年人', '公司办公区', '线上淘宝店']
}

const unique = (values: string[]) => [...new Set(values)]

export const resolveRiskCrimes = (categoryName: string): string[] =>
  unique(resolveRiskSourceCategories(categoryName).flatMap((source) => SOURCE_CATEGORY_CRIMES[source] ?? []))

export const resolveRiskFeatureWords = (categoryName: string): string[] =>
  unique(resolveRiskSourceCategories(categoryName).flatMap((source) => SOURCE_CATEGORY_FEATURE_WORDS[source] ?? []))
