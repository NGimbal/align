import React, { CSSProperties, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

import * as Progress from '@radix-ui/react-progress'

// @ts-ignore
import * as ACT from '../align/document/store/actions'

// @ts-ignore
import { sceneInit, uiInit, historyInit } from '../align/document/store/reducers'

import { ContextMenu } from '../components/ContextMenu'
import { Slider } from '../components/Slider'
import { InputLabel } from '../components/InputLabel'
import { ColorPicker } from '../components/ColorPicker'

import { onDrop } from '../align/onDrop'
import { progressCallback, useDrop } from '../hooks'

import { AlignToolbar } from './AlignToolbar'
import { AlignSider } from './AlignSider'

// @ts-ignore
import { initDraw, dispatch, cleanupWebGL, zoomToFit, screenshotDirect } from '../align/draw'
import { serializeScene, loadScene } from '../align/document/io'

import './styles/align.css'
import './styles/buttons.css'
import './styles/editor.css'
import './styles/flex.css'
import './styles/menu.css'
import './styles/global.css'
import './styles/list.css'
import './styles/inputs.css'

export interface DrawingPanelProps {
  style?: CSSProperties
}

// TODO: break this component up, even further
export const DrawingPanel = React.forwardRef(
  function DrawingPanelForwardRef({
    style,
  }: DrawingPanelProps, ref) {
    const canvasContainerRef = useRef<HTMLDivElement>(null)

    const [loadProgress, setLoadProgress] = useState(0)
    const [loadTotal, setLoadTotal] = useState(0)

    const onProgressCallback: progressCallback = (progress: number, total: number) => {
      console.log(`Loaded ${((progress / total) * 100).toFixed(2)}%, ${progress} of ${total}.`)
      setLoadProgress(progress)
      setLoadTotal(total)
      if (progress === total) {
        dispatch(ACT.editSelectClr())
        zoomToFit()
      }
    }

    useDrop(canvasContainerRef, onDrop, onProgressCallback)

    // We need the component to re-render when state changes
    const [state, setState] = useState({
      scene: sceneInit,
      ui: uiInit,
      history: historyInit,
    })

    useEffect(() => {
      if (!canvasContainerRef.current) return

      initDraw(setState)

      return () => {
        console.log('cleanup')
        cleanupWebGL()
      }
    }, [])

    const currentItem = useMemo(() => {
      return state.scene.editItems.find((i: any) => i.id === state.scene.editItem)
    }, [state.scene])

    const currentProperties = useMemo(() => {
      // @ts-ignore
      return currentItem ? currentItem.properties : undefined
    }, [currentItem])

    const getDrawingContent = useCallback(() => {
      const json = serializeScene()
      return JSON.stringify(json)
    }, [])

    const getDrawingScreenshot = useCallback((filename: string, _formData?: FormData) => {
      screenshotDirect((blob: Blob) => {
        return blob
      })
    }, [])

    const api = () => ({
      getDrawingContent,
      getDrawingScreenshot,
      loadScene: (data: any) => loadScene(data, onProgressCallback)
    })

    useImperativeHandle(ref, api, [getDrawingContent, getDrawingScreenshot])

    return (
      <>
        <div className='flex-row'
          style={{
            ...style,
            height: '100%',
            position: 'relative',
            alignItems: 'start',
          }}
        >
          <AlignSider state={state}
            style={{
              flex: 4,
              border: '1px solid var(--color-grey3)',
              borderRadius: 8,
              minWidth: 200,
            }}
          />
          <div
            className='flex-column'
            style={{
              height: '100%',
              flex: 20,
            }}
          >
            <div id="drawing-panel"
              className={'flex-column'}
              style={{
                height: '100%',
                width: '100%',
                transform: open ? undefined : 'translateX(65vw)',
                zIndex: 11,
                pointerEvents: 'auto',
                gap: 0,
              }}
            >
              <AlignToolbar state={state} />
              <ContextMenu trigger={
                <div id="canvas-container" ref={canvasContainerRef}
                  style={{
                    height: '100%',
                    width: '100%',
                    // borderRadius: 'inherit', 
                    backgroundColor: 'white',
                    position: 'relative',
                    borderRadius: 8,
                    border: '1px solid var(--color-warmblue)',
                  }}
                >
                  {loadTotal > 0 && loadProgress < loadTotal &&
                    <Progress.Root value={loadProgress}
                      max={loadTotal}
                      getValueLabel={(value: number, max: number) => `Loaded ${((value / max) * 100).toFixed(2)}%, ${value} loaded of ${max} total.`}
                      style={{
                        height: 8,
                        minHeight: 8,
                        margin: '4px 8px 0px 8px',
                        position: 'absolute',
                        width: 'calc(100% - 16px)',
                        zIndex: 10,
                        overflow: 'hidden',
                        borderRadius: 999,
                        backgroundColor: 'white',
                        border: '1px solid var(--color-warmblue)',
                      }}
                    >
                      <Progress.Indicator
                        style={{
                          height: '100%',
                          width: '100%',
                          backgroundColor: 'var(--color-warmblue)',
                          // transition: 'transform 20ms cubic-bezier(0.65, 0, 0.35, 1)',
                          transform: `translateX(-${100 - ((loadProgress / loadTotal) * 100)}%)`,
                        }}
                      />
                    </Progress.Root>
                  }
                  <canvas id="c" className="canvas" style={{ height: '100%', width: '100%', borderRadius: 'inherit', position: 'absolute' }}></canvas>
                  <canvas id="text" className="canvas" style={{ height: '100%', width: '100%', borderRadius: 'inherit', position: 'absolute' }}></canvas>
                </div>
              }>
                <div className="flex-column"
                  style={{
                    gap: 8,
                  }}>
                  <div className="flex-column" style={{ gap: 4 }}>
                    <div className="flex-column" style={{ gap: 4 }}>
                      <InputLabel label={'Stroke Width'} />
                      <Slider
                        value={currentProperties ? [currentProperties.weight * 10000] : [0]}
                        onValueChange={(value: number[]) => {
                          const weight = value[0] / 10000
                          dispatch(ACT.editWeight(weight, state.scene.editItem))
                        }}
                        sliderProps={{
                          min: 1,
                        }}
                      />
                    </div>
                    <div className="flex-column" style={{ gap: 4 }}>
                      <InputLabel label={'Opacity'} />
                      <Slider
                        value={currentProperties ? [currentProperties.opacity * 100] : [0]}
                        onValueChange={(value: number[]) => {
                          const opacity = value[0] / 100
                          dispatch(ACT.editOpacity(opacity, state.scene.editItem))
                        }}
                        sliderProps={{
                          min: 1,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-row" >
                    <div className="flex-column" style={{ gap: 4 }}>
                      <InputLabel label={'Stroke'} />
                      <div className="flex-row"
                        style={{
                          gap: 4,
                          alignItems: 'center',
                        }}
                      >
                        <ColorPicker
                          value={currentProperties && currentProperties.stroke}
                          onChange={(val: string) => {
                            dispatch(ACT.editStroke(val, state.scene.editItem))
                          }}
                          style={{
                            width: 46,
                            height: 46
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex-column" style={{ gap: 4 }}>
                      <InputLabel label={'Fill'} />
                      <div className="flex-row"
                        style={{
                          gap: 4,
                          alignItems: 'center',
                        }}
                      >
                        <ColorPicker
                          value={currentProperties && currentProperties.fill}
                          onChange={(val: string) => {
                            dispatch(ACT.editFill(val, state.scene.editItem))
                          }}
                          style={{
                            width: 46,
                            height: 46
                          }}
                          // @ts-ignore
                          disabled={currentItem && currentItem.type === 'polyline'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ContextMenu>
            </div>
          </div>
          <a id="downloadAnchor" style={{ display: 'none' }} />
        </div>
      </>
    )
  })