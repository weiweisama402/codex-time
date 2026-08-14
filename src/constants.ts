import type { CategoryKey } from './types';

export const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000001';

export const CATEGORIES: Array<{
  key: CategoryKey;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
}> = [
  {
    key: 'main',
    label: '主要工作',
    shortLabel: '主要',
    color: '#315c87',
    description: '直接推进长期目标的高价值工作'
  },
  {
    key: 'extra',
    label: '附加工作',
    shortLabel: '附加',
    color: '#8a5a12',
    description: '课程、事务与必要支持工作'
  },
  { key: 'leisure', label: '休闲', shortLabel: '休闲', color: '#2f7d6d', description: '恢复精力的主动休息' },
  { key: 'fun', label: '娱乐', shortLabel: '娱乐', color: '#9b5272', description: '游戏、影视与消遣' }
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((category) => [category.key, category])
) as Record<CategoryKey, (typeof CATEGORIES)[number]>;

export const RESEARCH_PROJECTS: Array<{ name: string; categoryKey: CategoryKey; color: string }> = [
  { name: 'Ti6Al4V 实验', categoryKey: 'main', color: '#416c9b' },
  { name: '纯铜实验', categoryKey: 'main', color: '#a96645' },
  { name: '机器学习本构', categoryKey: 'main', color: '#5e6fa8' },
  { name: 'VUMAT 工程实现', categoryKey: 'main', color: '#3d7f7a' },
  { name: '论文写作', categoryKey: 'main', color: '#745b8f' },
  { name: '课程与事务', categoryKey: 'extra', color: '#8a5a12' }
];
