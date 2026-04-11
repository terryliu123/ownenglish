import { useEffect, useRef, useCallback, useState } from 'react'
import { Canvas, PencilBrush, IText, Textbox, Image as FabricImage } from 'fabric'
import type { WhiteboardTool, WhiteboardElement, WhiteboardTheme } from '../types'
import { useWhiteboardTheme } from '../theme'

interface WhiteboardCanvasProps {
  elements: WhiteboardElement[]
  onElementsChange: (elements: WhiteboardElement[]) => void
  currentTool: WhiteboardTool
  mode: 'lecture' | 'interactive'
  strokeColor: string
  strokeWidth: number
  eraserSize: number
  theme?: WhiteboardTheme
  scale?: number
  onScaleChange?: (scale: number) => void
  onReady?: () => void
}

export function WhiteboardCanvas({
  elements,
  onElementsChange,
  currentTool,
  mode: _mode,
  strokeColor,
  strokeWidth,
  eraserSize,
  theme = 'dark',
  scale = 1,
  onScaleChange,
  onReady,
  onTextSelect,
  onTextDeselect,
}: WhiteboardCanvasProps & {
  onTextSelect?: (text: IText, canvas: Canvas) => void
  onTextDeselect?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const eraserCursorRef = useRef<HTMLDivElement | null>(null)
  const laserCursorRef = useRef<HTMLDivElement | null>(null)
  const historyRef = useRef<string[]>([])
  const historyIdxRef = useRef(-1)
  const skipHistoryRef = useRef(false)
  const currentThemeRef = useRef<WhiteboardTheme>(theme)
  const scaleRef = useRef(scale)

  const themeConfig = useWhiteboardTheme(theme)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean; target: any }>({
    x: 0,
    y: 0,
    visible: false,
    target: null,
  })

  // 初始化 Fabric.js Canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const parent = canvasRef.current.parentElement
    if (!parent) return

    const canvas = new Canvas(canvasRef.current, {
      width: parent.clientWidth,
      height: parent.clientHeight,
      backgroundColor: themeConfig.canvasBg,
      selection: currentTool === 'select',
      isDrawingMode: currentTool === 'pen',
      allowTouchScrolling: false,
    })

    // 配置画笔
    canvas.freeDrawingBrush = new PencilBrush(canvas)
    canvas.freeDrawingBrush.color = strokeColor
    canvas.freeDrawingBrush.width = strokeWidth

    // 鼠标事件监听
    canvas.on('path:created', handlePathCreated)
    canvas.on('object:added', handleObjectAdded)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('object:removed', handleObjectRemoved)

    // 双击文本进入编辑模式
    canvas.on('mouse:dblclick', (e: any) => {
      if (e.target && (e.target.type === 'i-text' || e.target.type === 'textbox' || e.target.type === 'text') && e.target.editable !== false) {
        e.target.enterEditing()
        e.target.selectAll()
      }
    })

    // 文本框拖拽缩放时实时转换 scaleX 为宽度变化（文字自动换行）
    canvas.on('object:scaling', (e: any) => {
      const obj = e.target
      if (obj && obj.type === 'textbox') {
        const sx = obj.scaleX ?? 1
        obj.set({
          width: (obj.width || 0) * sx,
          scaleX: 1,
          scaleY: 1,
        })
      }
    })

    // 粘贴板支持：Ctrl+V 粘贴文本或图片到白板
    const handlePaste = async (e: ClipboardEvent) => {
      // 如果正在编辑文本对象，不拦截粘贴
      const active = canvas.getActiveObject()
      if (active && (active.type === 'i-text' || active.type === 'textbox') && (active as any).isEditing) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        // 粘贴图片
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const blob = item.getAsFile()
          if (!blob) continue
          const url = URL.createObjectURL(blob)
          const img = await FabricImage.fromURL(url)
          URL.revokeObjectURL(url)
          const maxW = (canvas.width || 800) / 2
          const scale = Math.min(1, maxW / (img.width || 200))
          img.set({ left: 100, top: 100, scaleX: scale, scaleY: scale, selectable: true })
          canvas.add(img)
          canvas.setActiveObject(img)
          canvas.requestRenderAll()
          return
        }
        // 粘贴文本（保留换行格式）
        if (item.type === 'text/plain') {
          e.preventDefault()
          const text = e.clipboardData?.getData('text/plain')
          if (!text) continue
          const pasteTextColor = currentThemeRef.current === 'dark' ? '#e2e8f0'
            : currentThemeRef.current === 'light' ? '#1e293b' : '#7c3aed'
          const pasteBgColor = currentThemeRef.current === 'dark'
            ? 'rgba(20, 20, 24, 0.8)' : 'rgba(255, 255, 255, 0.9)'
          const textObj = new Textbox(text, {
            left: 100, top: 100, fontSize: 20,
            fill: pasteTextColor,
            backgroundColor: pasteBgColor,
            padding: 8,
            fontFamily: 'Noto Sans SC, sans-serif',
            width: 400,
            splitByGrapheme: true,
            selectable: true, editable: true,
          })
          canvas.add(textObj)
          canvas.setActiveObject(textObj)
          canvas.requestRenderAll()
          return
        }
      }
    }
    document.addEventListener('paste', handlePaste)

    fabricRef.current = canvas

    // 确保fabric wrapper背景与canvas背景一致
    if (canvas.wrapperEl) {
      canvas.wrapperEl.style.backgroundColor = themeConfig.canvasBg
    }

    // 辅助函数：触发保存
    const triggerSaveNow = () => {
      setTimeout(() => {
        const saveEvent = new CustomEvent('whiteboard:save')
        window.dispatchEvent(saveEvent)
      }, 100)
    }

    // 先暴露 API，再通知父组件准备好
    ;(window as any).whiteboardAPI = {
      addText: (text: string, options?: any) => {
        const canvas = fabricRef.current
        if (!canvas) {
          console.log('[WC] addText failed: canvas not ready')
          return
        }
        const currentTheme = currentThemeRef.current
        const textColor = options?.fill || (currentTheme === 'dark' ? '#e2e8f0' : currentTheme === 'light' ? '#1e293b' : '#7c3aed')
        const centerX = (canvas.width || 800) / 2 - 200
        const centerY = (canvas.height || 600) / 2 - 50
        const textObj = new Textbox(text, {
          left: options?.left ?? centerX,
          top: options?.top ?? centerY,
          fontSize: options?.fontSize ?? 18,
          fill: options?.fill ?? textColor,
          fontFamily: 'Noto Sans SC, sans-serif',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          width: options?.width ?? 600,
          splitByGrapheme: true,
        })
        canvas.add(textObj)
        canvas.renderAll()
        triggerSaveNow()
      },
      addImage: (url: string, options?: any) => {
        const canvas = fabricRef.current
        if (!canvas) return
        FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img: any) => {
          const scale = options?.maxWidth ? options.maxWidth / img.width! : 0.5
          img.set({
            left: options?.left ?? 100,
            top: options?.top ?? 100,
            scaleX: scale,
            scaleY: scale,
            selectable: true,
          })
          canvas.add(img)
          canvas.renderAll()
          triggerSaveNow()
        })
      },
      clearCanvas: () => {
        const canvas = fabricRef.current
        if (!canvas) return
        canvas.clear()
        canvas.backgroundColor = themeConfig.canvasBg
        if (canvas.wrapperEl) {
          canvas.wrapperEl.style.backgroundColor = themeConfig.canvasBg
        }
        canvas.renderAll()
        triggerSaveNow()
      },
      zoomIn: () => {
        const newScale = Math.min(5, scaleRef.current * 1.2)
        onScaleChange?.(newScale)
      },
      zoomOut: () => {
        const newScale = Math.max(0.1, scaleRef.current / 1.2)
        onScaleChange?.(newScale)
      },
      resetZoom: () => onScaleChange?.(1),
      toJSON: () => {
        const canvas = fabricRef.current
        if (!canvas) return null
        const json = canvas.toJSON()
        // 将远程图片转为 base64 内嵌，确保刷新后可恢复
        const fabricObjects = canvas.getObjects()
        if (json.objects) {
          json.objects.forEach((obj: any, index: number) => {
            if (obj.type === 'image' && obj.src && !obj.src.startsWith('data:')) {
              const fabricObj = fabricObjects[index]
              if (fabricObj) {
                try {
                  const el = (fabricObj as any).getElement?.()
                  if (el && el instanceof HTMLImageElement) {
                    const c = document.createElement('canvas')
                    c.width = el.naturalWidth || el.width
                    c.height = el.naturalHeight || el.height
                    const ctx = c.getContext('2d')
                    if (ctx) {
                      ctx.drawImage(el, 0, 0)
                      obj.src = c.toDataURL('image/png')
                    }
                  }
                } catch {
                  // 跨域图片无法 toDataURL，保留原 src
                }
              }
            }
          })
        }
        return json
      },
      loadJSON: (json: any) => {
        const canvas = fabricRef.current
        if (!canvas) return
        // 清理不兼容的对象数据，防止反序列化崩溃
        if (json?.objects && Array.isArray(json.objects)) {
          json.objects = json.objects.filter((obj: any) => {
            if (obj.left == null || obj.top == null) return false
            return true
          })
        }
        canvas.loadFromJSON(json).then(() => {
          const t = currentThemeRef.current
          const bg = t === 'dark' ? '#0f0f13' : t === 'light' ? '#f8fafc' : '#f5f3ff'
          canvas.backgroundColor = bg
          if (canvas.wrapperEl) {
            canvas.wrapperEl.style.backgroundColor = bg
          }
          // 修正加载后对象的坐标和颜色
          const defaultFill = t === 'dark' ? '#e2e8f0' : t === 'light' ? '#1e293b' : '#7c3aed'
          canvas.forEachObject((obj: any) => {
            obj.setCoords()
            // 文字对象颜色适配当前主题
            if ((obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') && obj.fill) {
              const fill = String(obj.fill)
              if (['#e2e8f0', '#f8fafc', '#1e293b', '#7c3aed', '#f5f3ff'].includes(fill)) {
                obj.set('fill', defaultFill)
              }
            }
          })
          canvas.renderAll()
          console.log('[WhiteboardCanvas] Canvas loaded, objects:', canvas.getObjects().length)
        }).catch((e: any) => {
          console.error('[WhiteboardCanvas] Failed to load canvas data:', e)
        })
      },
      getCanvas: () => fabricRef.current,
      toDataURL: (options?: any) => {
        if (!fabricRef.current) {
          console.error('[WhiteboardCanvas] toDataURL called but canvas not ready')
          return null
        }
        try {
          return fabricRef.current.toDataURL(options)
        } catch (e) {
          console.error('[WhiteboardCanvas] toDataURL error:', e)
          return null
        }
      },
      getTextContent: () => {
        const canvas = fabricRef.current
        if (!canvas) return ''
        const texts: string[] = []
        canvas.forEachObject((obj: any) => {
          if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
            texts.push(obj.text || '')
          }
        })
        return texts.join('\n')
      },
    }
    console.log('[WhiteboardCanvas] whiteboardAPI initialized')

    // 右键菜单 - 使用原生事件
    const canvasEl = canvasRef.current
    const handleContextMenu = (e: MouseEvent) => {
      const target = canvas.findTarget(e as any)
      if (target && (target.type === 'i-text' || target.type === 'image' || target.type === 'path')) {
        e.preventDefault()
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          visible: true,
          target,
        })
      } else {
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    }
    const handleClick = () => {
      setContextMenu(prev => ({ ...prev, visible: false }))
    }
    canvasEl.addEventListener('contextmenu', handleContextMenu)
    canvasEl.addEventListener('click', handleClick)

    // 通知父组件画布已准备好（延迟确保 Fabric.js 完全初始化）
    const readyTimer = setTimeout(() => {
      console.log('[WhiteboardCanvas] Canvas ready, calling onReady')
      onReady?.()
    }, 300)

    // 文本选中事件
    const handleSelectionCreated = (e: any) => {
      const target = e.selected?.[0] || e.target
      if (target && (target.type === 'i-text' || target.type === 'textbox' || target.type === 'text')) {
        onTextSelect?.(target as IText, canvas)
      }
    }
    const handleSelectionUpdated = (e: any) => {
      const target = e.selected?.[0] || e.target
      if (target && (target.type === 'i-text' || target.type === 'textbox' || target.type === 'text')) {
        onTextSelect?.(target as IText, canvas)
      } else {
        onTextDeselect?.()
      }
    }
    const handleSelectionCleared = () => {
      onTextDeselect?.()
    }
    canvas.on('selection:created', handleSelectionCreated)
    canvas.on('selection:updated', handleSelectionUpdated)
    canvas.on('selection:cleared', handleSelectionCleared)

    // 创建橡皮擦光标元素
    const eraserCursor = document.createElement('div')
    eraserCursor.style.position = 'fixed'
    eraserCursor.style.pointerEvents = 'none'
    eraserCursor.style.border = '2px solid rgba(255, 255, 255, 0.8)'
    eraserCursor.style.borderRadius = '50%'
    eraserCursor.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
    eraserCursor.style.zIndex = '9999'
    eraserCursor.style.display = 'none'
    document.body.appendChild(eraserCursor)
    eraserCursorRef.current = eraserCursor

    // 创建激光笔光标元素
    const laserCursor = document.createElement('div')
    laserCursor.style.position = 'fixed'
    laserCursor.style.pointerEvents = 'none'
    laserCursor.style.width = '16px'
    laserCursor.style.height = '16px'
    laserCursor.style.borderRadius = '50%'
    laserCursor.style.backgroundColor = '#ef4444'
    laserCursor.style.boxShadow = '0 0 10px 4px rgba(239, 68, 68, 0.5), 0 0 20px 8px rgba(239, 68, 68, 0.3)'
    laserCursor.style.zIndex = '9999'
    laserCursor.style.display = 'none'
    laserCursor.style.transform = 'translate(-50%, -50%)'
    document.body.appendChild(laserCursor)
    laserCursorRef.current = laserCursor

    // 监听窗口大小变化
    const handleResize = () => {
      const parent = canvasRef.current?.parentElement
      if (parent && fabricRef.current) {
        fabricRef.current.setDimensions({
          width: parent.clientWidth,
          height: parent.clientHeight,
        })
        fabricRef.current.renderAll()
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(readyTimer)
      window.removeEventListener('resize', handleResize)
      canvasEl.removeEventListener('contextmenu', handleContextMenu)
      canvasEl.removeEventListener('click', handleClick)
      document.removeEventListener('paste', handlePaste)
      if (eraserCursorRef.current) {
        document.body.removeChild(eraserCursorRef.current)
      }
      if (laserCursorRef.current) {
        document.body.removeChild(laserCursorRef.current)
      }
      canvas.dispose()
    }
  }, [])

  // 更新主题
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    currentThemeRef.current = theme
    canvas.backgroundColor = themeConfig.canvasBg
    // 同时更新wrapper背景
    if (canvas.wrapperEl) {
      canvas.wrapperEl.style.backgroundColor = themeConfig.canvasBg
    }
    canvas.renderAll()
  }, [theme, themeConfig.canvasBg])

  // 处理缩放
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    scaleRef.current = scale
    canvas.setZoom(scale)
    canvas.requestRenderAll()
  }, [scale])

  // 鼠标滚轮缩放
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleWheel = (e: any) => {
      // 按住 Ctrl/Cmd 键时进行缩放
      if (e.e.ctrlKey || e.e.metaKey) {
        e.e.preventDefault()
        const delta = e.e.deltaY > 0 ? 0.9 : 1.1
        const newScale = Math.max(0.1, Math.min(5, scaleRef.current * delta))
        onScaleChange?.(newScale)
      }
    }

    canvas.on('mouse:wheel', handleWheel)
    return () => {
      canvas.off('mouse:wheel', handleWheel)
    }
  }, [onScaleChange])

  // 更新画笔颜色和粗细
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = strokeColor
      canvas.freeDrawingBrush.width = strokeWidth
    }
  }, [strokeColor, strokeWidth])

  // 处理工具切换
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.isDrawingMode = currentTool === 'pen'
    canvas.selection = currentTool === 'select'

    // 根据工具设置光标
    switch (currentTool) {
      case 'pen':
        canvas.defaultCursor = 'crosshair'
        break
      case 'eraser':
        canvas.defaultCursor = 'none'
        break
      case 'laser':
        canvas.defaultCursor = 'none'
        break
      case 'pan':
        canvas.defaultCursor = 'grab'
        break
      default:
        canvas.defaultCursor = 'default'
    }

    // 禁用选择（除了选择工具），但保持 evented 使对象可见
    canvas.forEachObject((obj) => {
      obj.selectable = currentTool === 'select'
      obj.evented = true
    })

    // 切换回选择工具时，重置画布交互状态
    if (currentTool === 'select') {
      canvas.skipTargetFind = false
      // 不要调用 discardActiveObject，保持当前选中的对象
      canvas.requestRenderAll()
    } else if (currentTool === 'pan') {
      canvas.skipTargetFind = true
      canvas.discardActiveObject()
      canvas.requestRenderAll()
    }

    // 更新橡皮擦光标显示
    if (eraserCursorRef.current) {
      eraserCursorRef.current.style.display = currentTool === 'eraser' ? 'block' : 'none'
    }

    // 更新激光笔光标显示
    if (laserCursorRef.current) {
      laserCursorRef.current.style.display = currentTool === 'laser' ? 'block' : 'none'
    }
  }, [currentTool, eraserSize])

  // 画布拖拽功能（pan工具）
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    if (currentTool !== 'pan') return

    let isPanning = false
    let lastPosX = 0
    let lastPosY = 0

    const handleMouseDown = (e: any) => {
      isPanning = true
      lastPosX = e.e.clientX
      lastPosY = e.e.clientY
      canvas.defaultCursor = 'grabbing'
    }

    const handleMouseMove = (e: any) => {
      if (!isPanning) return
      const deltaX = e.e.clientX - lastPosX
      const deltaY = e.e.clientY - lastPosY
      lastPosX = e.e.clientX
      lastPosY = e.e.clientY

      const vpt = canvas.viewportTransform
      if (vpt) {
        vpt[4] += deltaX
        vpt[5] += deltaY
        canvas.setViewportTransform(vpt)
        canvas.requestRenderAll()
      }
    }

    const handleMouseUp = () => {
      isPanning = false
      canvas.defaultCursor = 'grab'
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
    }
  }, [currentTool])

  // 橡皮擦功能 - 支持拖拽擦除 + 自定义光标
  useEffect(() => {
    const canvas = fabricRef.current
    const canvasEl = canvasRef.current
    if (!canvas || !canvasEl) return

    let isErasing = false

    const updateEraserCursor = (e: MouseEvent) => {
      if (eraserCursorRef.current && currentTool === 'eraser') {
        eraserCursorRef.current.style.left = `${e.clientX - eraserSize / 2}px`
        eraserCursorRef.current.style.top = `${e.clientY - eraserSize / 2}px`
        eraserCursorRef.current.style.width = `${eraserSize}px`
        eraserCursorRef.current.style.height = `${eraserSize}px`
      }
    }

    const handleEraserDown = (e: any) => {
      if (currentTool !== 'eraser') return
      // 直接删除点击的对象
      if (e.target) {
        canvas.remove(e.target)
        canvas.renderAll()
      }
      isErasing = true
    }

    const handleEraserMove = (e: any) => {
      if (e.e && eraserCursorRef.current) {
        updateEraserCursor(e.e)
      }

      if (currentTool !== 'eraser' || !isErasing) return
      eraseAtPoint(e)
    }

    const handleEraserUp = () => {
      isErasing = false
    }

    const eraseAtPoint = (e: any) => {
      if (!canvas) return

      const pointer = canvas.getPointer(e.e)
      const objects = canvas.getObjects()

      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i]
        const objBounds = obj.getBoundingRect()

        const eraserLeft = pointer.x - eraserSize / 2
        const eraserTop = pointer.y - eraserSize / 2
        const eraserRight = eraserLeft + eraserSize
        const eraserBottom = eraserTop + eraserSize

        if (
          eraserLeft < objBounds.left + objBounds.width &&
          eraserRight > objBounds.left &&
          eraserTop < objBounds.top + objBounds.height &&
          eraserBottom > objBounds.top
        ) {
          canvas.remove(obj)
          canvas.renderAll()
          break
        }
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      updateEraserCursor(e)
    }

    canvas.on('mouse:down', handleEraserDown)
    canvas.on('mouse:move', handleEraserMove)
    canvas.on('mouse:up', handleEraserUp)
    canvasEl.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvas.off('mouse:down', handleEraserDown)
      canvas.off('mouse:move', handleEraserMove)
      canvas.off('mouse:up', handleEraserUp)
      canvasEl.removeEventListener('mousemove', handleMouseMove)
    }
  }, [currentTool, eraserSize])

  // 激光笔功能 - 跟随鼠标的光点效果
  useEffect(() => {
    const canvas = fabricRef.current
    const canvasEl = canvasRef.current
    if (!canvas || !canvasEl) return

    const laserCursor = laserCursorRef.current
    if (!laserCursor) return

    // 显示/隐藏激光笔光标
    laserCursor.style.display = currentTool === 'laser' ? 'block' : 'none'

    if (currentTool !== 'laser') return

    const handleLaserMove = (e: any) => {
      if (e.e && laserCursorRef.current) {
        laserCursorRef.current.style.left = `${e.e.clientX}px`
        laserCursorRef.current.style.top = `${e.e.clientY}px`
      }
    }

    const handleCanvasMouseMove = (e: MouseEvent) => {
      if (laserCursorRef.current) {
        laserCursorRef.current.style.left = `${e.clientX}px`
        laserCursorRef.current.style.top = `${e.clientY}px`
      }
    }

    canvas.on('mouse:move', handleLaserMove)
    canvasEl.addEventListener('mousemove', handleCanvasMouseMove)

    return () => {
      canvas.off('mouse:move', handleLaserMove)
      canvasEl.removeEventListener('mousemove', handleCanvasMouseMove)
      if (laserCursorRef.current) {
        laserCursorRef.current.style.display = 'none'
      }
    }
  }, [currentTool])

  // 触屏支持
  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return

    const canvas = fabricRef.current
    if (!canvas) return

    canvasEl.style.touchAction = 'none'

    const getTouchPos = (touch: Touch) => {
      const rect = canvasEl.getBoundingClientRect()
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        clientX: touch.clientX,
        clientY: touch.clientY,
      }
    }

    const eraseAtTouch = (touch: Touch) => {
      const pos = getTouchPos(touch)
      const objects = canvas.getObjects()

      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i]
        const objBounds = obj.getBoundingRect()

        const eraserLeft = pos.x - eraserSize / 2
        const eraserTop = pos.y - eraserSize / 2
        const eraserRight = eraserLeft + eraserSize
        const eraserBottom = eraserTop + eraserSize

        if (
          eraserLeft < objBounds.left + objBounds.width &&
          eraserRight > objBounds.left &&
          eraserTop < objBounds.top + objBounds.height &&
          eraserBottom > objBounds.top
        ) {
          canvas.remove(obj)
          canvas.renderAll()
          break
        }
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]

      if (currentTool === 'eraser') {
        eraseAtTouch(touch)
      } else if (currentTool === 'laser') {
        // 激光笔模式下更新光标位置
        if (laserCursorRef.current) {
          laserCursorRef.current.style.left = `${touch.clientX}px`
          laserCursorRef.current.style.top = `${touch.clientY}px`
        }
      } else {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
        })
        canvasEl.dispatchEvent(mouseEvent)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]

      if (currentTool === 'eraser') {
        eraseAtTouch(touch)
      } else if (currentTool === 'laser') {
        // 激光笔模式下更新光标位置
        if (laserCursorRef.current) {
          laserCursorRef.current.style.left = `${touch.clientX}px`
          laserCursorRef.current.style.top = `${touch.clientY}px`
        }
      } else {
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
        })
        canvasEl.dispatchEvent(mouseEvent)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      const mouseEvent = new MouseEvent('mouseup', {
        bubbles: true,
      })
      canvasEl.dispatchEvent(mouseEvent)
    }

    canvasEl.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvasEl.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvasEl.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      canvasEl.removeEventListener('touchstart', handleTouchStart)
      canvasEl.removeEventListener('touchmove', handleTouchMove)
      canvasEl.removeEventListener('touchend', handleTouchEnd)
    }
  }, [currentTool, eraserSize])

  // 绘制事件处理
  const notifyChange = useCallback(() => {
    const canvas = fabricRef.current
    if (canvas) {
      const json = canvas.toJSON()
      ;(window as any).whiteboardData = json
      if (!skipHistoryRef.current) {
        const state = JSON.stringify(json)
        historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
        historyRef.current.push(state)
        historyIdxRef.current = historyRef.current.length - 1
        if (historyRef.current.length > 50) { historyRef.current.shift(); historyIdxRef.current-- }
      }
      skipHistoryRef.current = false
    }
  }, [])

  const handlePathCreated = useCallback((_e: any) => {
    notifyChange()
    // 立即触发保存到 localStorage
    setTimeout(() => {
      const saveEvent = new CustomEvent('whiteboard:save')
      window.dispatchEvent(saveEvent)
    }, 100)
  }, [notifyChange])

  const handleObjectAdded = useCallback((_e: any) => {
    notifyChange()
  }, [notifyChange])

  const handleObjectModified = useCallback((_e: any) => {
    const obj = _e?.target
    const canvas = fabricRef.current
    if (canvas && obj && (obj.type === 'i-text' || obj.type === 'text')) {
      const sx = obj.scaleX ?? 1
      if (Math.abs(sx - 1) > 0.01) {
        obj.set({
          width: (obj.width || 0) * sx,
          scaleX: 1,
        })
        obj.setCoords()
        canvas.requestRenderAll()
      }
    }
    notifyChange()
  }, [notifyChange])

  const handleObjectRemoved = useCallback((_e: any) => {
    notifyChange()
  }, [notifyChange])

  // 添加文字
  const addText = useCallback((defaultText?: string, x?: number, y?: number, customColor?: string) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const centerX = x ?? canvas.width! / 2 - 50
    const centerY = y ?? canvas.height! / 2 - 20
    const text = defaultText ?? '双击编辑文字'

    // 使用自定义颜色，或根据当前主题决定
    const ct = currentThemeRef.current
    const textColor = customColor || (ct === 'light' ? '#1e293b' : ct === 'colorful' ? '#7c3aed' : '#e2e8f0')

    const textObj = new Textbox(text, {
      left: centerX,
      top: centerY,
      fontSize: 20,
      fill: textColor,
      fontFamily: 'Noto Sans SC, sans-serif',
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      editable: true,
      // 投影时不显示背景色
      backgroundColor: customColor ? 'transparent' : (theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(20, 20, 24, 0.8)'),
      padding: 8,
      // 双击进入编辑
      doubleClickSimulation: true,
      // 文本框宽度，拖拽调整宽度时文字自动换行
      width: customColor ? 700 : 300,
      splitByGrapheme: true,
      // 选择框样式
      borderColor: '#6366f1',
      cornerColor: '#6366f1',
      cornerStrokeColor: theme === 'light' ? '#000' : '#fff',
      cornerSize: 10,
      cornerStyle: 'circle',
      transparentCorners: false,
    })

    canvas.add(textObj)
    canvas.setActiveObject(textObj)
    canvas.requestRenderAll()

    const element: WhiteboardElement = {
      id: Date.now().toString(),
      type: 'text',
      x: centerX,
      y: centerY,
      data: { text, color: customColor || strokeColor },
      createdAt: new Date().toISOString(),
      createdBy: 'current-user',
    }
    onElementsChange([...elements, element])

    setTimeout(() => {
      textObj.enterEditing?.()
      textObj.selectAll?.()
    }, 100)
  }, [elements, onElementsChange, strokeColor, theme, themeConfig.text])

  // 添加图片
  const addImage = useCallback((defaultUrl?: string, x?: number, y?: number, customScale?: number) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const centerX = x ?? canvas.width! / 2 - 100
    const centerY = y ?? canvas.height! / 2 - 100
    // 使用内嵌 SVG 作为默认图片，避免外部请求失败
    const defaultSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="#6366f1" width="200" height="150"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="16" font-family="sans-serif">🖼️ 图片</text></svg>')}`
    const url = defaultUrl ?? defaultSvg

    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      // 计算缩放比例，使图片宽度为画布宽度的 1/3（如果是投影）
      let scale = customScale ?? 0.5
      if (customScale === undefined && canvas.width) {
        // 默认情况下，图片宽度约为画布宽度的 1/3
        const targetWidth = canvas.width / 3
        scale = targetWidth / (img.width || 200)
        // 限制最大和最小缩放
        scale = Math.max(0.1, Math.min(1, scale))
      }

      img.set({
        left: centerX,
        top: centerY,
        scaleX: scale,
        scaleY: scale,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        borderColor: '#6366f1',
        cornerColor: '#6366f1',
        cornerStrokeColor: theme === 'light' ? '#000' : '#fff',
        cornerSize: 10,
        cornerStyle: 'circle',
        transparentCorners: false,
        padding: 4,
      })
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.requestRenderAll()

      const element: WhiteboardElement = {
        id: Date.now().toString(),
        type: 'image',
        x: centerX,
        y: centerY,
        data: { url },
        createdAt: new Date().toISOString(),
        createdBy: 'current-user',
      }
      onElementsChange([...elements, element])
    }).catch(() => {
      const textObj = new IText('[图片加载失败]', {
        left: centerX,
        top: centerY,
        fontSize: 16,
        fill: '#ef4444',
        fontFamily: 'Noto Sans SC, sans-serif',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        editable: true,
        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(20, 20, 24, 0.8)',
        padding: 8,
        borderColor: '#6366f1',
        cornerColor: '#6366f1',
        cornerStrokeColor: theme === 'light' ? '#000' : '#fff',
        cornerSize: 10,
        cornerStyle: 'circle',
        transparentCorners: false,
      })
      canvas.add(textObj)
      canvas.setActiveObject(textObj)
      canvas.requestRenderAll()
    })
  }, [elements, onElementsChange, theme])

  // 清除画布
  const clearCanvas = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.clear()
    canvas.backgroundColor = themeConfig.canvasBg
    if (canvas.wrapperEl) {
      canvas.wrapperEl.style.backgroundColor = themeConfig.canvasBg
    }
    canvas.renderAll()
    onElementsChange([])
  }, [onElementsChange, themeConfig.canvasBg])

  // 缩放画布
  const zoomIn = useCallback(() => {
    const newScale = Math.min(5, scaleRef.current * 1.2)
    onScaleChange?.(newScale)
  }, [onScaleChange])

  const zoomOut = useCallback(() => {
    const newScale = Math.max(0.1, scaleRef.current / 1.2)
    onScaleChange?.(newScale)
  }, [onScaleChange])

  const resetZoom = useCallback(() => {
    onScaleChange?.(1)
  }, [onScaleChange])

  // 更新动态方法供父组件调用（保持 API 最新）
  useEffect(() => {
    const api = (window as any).whiteboardAPI
    if (api) {
      api.addText = addText
      api.addImage = addImage
      api.clearCanvas = clearCanvas
      api.zoomIn = zoomIn
      api.zoomOut = zoomOut
      api.resetZoom = resetZoom
      api.undo = () => {
        if (historyIdxRef.current <= 0) return
        historyIdxRef.current--
        const canvas = fabricRef.current
        if (!canvas) return
        skipHistoryRef.current = true
        canvas.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current])).then(() => {
          canvas.backgroundColor = currentThemeRef.current === 'dark' ? '#0f0f13' : currentThemeRef.current === 'light' ? '#f8fafc' : '#f5f3ff'
          canvas.renderAll()
          setTimeout(() => { const e = new CustomEvent('whiteboard:save'); window.dispatchEvent(e) }, 100)
        })
      }
      api.redo = () => {
        if (historyIdxRef.current >= historyRef.current.length - 1) return
        historyIdxRef.current++
        const canvas = fabricRef.current
        if (!canvas) return
        skipHistoryRef.current = true
        canvas.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current])).then(() => {
          canvas.backgroundColor = currentThemeRef.current === 'dark' ? '#0f0f13' : currentThemeRef.current === 'light' ? '#f8fafc' : '#f5f3ff'
          canvas.renderAll()
          setTimeout(() => { const e = new CustomEvent('whiteboard:save'); window.dispatchEvent(e) }, 100)
        })
      }
    }
  }, [addText, addImage, clearCanvas, zoomIn, zoomOut, resetZoom])

  return (
    <div
      className="absolute inset-0 touch-none"
      style={{
        backgroundImage: `
          linear-gradient(${themeConfig.canvasGrid} 1px, transparent 1px),
          linear-gradient(90deg, ${themeConfig.canvasGrid} 1px, transparent 1px),
          none
        `,
        backgroundSize: '20px 20px, 20px 20px, auto',
        backgroundPosition: '0 0, 0 0, 0 0',
        backgroundRepeat: 'repeat, repeat, no-repeat',
        backgroundColor: themeConfig.canvasBg,
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{
          cursor: currentTool === 'pen' ? 'crosshair' :
                  currentTool === 'eraser' ? 'none' :
                  currentTool === 'laser' ? 'none' : 'default',
          touchAction: 'none',
        }}
      />

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 rounded-lg shadow-lg py-1 min-w-[120px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: theme === 'dark' ? '#1a1a22' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
          }}
        >
          <button
            onClick={() => {
              if (contextMenu.target && fabricRef.current) {
                fabricRef.current.remove(contextMenu.target)
                fabricRef.current.requestRenderAll()
              }
              setContextMenu(prev => ({ ...prev, visible: false }))
            }}
            className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
              theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        </div>
      )}
    </div>
  )
}
