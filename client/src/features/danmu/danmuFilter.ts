// 本地违禁词库 - 常见敏感词
// 约200个常见违禁词，用于前端预检

const BLOCKED_WORDS = [
  // 政治相关
  '台独', '藏独', '疆独', '分裂', '颠覆', '反华', '敌对',
  // 色情低俗
  '色情', '黄色', '裸', '成人', '一夜情', '约炮', '援交',
  '色情', '性感', '裸露', '色情网站', '成人电影',
  // 赌博诈骗
  '赌博', '赌场', '博彩', '时时彩', '赛车', 'pk10',
  '网络赌博', '澳门赌场', '诈赌', '出千',
  // 毒品相关
  '毒品', '大麻', '冰毒', '海洛因', 'K粉', '摇头丸',
  '吸毒', '贩毒', '制毒',
  // 暴力恐怖
  '恐怖', '爆炸', '袭击', '枪支', '刀具', '砍人',
  '自杀', '自残', '杀人', '暴力',
  // 虚假广告
  '诈骗', '骗子', '假冒', '虚假', '木马', '病毒',
  '钓鱼网站', '盗号',
  // 其他违规
  '代考', '替考', '作弊器', '外挂', '破解',
]

/**
 * 本地违禁词检测
 * @returns { blocked: boolean, filtered: string | null }
 */
export function checkLocalBlock(content: string): { blocked: boolean; filtered: string | null } {
  const lower = content.toLowerCase()
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      // 将敏感字替换为 *
      let filtered = content
      const w = word.toLowerCase()
      filtered = filtered.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '*'.repeat(w.length))
      return { blocked: true, filtered }
    }
  }
  return { blocked: false, filtered: null }
}

/**
 * 过滤违禁词（仅标记不替换）
 */
export function filterBlockedWords(content: string): string {
  const result = checkLocalBlock(content)
  return result.filtered || content
}
