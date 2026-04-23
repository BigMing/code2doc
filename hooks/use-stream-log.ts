/**
 * 第四轮新增：流式响应与打字机效果
 * 流式日志进度防抖 Hook
 */
import { useEffect, useRef } from 'react';
import { LogType } from '@/lib/types';

export function useStreamLog(
  charsReceived: number, 
  isStreaming: boolean, 
  addLog: (message: string, type?: LogType) => void
) {
  const lastLoggedRef = useRef(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!isStreaming) {
      lastLoggedRef.current = 0;
      startTimeRef.current = 0;
      return;
    }

    if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }

    // 每累积 800 字符或每 1.5 秒记录一次进度
    const now = Date.now();
    const timeElapsed = now - startTimeRef.current;
    
    if (charsReceived - lastLoggedRef.current >= 800 || (timeElapsed > 1500 && charsReceived > lastLoggedRef.current)) {
      addLog(`已接收数据 ${charsReceived.toLocaleString()} 字符...`, 'info');
      lastLoggedRef.current = charsReceived;
      // 重置时间以便下一次 1.5s 判断
      startTimeRef.current = now;
    }
  }, [charsReceived, isStreaming, addLog]);
}
