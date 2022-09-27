import React, { CSSProperties, FC, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

import { ColorSwatchButton } from '../ColorSwatchButton'
import { Popover } from '../Popover'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
  style?: CSSProperties
}

export const ColorPicker: FC<ColorPickerProps> = ({
  value,
  onChange,
  disabled,
  style
}) => {

  // const [color, setColor] = useState(defaultValue);

  return (
    <Popover
      trigger={
        <ColorSwatchButton
          defaultValue={value}
          disabled={disabled}
          style={style}
        />
      }
    >
      <div
        className='color-picker'
        style={{
          margin: 0,
          padding: 0
        }}
      >
        <HexColorPicker
          className='color-picker'
          defaultValue={value}
          onChange={onChange}
        />
      </div>
    </Popover>
  )
}