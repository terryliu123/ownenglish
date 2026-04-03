import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useRef, useCallback, useState } from 'react'

function ResizableAudioComponent({ node, updateAttributes }: any) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const width = node.attrs.width || '100%'

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = wrapperRef.current?.offsetWidth || 400

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const newWidth = Math.max(200, Math.min(startWidth + delta, 800))
      updateAttributes({ width: `${newWidth}px` })
    }
    const onMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [updateAttributes])

  return (
    <NodeViewWrapper>
      <div
        ref={wrapperRef}
        className="relative inline-block my-2 group"
        style={{ width }}
      >
        <audio controls src={node.attrs.src} className="w-full" />
        <div
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(59,130,246,0.4)', borderRadius: '0 4px 4px 0' }}
        />
        {isResizing && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">{width}</div>}
      </div>
    </NodeViewWrapper>
  )
}

function ResizableVideoComponent({ node, updateAttributes }: any) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const width = node.attrs.width || '100%'

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = wrapperRef.current?.offsetWidth || 400

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const newWidth = Math.max(200, Math.min(startWidth + delta, 800))
      updateAttributes({ width: `${newWidth}px` })
    }
    const onMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [updateAttributes])

  return (
    <NodeViewWrapper>
      <div
        ref={wrapperRef}
        className="relative inline-block my-2 group"
        style={{ width }}
      >
        <video controls src={node.attrs.src} className="w-full" style={{ maxHeight: 360 }} />
        <div
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(59,130,246,0.4)', borderRadius: '0 4px 4px 0' }}
        />
        {isResizing && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">{width}</div>}
      </div>
    </NodeViewWrapper>
  )
}

export const Audio = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-audio]' }] },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-audio': '' }, { style: `width:${HTMLAttributes.width || '100%'}` }),
      ['audio', { src: HTMLAttributes.src, controls: '' }],
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableAudioComponent)
  },
})

export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-video]' }] },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-video': '' }, { style: `width:${HTMLAttributes.width || '100%'}` }),
      ['video', { src: HTMLAttributes.src, controls: '' }],
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableVideoComponent)
  },
})
