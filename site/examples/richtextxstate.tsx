/* eslint-disable no-console */
import React, { useCallback, useContext, useMemo, useState } from 'react'
import isHotkey from 'is-hotkey'
import { Editable, withReact, useSlate, Slate } from 'slate-react'
import {
  Editor,
  Transforms,
  createEditor,
  Descendant,
  Element as SlateElement,
} from 'slate'
import { withHistory } from 'slate-history'

import { Button, Icon, Toolbar } from '../components'
import { assign, Machine } from 'xstate'
import { useMachine } from '@xstate/react'

const toggleStates = {
  initial: 'inactive',
  states: {
    on: {
      on: {
        TOGGLE: 'inactive',
      },
    },
    off: {
      on: {
        TOGGLE: 'active',
      },
    },
  },
}

const useFormatMachine = () => {
  const editor = withHistory(withReact(createEditor()))
  const [value, setValue] = useState<Descendant[]>(initialValue)

  return Machine(
    {
      id: 'format',
      context: { editor, value, setValue },
      type: 'parallel',
      states: {
        bold: {
          initial: 'inactive',
          states: {
            active: {
              on: {
                BOLD: { target: 'inactive', actions: ['toggleBold'] },
              },
            },
            inactive: {
              on: {
                BOLD: 'active',
              },
            },
          },
        },
        italic: {
          initial: 'inactive',
          states: {
            active: {
              on: {
                ITALICIZE: 'inactive',
              },
            },
            inactive: {
              on: {
                ITALICIZE: 'active',
              },
            },
          },
        },
        underlined: {
          initial: 'inactive',
          states: {
            active: {
              on: {
                UNDERLINE: 'inactive',
              },
            },
            inactive: {
              on: {
                UNDERLINE: 'active',
              },
            },
          },
        },
        quoted: {
          initial: 'inactive',
          states: {
            active: {
              on: {
                QUOTE: 'inactive',
              },
            },
            inactive: {
              on: {
                QUOTE: 'active',
              },
            },
          },
        },
        code: {
          initial: 'inactive',
          states: {
            active: {
              on: {
                CODE: 'inactive',
              },
            },
            inactive: {
              on: {
                CODE: 'active',
              },
            },
          },
        },
        line_break: {
          initial: 'paragraph',
          states: {
            paragraph: {
              on: {
                NUMBER: 'numbers',
                BULLET: 'bullets',
              },
            },
            numbers: {
              on: {
                NUMBER: 'paragraph',
                BULLET: 'bullets',
              },
            },
            bullets: {
              on: {
                NUMBER: 'numbers',
                BULLET: 'paragraph',
              },
            },
          },
        },
        heading: {
          initial: 'none',
          states: {
            none: {
              on: {
                HEADING1: 'heading1',
                HEADING2: 'heading2',
              },
            },
            heading1: {
              on: {
                HEADING1: 'none',
                HEADING2: 'heading2',
              },
            },
            heading2: {
              on: {
                HEADING1: 'heading1',
                HEADING2: 'none',
              },
            },
          },
        },
      },
    },
    {
      actions: {
        toggleBold: (context, event) => {
          console.log(context)
          console.log(event)
        },
      },
    }
  )
}

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

const MachineContext = React.createContext(null)

const LIST_TYPES = ['numbered-list', 'bulleted-list']

const RichTextExample = () => {
  const formatMachine = useFormatMachine()
  const [state, send] = useMachine(formatMachine)
  const [value, setValue] = useState<Descendant[]>(initialValue)
  const renderElement = useCallback(props => <Element {...props} />, [])
  const renderLeaf = useCallback(props => <Leaf {...props} />, [])
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])

  return (
    <MachineContext.Provider value={[state, send]}>
      <Slate editor={editor} value={value} onChange={value => setValue(value)}>
        <Toolbar>
          <MarkButtonX
            active={state.value.bold === 'active'}
            state="BOLD"
            icon="format_bold"
          />
          <MarkButton format="bold" icon="format_bold" />
          <MarkButton format="italic" icon="format_italic" />
          <MarkButton format="underline" icon="format_underlined" />
          <MarkButton format="code" icon="code" />
          <BlockButton format="heading-one" icon="looks_one" />
          <BlockButton format="heading-two" icon="looks_two" />
          <BlockButton format="block-quote" icon="format_quote" />
          <BlockButton format="numbered-list" icon="format_list_numbered" />
          <BlockButton format="bulleted-list" icon="format_list_bulleted" />
        </Toolbar>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Enter some rich text…"
          spellCheck
          autoFocus
          onKeyDown={event => {
            for (const hotkey in HOTKEYS) {
              if (isHotkey(hotkey, event as any)) {
                event.preventDefault()
                const mark = HOTKEYS[hotkey]
                toggleMark(editor, mark)
              }
            }
          }}
        />
      </Slate>
    </MachineContext.Provider>
  )
}

const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(editor, format)
  const isList = LIST_TYPES.includes(format)

  Transforms.unwrapNodes(editor, {
    match: n =>
      LIST_TYPES.includes(
        !Editor.isEditor(n) && SlateElement.isElement(n) && n.type
      ),
    split: true,
  })
  const newProperties: Partial<SlateElement> = {
    type: isActive ? 'paragraph' : isList ? 'list-item' : format,
  }
  Transforms.setNodes(editor, newProperties)

  if (!isActive && isList) {
    const block = { type: format, children: [] }
    Transforms.wrapNodes(editor, block)
  }
}

const toggleMarkX = (editor, format) => {
  const isActive = isMarkActive(editor, format)

  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format)

  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

const isBlockActive = (editor, format) => {
  const [match] = Editor.nodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  })

  return !!match
}

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
}

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>
    case 'list-item':
      return <li {...attributes}>{children}</li>
    case 'numbered-list':
      return <ol {...attributes}>{children}</ol>
    default:
      return <p {...attributes}>{children}</p>
  }
}

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.BOLD) {
    children = <strong>{children}</strong>
  }

  if (leaf.code) {
    children = <code>{children}</code>
  }

  if (leaf.italic) {
    children = <em>{children}</em>
  }

  if (leaf.underline) {
    children = <u>{children}</u>
  }

  return <span {...attributes}>{children}</span>
}

const BlockButton = ({ format, icon }) => {
  const editor = useSlate()
  return (
    <Button
      active={isBlockActive(editor, format)}
      onMouseDown={event => {
        event.preventDefault()
        toggleBlock(editor, format)
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  )
}

const MarkButtonX = ({ icon, state, ...others }) => {
  const [_, send] = useContext(MachineContext)
  return (
    <Button
      onMouseDown={event => {
        event.preventDefault()
        send('BOLD')
      }}
      {...others}
    >
      <Icon>{icon}</Icon>
    </Button>
  )
}

const MarkButton = ({ format, icon }) => {
  const editor = useSlate()
  return (
    <Button
      active={isMarkActive(editor, format)}
      onMouseDown={event => {
        event.preventDefault()
        toggleMark(editor, format)
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  )
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      { text: 'Thissssss is editable ' },
      { text: 'rich', BOLD: true },
      { text: ' text, ' },
      { text: 'much', italic: true },
      { text: ' better than a ' },
      { text: '<textarea>', code: true },
      { text: '!' },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          "Since it's rich text, you can do things like turn a selection of text ",
      },
      { text: 'bold', BOLD: true },
      {
        text:
          ', or add a semantically rendered block quote in the middle of the page, like this:',
      },
    ],
  },
  {
    type: 'block-quote',
    children: [{ text: 'A wise quote.' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'Try it out for yourself!' }],
  },
]

export default RichTextExample
