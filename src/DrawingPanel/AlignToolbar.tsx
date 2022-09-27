import React, { FC, useEffect, useMemo } from 'react'

import * as Toolbar from '@radix-ui/react-toolbar'

// @ts-ignore
import { dispatch, zoomToFit, screenshotDirect, saveDistTex } from '../align/draw'
// @ts-ignore
import { serializeScene } from '../align/document/io'

// @ts-ignore
import * as ACT from '../align/document/store/actions'
// @ts-ignore
import * as PRIM from '../align/document/primitives'

import { AspectRatio, BoundingBox, Building, Cursor, CursorText, Magnet, Stars, VectorPen } from 'react-bootstrap-icons'
import { ToolbarButton } from '../components/ToolbarButton'
import { TooblarDropdown } from '../components/ToolbarDropdown'

interface AlignToolbarProps {
  state: any
  visible?: boolean
}

const TOOLBAR_ICON_SIZE = 22

export const AlignToolbar: FC<AlignToolbarProps> = ({ state, visible = true }) => {

  const currentPrimType = useMemo(() => {
    const currItem = state.scene.editItems.find((i: any) => i.id === state.scene.editItem)
    return currItem ? currItem.type : null
  }, [state.scene])

  const switchPrimType = (primSel: string) => {

    const currItem = state.scene.editItems.find((i: any) => i.id === state.scene.editItem)
    const type = currItem.type

    if (type != primSel) {
      const newPrim = new PRIM.prim(primSel, [], { ...currItem.properties })

      if (currItem && currItem.pts.length > 1) {
        dispatch(ACT.scenePushEditItem(newPrim))
      } else {
        dispatch(ACT.sceneEscItem(currItem.id, newPrim))
      }
    }
  }

  const primTypes = [
    [{
      value: 'polyline',
      checked: currentPrimType === 'polyline',
    },
    {
      value: 'polygon',
      checked: currentPrimType === 'polygon',
    },
    {
      value: 'rectangle',
      checked: currentPrimType === 'rectangle',
    },
    {
      value: 'circle',
      checked: currentPrimType === 'circle',
    },
    {
      value: 'ellipse',
      checked: currentPrimType === 'ellipse',
    }],
    [{
      label: 'Point Light',
      value: 'pointlight',
      checked: currentPrimType === 'pointlight',
      disabled: true
    }]
  ]

  const snapTypes = [
    [{
      label: 'Points',
      value: 'snap-point',
      onClick: () => dispatch(ACT.uiSnapPt()),
      checked: state.ui.snapPt,
      keyCut: 'P'
    },
    {
      value: 'grid',
      onClick: () => dispatch(ACT.uiSnapGrid()),
      checked: state.ui.snapGrid,
      keyCut: 'G'
    },
    {
      label: 'Relative Angle',
      value: 'relative-angle',
      onClick: () => dispatch(ACT.uiSnapRef()),
      checked: state.ui.snapRef,
      keyCut: 'S'
    },
    {
      label: 'Global Angle',
      value: 'global-angle',
      onClick: () => dispatch(ACT.uiSnapGlobal()),
      checked: state.ui.snapGlobal,
      keyCut: 'Shift'
    }]
  ]

  const moreTypes = [
    [{
      label: 'Undo',
      value: 'undo',
      disabled: state.history.past.length < 1,
      onClick: () => { dispatch(ACT.historyUndo()) },
      keyCut: '⌘+Z',
      icon: state.history.past.length < 10 ? state.history.past.length : '9+'
    },
    {
      label: 'Redo',
      value: 'redo',
      disabled: state.history.future.length < 1,
      onClick: () => { dispatch(ACT.historyRedo()) },
      keyCut: '⌘+Y',
      icon: state.history.future.length < 10 ? state.history.future.length : '9+'
    }],
    [{
      label: 'Show Grid',
      value: 'show-grid',
      onClick: () => { dispatch(ACT.uiGridToggle(!state.ui.showGrid)) },
    }],
    [{
      label: 'Screenshot',
      value: 'screenshot',
      onClick: () => { screenshotDirect() },
      keyCut: 'L'
    },
    {
      label: 'Screenshot Distance',
      value: 'screenshot-dist',
      onClick: () => { saveDistTex() },
    },
    {
      label: 'Save Public',
      value: 'save-public',
      onClick: () => {
        const json = serializeScene()
        if (typeof json === 'undefined') return
      },
      disabled: true
    }],
    [{
      label: 'Download .json',
      value: 'download-json',
      onClick: () => {
        const json = serializeScene()
        if (typeof json === 'undefined') return
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(json)
        const downloadAnchor = document.getElementById('downloadAnchor')
        if (!downloadAnchor) return
        downloadAnchor.setAttribute('href', dataStr)
        downloadAnchor.setAttribute('download', 'drawing.json')
        downloadAnchor.click()
      }
    },
    {
      label: 'Download .dxf',
      value: 'download-dxf',
      disabled: true,
      icon: <Stars />
    }]
  ]

  return (
    <div className="flex-row" style={{
      height: 0,
      justifyContent: 'center',
    }}>
      <Toolbar.Root className="toolbar" style={{
        zIndex: 1,
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-grey1)',
        height: 'fit-content',
        gap: 16,
        marginTop: 16,
        paddingLeft: 28,
        paddingRight: 28,
        border: '1px solid var(--color-grey3)',
        borderRadius: 999,
        boxShadow: 'rgba(0, 0, 0, 0.08) 0px 8px 28px',
        width: 'fit-content'
      }}>
        <ToolbarButton
          icon={<AspectRatio size={TOOLBAR_ICON_SIZE} />}
          disabled={!visible}
          onClick={() => { zoomToFit() }}
          tooltip={state.scene.selected.length > 0 ? 'Zoom to Selection' : 'Zoom To Fit'}
        />
        <Toolbar.ToggleGroup type='single' defaultValue='draw'>
          <ToolbarButton
            icon={<Cursor size={TOOLBAR_ICON_SIZE} />}
            active={state.ui.mode === 'select'}
            disabled={!visible}
            onClick={() => { dispatch(ACT.uiMode('select')) }}
            tooltip={'Select'}
          />
          <ToolbarButton
            icon={<VectorPen size={TOOLBAR_ICON_SIZE} />}
            active={state.ui.mode === 'draw'}
            disabled={!visible}
            onClick={() => { dispatch(ACT.uiMode('draw')) }}
            tooltip={'Draw'}
          />
          <ToolbarButton
            icon={<CursorText size={TOOLBAR_ICON_SIZE} />}
            active={state.ui.mode === 'text'}
            disabled={true}
            onClick={() => { dispatch(ACT.uiMode('text')) }}
            tooltip={'Text'}
          />
        </Toolbar.ToggleGroup>
        <TooblarDropdown
          options={primTypes}
          onValueChange={switchPrimType}
          triggerIcon={<BoundingBox size={TOOLBAR_ICON_SIZE} />}
          tooltip={'Shapes'}
        />
        <TooblarDropdown
          options={snapTypes}
          triggerIcon={<Magnet size={TOOLBAR_ICON_SIZE} />}
          tooltip={'Snaps'}
        />
        <TooblarDropdown
          options={moreTypes}
          onValueChange={switchPrimType}
          triggerIcon={<Building size={TOOLBAR_ICON_SIZE} />}
          tooltip={'Connect'}
        />
      </Toolbar.Root>
    </div>
  )
}