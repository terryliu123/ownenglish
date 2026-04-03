import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Link from '@tiptap/extension-link'
import { Audio, Video } from './TipTapMediaExtensions'

interface TipTapViewerProps {
  content: Record<string, unknown>
  className?: string
}

// Detect if content is TipTap JSON doc format
function isTipTapDoc(content: unknown): content is Record<string, unknown> {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as Record<string, unknown>).type === 'doc'
  )
}

// Convert plain string to TipTap doc format
function stringToTipTapDoc(text: string): Record<string, unknown> {
  return {
    type: 'doc',
    content: text.split('\n\n').map((para) => ({
      type: 'paragraph',
      content: para ? [{ type: 'text', text: para }] : [],
    })),
  }
}

export function TipTapViewer({ content, className }: TipTapViewerProps) {
  // Handle backward compatibility: convert string to TipTap doc
  const normalizedContent = isTipTapDoc(content)
    ? content
    : stringToTipTapDoc(String(content ?? ''))

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        bold: false,
        italic: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link,
      Image.configure({ inline: false, allowBase64: false }),
      Audio,
      Video,
    ],
    content: normalizedContent,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none',
      },
    },
  })

  if (!editor) return null

  return (
    <div className={`rounded-xl ${className || ''}`}>
      <EditorContent editor={editor} />
    </div>
  )
}

export default TipTapViewer
