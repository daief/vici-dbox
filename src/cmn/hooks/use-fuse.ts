import { useMemo, useState } from 'react';

export type IUseFuseOptions<T> = {
  maxResults?: number;
  keys?: (keyof T)[];
};

// 计算匹配度得分，同时判断是否匹配
// 返回值大于 0 表示匹配成功，且得分越高表示匹配度越高
const calculateMatchScore = (str: any, query: string) => {
  if (typeof str !== 'string' || !query) {
    return 0;
  }

  str = str.toLowerCase();
  query = query.toLowerCase();

  // 进行匹配并同时计算得分
  let qidx = 0;
  let sidx = 0;
  let matchLength = 0;
  let lastMatchIndex = -1;
  let continuousMatches = 0;
  let score = 0;

  // 先检查精确匹配（极高权重）
  if (str.includes(query)) {
    score += 10000;

    // 如果在开头匹配给予额外分数
    if (str.startsWith(query)) {
      score += 5000;
    } else {
      // 匹配位置越靠前，分数越高
      score += 3000 / (str.indexOf(query) + 1);
    }
  }

  // 检查子序列匹配
  while (qidx < query.length && sidx < str.length) {
    if (query[qidx] === str[sidx]) {
      matchLength++;

      // 计算连续匹配
      if (lastMatchIndex === sidx - 1) {
        continuousMatches++;
      } else {
        continuousMatches = 1;
      }

      // 连续匹配奖励
      score += continuousMatches * 10;

      // 位置奖励（匹配位置越靠前分数越高）
      score += 100 / (sidx + 1);

      lastMatchIndex = sidx;
      qidx++;
    }
    sidx++;
  }

  // 如果没有完全匹配查询词，返回 0
  if (qidx < query.length) {
    return 0;
  }

  // 匹配比例（匹配字符数量/字符串长度）
  score += (matchLength / str.length) * 500;

  return score;
};

// 计算项目匹配所有查询词的总得分，同时判断是否满足所有查询词
// 返回 {match: boolean, score: number} 结构
const evaluateItem = <T>(item: T, queries: string[], keys: (keyof T)[]) => {
  let totalScore = 0;

  // 必须匹配所有查询词
  for (const query of queries) {
    let maxScore = 0;

    if (!keys.length) {
      maxScore = calculateMatchScore(item, query);
    } else {
      // 任意字段匹配即可
      for (const key of keys) {
        const score = calculateMatchScore(item?.[key], query);
        if (score > maxScore) {
          maxScore = score;
        }
      }
    }

    // 如果有一个查询词不匹配，整体不匹配
    if (maxScore === 0) {
      return { match: false, score: 0 };
    }

    totalScore += maxScore;
  }

  return { match: true, score: totalScore };
};

const searchList = <T>(list: T[], query: string, opts: IUseFuseOptions<T>): T[] => {
  const { keys = [], maxResults } = opts;
  const queries = query
    .split(' ')
    .filter(Boolean)
    .map(it => it.toLowerCase());

  if (!queries.length) return maxResults ? list.slice(0, maxResults) : list;

  // 创建匹配项和分数的集合
  const scoredResults: Array<{ item: T; score: number }> = [];

  for (const item of list) {
    // 同时评估匹配状态和得分
    const { match, score } = evaluateItem(item, queries, keys);

    if (match) {
      scoredResults.push({ item, score });

      // 性能优化：找到足够多的匹配项后进行一次排序和裁剪
      if (maxResults && scoredResults.length >= maxResults * 2) {
        scoredResults.sort((a, b) => b.score - a.score);
        while (scoredResults.length > maxResults) {
          scoredResults.pop();
        }
      }
    }
  }

  // 最终排序：按照匹配度得分降序排列
  scoredResults.sort((a, b) => b.score - a.score);

  // 提取排序后的项目
  const results = scoredResults.map(result => result.item);

  // 限制结果数量
  return maxResults ? results.slice(0, maxResults) : results;
};

export const useFuse = <T>(
  list?: T[],
  optsArg?: IUseFuseOptions<T>,
  defaultQuery = '',
): {
  results: T[];
  query: string;
  search: (query: string) => void;
} => {
  const opts: IUseFuseOptions<T> = useMemo(() => {
    return {
      maxResults: 20,
      ...optsArg,
    };
  }, [JSON.stringify(optsArg)]);
  const [query, setQuery] = useState(defaultQuery);
  const results = useMemo(() => searchList(list || [], query, opts), [list, query, opts]);
  return {
    results,
    query,
    search: setQuery,
  };
};
