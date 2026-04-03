import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LiveTaskGroup, LiveTaskData } from '../../../services/api'
import { TipTapViewer } from '../../../components/editor/TipTapViewer'
import { useTranslation } from '../../../i18n/useTranslation'

interface TaskPreviewCardProps {
  taskGroup: LiveTaskGroup
  onPublish: () => void
  onClose: () => void
  onProjectToWhiteboard?: (taskGroup: LiveTaskGroup) => void
  onStartClassChallenge?: () => void
  onStartDuel?: () => void
  onStartQuickAnswer?: () => void
}

export function TaskPreviewCard({ taskGroup, onPublish, onClose, onProjectToWhiteboard, onStartClassChallenge, onStartDuel, onStartQuickAnswer }: TaskPreviewCardProps) {
  const { t } = useTranslation()
  const [position, setPosition] = useState({ x: 50, y: 45 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [isExperimentExpanded, setIsExperimentExpanded] = useState(false)
  const [isReadingExpanded, setIsReadingExpanded] = useState(false)

  const tasks = taskGroup.tasks || []
  const currentTask: LiveTaskData | null = tasks[currentTaskIndex] || null

  // 判断是否为阅读任务或实验题（这两种类型不显示投影按钮）
  const isReadingTask = currentTask?.type === 'reading'
  const isExperimentTask = currentTask?.type === 'experiment'
  const canProject = !isReadingTask && !isExperimentTask

  const actionItems = useMemo(
    () => [
      {
        key: 'class-challenge',
        label: t('whiteboard.classChallenge'),
        enabled: Boolean(onStartClassChallenge),
        onClick: onStartClassChallenge,
        className: 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100',
      },
      {
        key: 'duel',
        label: t('whiteboard.pkDuel'),
        enabled: Boolean(onStartDuel),
        onClick: onStartDuel,
        className: 'text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100',
      },
      {
        key: 'quick-answer',
        label: t('challenge.startSingleQuestionDuel'),
        enabled: Boolean(onStartQuickAnswer),
        onClick: onStartQuickAnswer,
        className: 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
      },
      {
        key: 'project',
        label: t('whiteboard.projectToWhiteboard'),
        enabled: Boolean(onProjectToWhiteboard && canProject),
        onClick: () => onProjectToWhiteboard?.(taskGroup),
        className: 'text-sky-600 border-sky-200 bg-sky-50 hover:bg-sky-100',
      },
      {
        key: 'publish',
        label: t('whiteboard.publishToStudents'),
        enabled: true,
        onClick: onPublish,
        className: 'text-white border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600',
      },
      {
        key: 'close',
        label: t('common.close'),
        enabled: true,
        onClick: onClose,
        className: 'text-slate-700 border-slate-200 bg-white hover:bg-slate-100',
      },
    ],
    [canProject, onClose, onProjectToWhiteboard, onPublish, onStartClassChallenge, onStartDuel, onStartQuickAnswer, t, taskGroup]
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    // 只有点击头部才能拖拽
    const target = e.target as HTMLElement
    if (!target.closest('.preview-card-header')) return

    setIsDragging(true)
    // 记录鼠标按下时的初始位置
    setDragOffset({
      x: e.clientX,
      y: e.clientY
    })
    e.preventDefault()
    e.stopPropagation()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    e.stopPropagation()

    // 计算鼠标移动的距离
    const deltaX = e.clientX - dragOffset.x
    const deltaY = e.clientY - dragOffset.y

    // 更新拖拽起始点（为下一次移动做准备）
    setDragOffset({
      x: e.clientX,
      y: e.clientY
    })

    // 获取容器
    const container = document.querySelector('.whiteboard-container')
    if (!container) return
    const containerRect = container.getBoundingClientRect()

    // 基于当前百分比位置，计算新的百分比位置
    // deltaX / containerRect.width 是移动距离占容器的百分比
    setPosition(prev => {
      let newX = prev.x + (deltaX / containerRect.width) * 100
      let newY = prev.y + (deltaY / containerRect.height) * 100

      // 边界限制：保持在可视区域内
      newX = Math.max(5, Math.min(newX, 95))
      newY = Math.max(5, Math.min(newY, 95))

      return { x: newX, y: newY }
    })
  }

  const handleMouseUp = (e?: React.MouseEvent) => {
    setIsDragging(false)
    e?.stopPropagation()
  }

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'single_choice': return '单选题'
      case 'multiple_choice': return '多选题'
      case 'true_false': return '判断题'
      case 'fill_blank': return '填空题'
      case 'matching': return '配对题'
      case 'reading': return '阅读题'
      case 'experiment': return '实验题'
      default: return '题目'
    }
  }

  // 从 TipTap JSON 或填空格式中提取纯文本
  const extractTextFromTipTap = (node: any): string => {
    if (!node) return ''
    if (typeof node === 'string') {
      // 尝试解析 JSON 字符串
      try {
        const parsed = JSON.parse(node)
        if (parsed && typeof parsed === 'object') {
          return extractTextFromTipTap(parsed)
        }
      } catch {
        // 不是 JSON，返回原字符串
      }
      return node
    }
    if (Array.isArray(node)) {
      return node.map(extractTextFromTipTap).join('')
    }
    if (typeof node === 'object') {
      // TipTap text 节点
      if (node.type === 'text' && node.text) return node.text
      // TipTap doc 或 content 数组
      if (node.content && Array.isArray(node.content)) {
        const text = node.content.map(extractTextFromTipTap).join('')
        if (node.type === 'paragraph' || node.type === 'heading') return text + '\n'
        return text
      }
      // 处理填空格式 {text: "...", blanks: [...]}
      if (node.text) {
        let text = extractTextFromTipTap(node.text)
        // 如果有 blanks，在文本中标记出来
        if (node.blanks && Array.isArray(node.blanks) && node.blanks.length > 0) {
          const blankTexts = node.blanks.map((b: any) => b.answer || b.text || '____').join(', ')
          text += ` (答案: ${blankTexts})`
        }
        return text
      }
    }
    return ''
  }

  // 安全地获取字符串内容
  const safeString = (value: any): string => {
    if (typeof value === 'string') {
      // 尝试解析 JSON 字符串
      try {
        const parsed = JSON.parse(value)
        if (parsed && typeof parsed === 'object') {
          if (parsed.type === 'doc' || Array.isArray(parsed.content)) {
            return extractTextFromTipTap(parsed)
          }
        }
      } catch {
        // 不是 JSON，返回原字符串
      }
      return value
    }
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') {
      // 尝试解析 TipTap JSON
      if (value.type === 'doc' || Array.isArray(value.content)) {
        return extractTextFromTipTap(value)
      }
      // 其他对象，尝试提取 text 字段
      if (value.text) return safeString(value.text)
    }
    return JSON.stringify(value)
  }

  // 检查是否是 TipTap JSON
  const isTipTapContent = (value: any): boolean => {
    if (!value || typeof value !== 'object') return false
    return value.type === 'doc' || Array.isArray(value.content)
  }

  // 获取富文本内容（可能是 TipTap JSON 或字符串）
  const getRichTextContent = (value: any): { isRichText: boolean; content: string | Record<string, unknown> } => {
    if (!value) return { isRichText: false, content: '' }

    // 如果是对象且是 TipTap 格式
    if (typeof value === 'object' && isTipTapContent(value)) {
      return { isRichText: true, content: value as Record<string, unknown> }
    }

    // 如果是字符串，尝试解析为 JSON
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        if (isTipTapContent(parsed)) {
          return { isRichText: true, content: parsed }
        }
        return { isRichText: false, content: value }
      } catch {
        return { isRichText: false, content: value }
      }
    }

    return { isRichText: false, content: String(value) }
  }

  // 解析题目文本
  const getQuestionText = (task: LiveTaskData): string => {
    if (!task?.question) return '题目加载中...'

    const q = task.question as any

    // 如果是字符串直接返回（safeString 会处理 JSON 字符串）
    if (typeof q === 'string') return safeString(q)

    // 处理各种格式（使用 safeString 处理可能的 TipTap JSON）
    if (q.text) return safeString(q.text)
    if (q.content) return safeString(q.content)
    if (q.question) return safeString(q.question)

    // 尝试找出最长的字符串字段作为题目
    const stringFields = Object.entries(q)
      .filter(([_, v]) => typeof v === 'string' && v.length > 0)
      .sort((a, b) => (b[1] as string).length - (a[1] as string).length)

    if (stringFields.length > 0) {
      return stringFields[0][1] as string
    }

    // 最后尝试序列化
    try {
      return JSON.stringify(q)
    } catch {
      return '题目格式错误'
    }
  }

  // 获取选项
  const getOptions = (task: LiveTaskData): string[] => {
    if (!task?.question) return []
    const q = task.question as any

    const opts = q?.options || []
    if (!Array.isArray(opts)) return []

    return opts.map((opt: any) => {
      if (typeof opt === 'string') return opt
      if (opt?.text && typeof opt.text === 'string') return opt.text
      if (opt?.content && typeof opt.content === 'string') return opt.content
      if (opt?.option && typeof opt.option === 'string') return opt.option
      return safeString(opt)
    })
  }

  // 获取填空题的空格
  const getBlanks = (task: LiveTaskData): string[] => {
    if (!task?.question) return []
    const q = task.question as any

    // 支持多种格式
    const blanks = q?.blanks || q?.answers || q?.correctAnswers || []
    if (!Array.isArray(blanks)) return []

    return blanks.map((b: any) => {
      if (typeof b === 'string') return b
      if (b?.answer && typeof b.answer === 'string') return b.answer
      if (b?.text && typeof b.text === 'string') return b.text
      return safeString(b)
    })
  }

  // 获取配对题数据
  const getMatchingPairs = (task: LiveTaskData): { left: string; right: string }[] => {
    if (!task?.question) return []
    const q = task.question as any

    const pairs = q?.pairs || q?.matching || []
    if (!Array.isArray(pairs)) return []

    return pairs.map((p: any) => ({
      left: safeString(p?.left || p?.item || p?.question || ''),
      right: safeString(p?.right || p?.match || p?.answer || '')
    }))
  }

  // 获取阅读题的文章
  const getReadingPassage = (task: LiveTaskData): string => {
    if (!task?.question) return ''
    const q = task.question as any
    return safeString(q?.passage || q?.article || q?.content || '')
  }

  // 获取实验题URL
  const getExperimentUrl = (task: LiveTaskData): string => {
    if (!task?.question) return ''
    const q = task.question as any
    // 支持多种URL字段名（html_url 是主要字段）
    const url = q?.html_url || q?.url || q?.experimentUrl || q?.externalUrl || q?.link || ''
    return typeof url === 'string' ? url.trim() : ''
  }

  // 获取正确答案
  const getCorrectAnswer = (task: LiveTaskData): string => {
    const q = task.question as any
    if (!q) return ''

    const answer = q?.correctAnswer || q?.correct_answer || q?.answer
    if (!answer) return ''

    // 如果是数组（多选题）
    if (Array.isArray(answer)) {
      return answer.map((a: any) => {
        if (typeof a === 'string') return a
        return a?.text || a?.content || String(a)
      }).join(', ')
    }

    // 如果是对象
    if (typeof answer === 'object') {
      return answer?.text || answer?.content || JSON.stringify(answer)
    }

    return String(answer)
  }

  // 渲染题目内容
  const renderTaskContent = () => {
    if (!currentTask) return null

    const questionText = getQuestionText(currentTask)
    const options = getOptions(currentTask)
    const type = currentTask.type
    const correctAnswer = getCorrectAnswer(currentTask)

    return (
      <div className="space-y-4">
        {/* 题型标签和答案 */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {getTaskTypeLabel(type)}
          </span>
          <div className="flex items-center gap-2">
            {correctAnswer && (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                答案: {correctAnswer}
              </span>
            )}
            {currentTask.countdown_seconds > 0 && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {currentTask.countdown_seconds}秒
              </span>
            )}
          </div>
        </div>

        {/* 阅读题文章 - 支持点击放大 */}
        {type === 'reading' && (
          <div
            className={`relative p-4 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed overflow-y-auto cursor-pointer group ${isReadingExpanded ? 'max-h-[70vh]' : 'max-h-40'}`}
            onClick={() => setIsReadingExpanded(!isReadingExpanded)}
            title="点击放大/缩小"
          >
            {/* 放大/缩小提示图标 */}
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-200/80 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
              {isReadingExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </div>
            {/* 文章内容 - 使用 pre 标签保持格式 */}
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {getReadingPassage(currentTask)}
            </pre>
          </div>
        )}

        {/* 实验题iframe - 支持扩大显示 */}
        {type === 'experiment' && (
          <div className="space-y-2">
            {getExperimentUrl(currentTask) ? (
              <>
                {/* 全屏时的独立容器 - 使用 Portal 渲染到 body 避免父元素 transform 影响 */}
                {isExperimentExpanded && createPortal(
                  <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center p-4" onClick={() => setIsExperimentExpanded(false)}>
                    <div className="relative w-[95vw] h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                      <iframe
                        src={getExperimentUrl(currentTask)}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-popups"
                        title="实验预览"
                      />
                      {/* 关闭按钮 */}
                      <button
                        onClick={() => setIsExperimentExpanded(false)}
                        className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/90 text-white hover:bg-slate-700 transition-colors z-10"
                        title="关闭全屏"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
                {/* 普通预览 */}
                <div className="relative w-full h-64 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  <iframe
                    src={getExperimentUrl(currentTask)}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    title="实验预览"
                  />
                  {/* 扩大按钮 */}
                  <button
                    onClick={() => setIsExperimentExpanded(true)}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800/80 text-white hover:bg-slate-700 transition-colors z-10"
                    title="全屏显示"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full h-32 bg-slate-100 rounded-xl flex items-center justify-center">
                <span className="text-slate-400 text-sm">暂无实验链接</span>
              </div>
            )}
            {!isExperimentExpanded && (
              <p className="text-xs text-slate-400 truncate" title={getExperimentUrl(currentTask)}>
                {getExperimentUrl(currentTask)}
              </p>
            )}
          </div>
        )}

        {/* 题目文本 - 支持富文本 */}
        <div className="text-slate-800 text-base leading-relaxed font-medium">
          {(() => {
            const q = currentTask?.question as any
            const richText = getRichTextContent(q?.text || q?.question || q?.content)
            if (richText.isRichText && typeof richText.content === 'object') {
              return <TipTapViewer content={richText.content} className="prose prose-slate max-w-none" />
            }
            return <span>{questionText}</span>
          })()}
        </div>

        {/* 选择题选项 - 支持富文本 */}
        {(type === 'single_choice' || type === 'multiple_choice') && options.length > 0 && (
          <div className="space-y-2.5 mt-4">
            {(() => {
              const q = currentTask?.question as any
              const opts = q?.options || []
              return opts.map((opt: any, idx: number) => {
                const label = String.fromCharCode(65 + idx)
                const optRichText = getRichTextContent(opt?.text || opt?.content || opt)
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all"
                  >
                    <div className="w-7 h-7 rounded-full border-2 border-slate-300 flex items-center justify-center flex-shrink-0 bg-white mt-0.5">
                      <span className="text-xs font-medium text-slate-500">{label}</span>
                    </div>
                    <div className="flex-1 text-sm text-slate-700">
                      {optRichText.isRichText && typeof optRichText.content === 'object' ? (
                        <TipTapViewer content={optRichText.content} className="prose prose-sm prose-slate max-w-none" />
                      ) : (
                        <span>{optRichText.content as string}</span>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}

        {/* 判断题选项 */}
        {type === 'true_false' && (
          <div className="space-y-2.5 mt-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all">
              <div className="w-7 h-7 rounded-full border-2 border-slate-300 flex items-center justify-center flex-shrink-0 bg-white">
                <span className="text-xs font-medium text-slate-500">T</span>
              </div>
              <span className="text-sm text-slate-700">正确 (True)</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all">
              <div className="w-7 h-7 rounded-full border-2 border-slate-300 flex items-center justify-center flex-shrink-0 bg-white">
                <span className="text-xs font-medium text-slate-500">F</span>
              </div>
              <span className="text-sm text-slate-700">错误 (False)</span>
            </div>
          </div>
        )}

        {/* 填空题 */}
        {type === 'fill_blank' && (
          <div className="space-y-3 mt-4">
            {getBlanks(currentTask).map((blank, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16">空格 {idx + 1}</span>
                <div className="flex-1 p-3 rounded-xl border-2 border-slate-200 bg-slate-50">
                  <span className="text-sm text-slate-600">{blank || '(空)'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 配对题 */}
        {type === 'matching' && (
          <div className="space-y-2 mt-4">
            {getMatchingPairs(currentTask).map((pair, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 w-6">{idx + 1}</span>
                <div className="flex-1 text-sm text-slate-700">{pair.left}</div>
                <div className="text-slate-400">→</div>
                <div className="flex-1 text-sm text-slate-700">{pair.right}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 根据任务类型和展开状态计算尺寸
  const isExpanded = isExperimentExpanded || isReadingExpanded
  const cardWidth = isExpanded ? 'w-[90vw]' : 'w-[480px]'
  const maxHeight = isExpanded ? 'max-h-[90vh]' : 'max-h-[80vh]'
  const contentMaxHeight = isExpanded ? 'max-h-[75vh]' : 'max-h-[60vh]'

  const card = (
    <div
      className={`preview-card fixed ${cardWidth} ${maxHeight} bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto`}
      style={{
        left: isExpanded ? '50%' : `${Math.max(14, Math.min(86, position.x))}%`,
        top: isExpanded ? '50%' : `${Math.max(14, Math.min(76, position.y))}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 240,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 头部 - 可拖拽区域 */}
      <div className="preview-card-header px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-600 text-xs font-medium">
            {t('whiteboard.previewMode')}
          </span>
          <span className="text-sm font-semibold text-slate-800">{taskGroup.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {currentTaskIndex + 1}/{tasks.length} 题
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 题目内容 - 学生端样式 */}
      <div className={`p-6 overflow-y-auto ${contentMaxHeight}`}>
        {currentTask ? renderTaskContent() : (
          <div className="text-center py-8">
            <p className="text-slate-400">暂无题目内容</p>
          </div>
        )}

        {/* 题目导航 */}
        {tasks.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentTaskIndex(Math.max(0, currentTaskIndex - 1))
              }}
              disabled={currentTaskIndex === 0}
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-slate-600">
              {t('whiteboard.questionCounter').replace('{{current}}', String(currentTaskIndex + 1)).replace('{{total}}', String(tasks.length))}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentTaskIndex(Math.min(tasks.length - 1, currentTaskIndex + 1))
              }}
              disabled={currentTaskIndex === tasks.length - 1}
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actionItems.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                if (!action.enabled) return
                action.onClick?.()
              }}
              disabled={!action.enabled}
              className={`min-h-[48px] rounded-xl border text-sm font-medium transition-colors flex items-center justify-center text-center px-3 ${action.className} ${!action.enabled ? 'opacity-45 cursor-not-allowed saturate-50' : ''}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return createPortal(
    <div className="fixed inset-0 z-[230] pointer-events-none">
      {card}
    </div>,
    document.body
  )
}
