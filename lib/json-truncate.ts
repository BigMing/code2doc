/**
 * [第二轮新增] JSON 字符串截断工具函数
 * 用于在日志面板展示原始请求/响应时，防止超长字符串撑爆浏览器内存
 */
export function truncateJsonStrings(obj: any, maxLen: number = 500): any {
  if (typeof obj === 'string') {
    if (obj.length > maxLen) {
      return obj.substring(0, maxLen) + `···（剩余${obj.length - maxLen}字节）`;
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => truncateJsonStrings(item, maxLen));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = truncateJsonStrings(value, maxLen);
    }
    return result;
  }
  
  return obj;
}
