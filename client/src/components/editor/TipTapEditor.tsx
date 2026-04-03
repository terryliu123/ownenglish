import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useRef, useEffect } from 'react'
import { imageService, mediaService } from '../../services/api'
import { t } from '../../i18n/index'
import { Audio, Video } from './TipTapMediaExtensions'

interface TipTapEditorProps {
  content: Record<string, unknown>
  onChange: (content: Record<string, unknown>) => void
  placeholder?: string
  className?: string
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded hover:bg-slate-100 ${active ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`}
    >
      {children}
    </button>
  )
}

export function TipTapEditor({ content, onChange, placeholder, className }: TipTapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const contentRef = useRef(content)

  useEffect(() => {
    contentRef.current = content
  }, [content])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        link: false,
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        resize: {
          enabled: true,
          minWidth: 100,
          minHeight: 100,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
      Audio,
      Video,
      Placeholder.configure({
        placeholder: placeholder || t('editor.placeholder'),
      }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[120px] px-4 py-3',
      },
    },
  })

  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content, { emitUpdate: false })
      }
    }
  }, [editor, content])

  useEffect(() => {
    editorRef.current = editor ?? null
  }, [editor])

  const handleImageUpload = useCallback(async (file: File) => {
    const ed = editorRef.current
    if (!ed) return
    try {
      const url = await imageService.upload(file)
      ed.chain().focus().setImage({ src: url }).run()
    } catch (error) {
      console.error('Image upload failed:', error)
      alert(t('editor.imageUploadFailed'))
    }
  }, [])

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            handleImageUpload(file)
          }
          return
        }
      }
    },
    [handleImageUpload]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          event.preventDefault()
          handleImageUpload(file)
          return
        }
      }
    },
    [handleImageUpload]
  )

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        handleImageUpload(file)
        event.target.value = ''
      }
    },
    [handleImageUpload]
  )

  const handleMediaUpload = useCallback(async (file: File) => {
    const ed = editorRef.current
    if (!ed) return
    if (file.size > 10 * 1024 * 1024) { alert('文件大小超过 10MB'); return }
    try {
      const result = await mediaService.upload(file)
      if (result.media_type === 'video') {
        ed.chain().focus().insertContent({ type: 'video', attrs: { src: result.url } }).run()
      } else {
        ed.chain().focus().insertContent({ type: 'audio', attrs: { src: result.url } }).run()
      }
    } catch { alert(t('editor.imageUploadFailed')) }
  }, [])

  const handleMediaChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) { handleMediaUpload(file); event.target.value = '' }
  }, [handleMediaUpload])

  if (!editor) return null

  return (
    <div className={`border border-slate-200 rounded-xl overflow-hidden bg-white ${className || ''}`}>
      <style>{`
        [data-resize-handle] {
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 2px;
          position: absolute;
        }
        [data-resize-handle="top"] { top: -6px; left: 0; right: 0; margin: 0 auto; cursor: ns-resize; }
        [data-resize-handle="bottom"] { bottom: -6px; left: 0; right: 0; margin: 0 auto; cursor: ns-resize; }
        [data-resize-handle="left"] { left: -6px; top: 0; bottom: 0; margin: auto 0; cursor: ew-resize; }
        [data-resize-handle="right"] { right: -6px; top: 0; bottom: 0; margin: auto 0; cursor: ew-resize; }
        [data-resize-handle="top-left"] { top: -6px; left: -6px; cursor: nwse-resize; }
        [data-resize-handle="top-right"] { top: -6px; right: -6px; cursor: nesw-resize; }
        [data-resize-handle="bottom-left"] { bottom: -6px; left: -6px; cursor: nesw-resize; }
        [data-resize-handle="bottom-right"] { bottom: -6px; right: -6px; cursor: nwse-resize; }
        [data-resize-wrapper] {
          display: block !important;
        }
      `}</style>
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title={t('editor.bold')}
        >
          <span className="font-bold text-sm">B</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title={t('editor.italic')}
        >
          <span className="italic text-sm">I</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title={t('editor.underline')}
        >
          <span className="underline text-sm">U</span>
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title={t('editor.alignLeft')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title={t('editor.alignCenter')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title={t('editor.alignRight')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="6" y1="18" x2="21" y2="18" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <ToolbarButton
          onClick={() => {
            const url = window.prompt(t('editor.inputLink'))
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          active={editor.isActive('link')}
          title={t('editor.addLink')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </ToolbarButton>

        <ToolbarButton onClick={() => fileInputRef.current?.click()} title={t('editor.insertImage')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolbarButton>

        <ToolbarButton onClick={() => mediaInputRef.current?.click()} title="插入音视频">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={mediaInputRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={handleMediaChange}
        />
      </div>

      <div
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default TipTapEditor
