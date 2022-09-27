import React, { CSSProperties, FC, useState } from 'react'

import * as Tabs from '@radix-ui/react-tabs'
import * as ScrollArea from '@radix-ui/react-scroll-area'

// @ts-ignore
import { dispatch, zoomToBbox } from '../align/draw.js'

// @ts-ignore
import * as ACT from '../align/document/store/actions.js'
// @ts-ignore
import * as PRIM from '../align/document/primitives.js'

import { Eye, EyeSlash, Trash } from 'react-bootstrap-icons'

import { ColorPicker } from '../components/ColorPicker'

interface AlignSiderProps {
  state: any
  visible?: boolean
  style?: CSSProperties
}

export const AlignSider: FC<AlignSiderProps> = ({ state, visible = true, style }) => {

  const [activeTab, setActiveTab] = useState<string>('scene')

  return (
    <Tabs.Root
      defaultValue={activeTab}
      onValueChange={(val) => setActiveTab(val)}
      style={{
        ...style,
        height: '100%',
        visibility: open ? 'visible' : 'hidden',
        outlineWidth: 1,
        zIndex: 12,
      }}
    >
      <Tabs.TabsList
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          borderBottom: '1px solid #ccc',
          height: 54,
          borderRadius: 'inherit',
        }}
      >
        <Tabs.TabsTrigger value="scene"
          className={`tab-button ${activeTab === 'scene' && 'tab-button-active'}`}
          style={{
            borderTopLeftRadius: 8,
            outline: 'none',
          }}
        >
          Scene
        </Tabs.TabsTrigger>
        <Tabs.TabsTrigger value="browse"
          className={`tab-button ${activeTab === 'browse' && 'tab-button-active'}`}
          style={{
            borderTopRightRadius: 8,
            outline: 'none',
          }}
        >
          Browse
        </Tabs.TabsTrigger>
      </Tabs.TabsList>
      <Tabs.TabsContent value="scene"
        asChild={true}
      >
        <div className="flex-column" style={{
          background: 'white',
          borderRadius: '0px 0px 8px 8px',
          height: 'calc(100% - 54px)',
          padding: '24px 16px',
          outline: 'none',
        }}>
          <ScrollArea.Root
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <ScrollArea.Viewport
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 'inherit',
                borderBottom: '1px solid var(--color-warning)'
              }}
            >
              <div className="flex-row"
                style={{ marginBottom: 8 }}
              >
                <span>
                  Items: {state.scene.editItems.length}
                </span>
                <span>
                  Selected: {state.scene.selected.length}
                </span>
              </div>
              <ul style={{
                width: '100%'
              }}>
                {/* @ts-ignore */}
                {state.scene.editItems.map((item: any, i: number) => {
                  return item && item.pts.length > 0 ? (
                    <li className="flex-row"
                      style={{
                        alignItems: 'center',
                        gap: 4,
                        justifyContent: 'space-between',
                        margin: '4px 0px',
                        paddingRight: 16
                      }}
                    >
                      <button
                        className="icon-solo-button"
                        onClick={() => {
                          dispatch(ACT.editVisible(!item.properties.visible, item.id))
                        }}
                        value={item.properties.visible}
                      >
                        {item.properties.visible ? <Eye /> : <EyeSlash />}
                      </button>
                      <div
                        className={`prim-chip ${state.scene.selected.includes(item.id) ? 'prim-chip-selected' : ''}`}
                        onClick={() => {
                          if (!item) return
                          dispatch(ACT.editSelectApnd(item.id))

                          // calculate item bbox
                          const bbox = new PRIM.bbox(item)

                          zoomToBbox(bbox)
                        }}
                      >
                        {item.type}
                      </div>
                      <ColorPicker
                        value={item.properties.stroke}
                        onChange={(color: string) => {
                          dispatch(ACT.editStroke(color, item.id))
                        }}
                      />
                      <button
                        className="icon-solo-button"
                        onClick={() => {
                          dispatch(ACT.sceneRmvItem([item.id]))
                        }}
                      >
                        <Trash />
                      </button>
                    </li>) : <></>
                })}
              </ul>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="scroll-area-bar">
              <ScrollArea.Thumb className="scroll-area-thumb" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </div>
      </Tabs.TabsContent>
    </Tabs.Root>
  )
}