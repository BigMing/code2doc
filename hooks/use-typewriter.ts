/**
 * 第四轮新增：流式响应与打字机效果
 * 打字机效果自定义 Hook
 */
import { useState, useEffect, useRef } from 'react';

export function useTypewriter(fullText: string, isActive: boolean, speed: number = 8) {
  const [index, setIndex] = useState(0);
  const [prevActive, setPrevActive] = useState(isActive);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 如果状态从 false 变为 true，重置索引 (在渲染期间处理以避免 lint 警告)
  if (isActive !== prevActive) {
    setPrevActive(isActive);
    if (isActive) setIndex(0);
  }

  useEffect(() => {
    // 如果不活跃，停止定时器
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // 如果已经播完，停止
    if (index >= fullText.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // 动态调整速度：如果文本非常长，逐渐加速
    const currentSpeed = fullText.length > 2000 ? Math.max(1, speed - Math.floor(index / 1000)) : speed;
    
    // 每次 tick 追加的字符数（长文本优化）
    const step = fullText.length > 5000 ? (index > 1000 ? 5 : 2) : 1;

    timerRef.current = setInterval(() => {
      setIndex(prev => {
        const nextIndex = prev + step;
        if (nextIndex >= fullText.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          return fullText.length;
        }
        return nextIndex;
      });
    }, currentSpeed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, fullText, speed, index]);

  const skip = () => {
    setIndex(fullText.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return { 
    displayText: fullText.slice(0, index), 
    isComplete: index >= fullText.length, 
    skip,
    currentIndex: index
  };
}
