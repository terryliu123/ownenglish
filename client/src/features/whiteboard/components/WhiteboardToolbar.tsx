import { useRef } from 'react'
import { useTranslation } from '../../../i18n/useTranslation'
import type { WhiteboardTool, WhiteboardTheme } from '../types'

interface WhiteboardToolbarProps {
  currentTool: WhiteboardTool
  onToolChange: (tool: WhiteboardTool) => void
  strokeColor: string
  strokeWidth: number
  eraserSize: number
  theme: WhiteboardTheme
  onStrokeColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onEraserSizeChange: (size: number) => void
  scale?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetZoom?: () => void
}

// 专业 SVG 图标组件 - Heroicons 风格
const Icons = {
  // 工具图标
  // 选择器 - 鼠标指针（用于选择对象）
  select: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
    </svg>
  ),
  // 抓手 - 四向箭头（用于拖动画布）
  pan: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  ),
  pen: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  ),
  eraser: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.28 3.72a.75.75 0 00-1.06 0l-7.5 7.5a.75.75 0 000 1.06l4.5 4.5a.75.75 0 001.06 0l7.5-7.5a.75.75 0 000-1.06l-4.5-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15l-2 2a2 2 0 002.828 2.828L9 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15h6" />
    </svg>
  ),
  text: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  image: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  laser: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  // 功能图标
  task: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  ),
  trash: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  undo: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  ),
  redo: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
    </svg>
  ),
  zoomIn: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
    </svg>
  ),
  zoomOut: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
    </svg>
  ),
}

const tools: { id: WhiteboardTool; Icon: React.FC; labelKey: string }[] = [
  // 选择和浏览工具
  { id: 'select', Icon: Icons.select, labelKey: 'whiteboard.select' },
  { id: 'pan', Icon: Icons.pan, labelKey: 'whiteboard.pan' },
  // 绘图和编辑工具
  { id: 'pen', Icon: Icons.pen, labelKey: 'whiteboard.pen' },
  { id: 'eraser', Icon: Icons.eraser, labelKey: 'whiteboard.eraser' },
  { id: 'text', Icon: Icons.text, labelKey: 'whiteboard.text' },
  { id: 'image', Icon: Icons.image, labelKey: 'whiteboard.image' },
  { id: 'laser', Icon: Icons.laser, labelKey: 'whiteboard.laser' },
]

const colors = [
  '#6366f1', // indigo
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f8fafc', // white
  '#1e293b', // dark
]

const strokeWidths = [2, 4, 6, 8, 12]
const eraserSizes = [10, 20, 30, 50]

export function WhiteboardToolbar({
  currentTool,
  onToolChange,
  strokeColor,
  strokeWidth,
  eraserSize,
  theme,
  onStrokeColorChange,
  onStrokeWidthChange,
  onEraserSizeChange,
  scale = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: WhiteboardToolbarProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleToolClick = (toolId: WhiteboardTool) => {
    if (toolId === 'text') {
      ;(window as any).whiteboardAPI?.addText('双击编辑文字', undefined, undefined)
    } else if (toolId === 'image') {
      // 触发文件选择
      fileInputRef.current?.click()
    } else {
      onToolChange(toolId)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 读取文件为 base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        ;(window as any).whiteboardAPI?.addImage(dataUrl, undefined, undefined)
      }
    }
    reader.readAsDataURL(file)

    // 重置 input 以便可以再次选择同一文件
    e.target.value = ''
  }

  // 根据主题获取样式
  const getToolbarBg = () => {
    switch (theme) {
      case 'light':
        return 'bg-slate-100/95 border-slate-200'
      case 'colorful':
        return 'bg-purple-100/95 border-purple-200'
      default:
        return 'bg-[#1a1a22]/95 border-slate-800'
    }
  }

  const getTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-slate-600 hover:text-slate-800'
      case 'colorful':
        return 'text-purple-600 hover:text-purple-800'
      default:
        return 'text-slate-400 hover:text-slate-200'
    }
  }

  const getActiveColor = () => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
      case 'colorful':
        return 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
      default:
        return 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
    }
  }

  return (
    <div className={`h-16 border-t ${getToolbarBg()} backdrop-blur-xl flex items-center justify-center gap-1 px-4`}>
      {/* 工具按钮 */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => handleToolClick(tool.id)}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            currentTool === tool.id
              ? `${getActiveColor()} shadow-lg`
              : `${getTextColor()} hover:bg-black/5`
          }`}
          title={t(tool.labelKey)}
        >
          <tool.Icon />
        </button>
      ))}

      <div className={`w-px h-6 mx-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />

      {/* 画笔工具选项 */}
      {currentTool === 'pen' && (
        <>
          {/* 颜色选择 */}
          <div className="flex items-center gap-1.5 mr-3">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => onStrokeColorChange(color)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  strokeColor === color
                    ? 'border-indigo-500 scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* 粗细选择 */}
          <div className="flex items-center gap-1 mr-3">
            {strokeWidths.map((width) => (
              <button
                key={width}
                onClick={() => onStrokeWidthChange(width)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  strokeWidth === width
                    ? theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
                    : `${getTextColor()} hover:bg-black/5`
                }`}
                title={`${width}px`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{
                    width: Math.min(width, 16),
                    height: Math.min(width, 16),
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}

      {/* 橡皮擦大小选择 */}
      {currentTool === 'eraser' && (
        <div className="flex items-center gap-1 mr-3">
          <span className={`text-xs mr-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{t('whiteboard.eraserSize')}</span>
          {eraserSizes.map((size) => (
            <button
              key={size}
              onClick={() => onEraserSizeChange(size)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                eraserSize === size
                  ? theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
                  : `${getTextColor()} hover:bg-black/5`
              }`}
              title={`${size}px`}
            >
              <div
                className="rounded-full border border-current"
                style={{
                  width: Math.min(size / 2, 20),
                  height: Math.min(size / 2, 20),
                }}
              />
            </button>
          ))}
        </div>
      )}

      <div className={`w-px h-6 mx-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />

      <button
        onClick={() => {
          if (window.confirm('确定要清除白板上的所有内容吗？')) {
            ;(window as any).whiteboardAPI?.clearCanvas()
          }
        }}
        className="w-11 h-11 rounded-xl flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
        title={t('whiteboard.clear')}
      >
        <Icons.trash />
      </button>

      <button
        onClick={() => {
          const json = (window as any).whiteboardAPI?.toJSON()
          console.log('Whiteboard state:', json)
        }}
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${getTextColor()} hover:bg-black/5 transition-all`}
        title={t('whiteboard.undo')}
      >
        <Icons.undo />
      </button>

      <button
        onClick={() => {}}
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${getTextColor()} hover:bg-black/5 transition-all`}
        title={t('whiteboard.redo')}
      >
        <Icons.redo />
      </button>

      <div className={`w-px h-6 mx-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />

      {/* 缩放控制 */}
      <button
        onClick={onZoomOut}
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${getTextColor()} hover:bg-black/5 transition-all`}
        title="缩小"
      >
        <Icons.zoomOut />
      </button>
      <button
        onClick={onResetZoom}
        className={`min-w-[48px] px-2 h-9 rounded-lg text-xs font-medium ${getTextColor()} hover:bg-black/5 transition-all`}
        title="重置缩放"
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${getTextColor()} hover:bg-black/5 transition-all`}
        title="放大"
      >
        <Icons.zoomIn />
      </button>

      {/* 隐藏的文件上传输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
