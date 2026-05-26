'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiSave, apiLoad } from '@/lib/server-storage';

const STORAGE_KEY = 'CODE2DOC_ONBOARDING_V1';

interface TourStep {
  title: string;
  description: string;
  targetFinder: () => Element | null;
  fallbackRect: (vw: number, vh: number) => DOMRectLike;
}

interface DOMRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getRect(el: Element): DOMRectLike {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function findByText(tag: string, text: string): Element | null {
  return (
    Array.from(document.querySelectorAll(tag)).find((el) =>
      el.textContent?.includes(text)
    ) || null
  );
}

function findParentByClass(el: Element | null, className: string, depth = 5): Element | null {
  let curr: Element | null = el;
  for (let i = 0; i < depth && curr; i++) {
    if (curr.classList?.contains(className)) return curr;
    curr = curr.parentElement;
  }
  return curr;
}

const STEPS: TourStep[] = [
  {
    title: '第一步',
    description: '粘贴或上传您的源代码',
    targetFinder: () => {
      const ta = document.querySelector('textarea');
      if (ta) return ta;
      const upload = findByText('button', '上传文件');
      if (upload) return upload.parentElement || upload;
      return null;
    },
    fallbackRect: (vw, vh) => ({
      x: 0,
      y: 80,
      width: vw * 0.25,
      height: vh - 110,
    }),
  },
  {
    title: '第二步',
    description: '选择编程语言，点击生成需求文档（快捷键 Ctrl+Enter）',
    targetFinder: () => findByText('button', '生成需求文档'),
    fallbackRect: (vw, vh) => ({
      x: vw * 0.02,
      y: vh - 140,
      width: vw * 0.21,
      height: 48,
    }),
  },
  {
    title: '第三步',
    description: '查看 AI 生成的需求文档，可导出为 Markdown',
    targetFinder: () => {
      const h3 = findByText('h3', '需求文档预览');
      if (h3) return findParentByClass(h3.parentElement, 'h-full', 4) || h3.parentElement || h3;
      const docPanel = document.querySelector('[data-panel="doc"]');
      if (docPanel) return docPanel;
      const panels = document.querySelectorAll('.h-full');
      return panels[1] || null;
    },
    fallbackRect: (vw, vh) => ({
      x: vw * 0.25,
      y: 80,
      width: vw * 0.375,
      height: vh - 110,
    }),
  },
  {
    title: '第四步',
    description: '对比原始代码与 AI 补全注释后的代码',
    targetFinder: () => {
      const h3 = findByText('h3', '代码补全分析');
      if (h3) return findParentByClass(h3.parentElement, 'h-full', 4) || h3.parentElement || h3;
      const codePanel = document.querySelector('[data-panel="code"]');
      if (codePanel) return codePanel;
      const panels = document.querySelectorAll('.h-full');
      return panels[2] || null;
    },
    fallbackRect: (vw, vh) => ({
      x: vw * 0.625,
      y: 80,
      width: vw * 0.375,
      height: vh - 110,
    }),
  },
];

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRectLike>({ x: 0, y: 0, width: 0, height: 0 });
  const [winSize, setWinSize] = useState({ w: 0, h: 0 });
  const [checked, setChecked] = useState(false);
  const maskId = useRef(`tour-mask-${Math.random().toString(36).slice(2, 9)}`).current;

  // 检测是否已看过引导（优先 localStorage，回退服务端存储）
  useEffect(() => {
    let cancelled = false;
    async function check() {
      let done = false;
      try {
        done = localStorage.getItem(STORAGE_KEY) === 'true';
      } catch {
        // ignore
      }
      if (!done) {
        try {
          const remote = await apiLoad(STORAGE_KEY);
          if (remote === true) {
            done = true;
            // 同步回 localStorage，减少后续网络请求
            try {
              localStorage.setItem(STORAGE_KEY, 'true');
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore
        }
      }
      if (!cancelled) {
        setChecked(true);
        if (!done) {
          // 延迟一点弹出，等待布局稳定
          const timer = setTimeout(() => setVisible(true), 800);
          return () => clearTimeout(timer);
        }
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  // 计算高亮区域
  const updateRect = useCallback(() => {
    if (!visible) return;
    const step = STEPS[currentStep];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setWinSize({ w: vw, h: vh });

    const el = step.targetFinder();
    if (el) {
      setRect(getRect(el));
    } else {
      setRect(step.fallbackRect(vw, vh));
    }
  }, [visible, currentStep]);

  useEffect(() => {
    updateRect();
  }, [updateRect]);

  useEffect(() => {
    if (!visible) return;
    const onResize = () => updateRect();
    window.addEventListener('resize', onResize);
    const id = setInterval(updateRect, 500); // 应对面板拖拽调整
    return () => {
      window.removeEventListener('resize', onResize);
      clearInterval(id);
    };
  }, [visible, updateRect]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finishTour();
    }
  };

  const handleSkip = () => {
    finishTour();
  };

  const finishTour = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    // 同时持久化到服务端，实现跨浏览器/无痕模式兼容
    try {
      apiSave(STORAGE_KEY, true).catch(() => {});
    } catch {
      // ignore
    }
  };

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  // 提示气泡位置：优先放在高亮框右下方，如果空间不够则左上方
  const tooltipX =
    rect.x + rect.width + 16 + 320 <= winSize.w
      ? rect.x + rect.width + 16
      : rect.x - 16 - 320 >= 0
        ? rect.x - 16 - 320
        : rect.x + 16;

  const tooltipY =
    rect.y + 16 + 180 <= winSize.h
      ? rect.y + 16
      : rect.y + rect.height - 180 >= 0
        ? rect.y + rect.height - 180
        : rect.y + 16;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* SVG 遮罩挖孔 */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ touchAction: 'none' }}
          >
            <defs>
              <mask id={maskId}>
                <rect x="0" y="0" width={winSize.w} height={winSize.h} fill="white" />
                <motion.rect
                  x={rect.x - 6}
                  y={rect.y - 6}
                  width={rect.width + 12}
                  height={rect.height + 12}
                  rx="10"
                  fill="black"
                  initial={false}
                  animate={{
                    x: rect.x - 6,
                    y: rect.y - 6,
                    width: rect.width + 12,
                    height: rect.height + 12,
                  }}
                  transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                />
              </mask>
            </defs>
            <motion.rect
              x="0"
              y="0"
              width={winSize.w}
              height={winSize.h}
              fill="rgba(15, 23, 42, 0.55)"
              mask={`url(#${maskId})`}
              className="backdrop-blur-sm"
              initial={false}
            />
            {/* 高亮框描边 */}
            <motion.rect
              x={rect.x - 6}
              y={rect.y - 6}
              width={rect.width + 12}
              height={rect.height + 12}
              rx="10"
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              initial={false}
              animate={{
                x: rect.x - 6,
                y: rect.y - 6,
                width: rect.width + 12,
                height: rect.height + 12,
              }}
              transition={{ type: 'spring', stiffness: 250, damping: 28 }}
            />
          </svg>

          {/* 提示气泡 */}
          <motion.div
            className="absolute z-[101] w-80"
            style={{ left: tooltipX, top: tooltipY }}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            key={currentStep}
          >
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {step.title}
                </span>
                <span className="ml-auto text-[10px] font-bold text-slate-300 dark:text-slate-600">
                  {currentStep + 1} / {STEPS.length}
                </span>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-5">
                {step.description}
              </p>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 uppercase tracking-wider transition-colors"
                >
                  跳过引导
                </button>
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] font-bold uppercase tracking-wider"
                      onClick={() => setCurrentStep((s) => s - 1)}
                    >
                      上一步
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className={cn(
                      'h-7 text-[11px] font-bold uppercase tracking-wider gap-1',
                      isLast
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    )}
                    onClick={handleNext}
                  >
                    {isLast ? '开始体验' : '下一步'}
                    {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 关闭按钮 */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-[101] w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center transition-colors"
            title="关闭引导"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
