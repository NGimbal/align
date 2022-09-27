import React, { FC } from 'react'

import * as RadixSlider from '@radix-ui/react-slider'

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  style?: React.CSSProperties
  sliderProps?: RadixSlider.SliderProps
}

const { Root, Track, Range, Thumb } = RadixSlider

export const Slider: FC<SliderProps> = ({ value, onValueChange, style }) => {

  return (
    <Root
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        userSelect: 'none',
        touchAction: 'none',
        height: 16,
        width: '100%',
        ...style
      }}
      value={value}
      orientation='horizontal'
      onValueChange={onValueChange}
    >
      <Track
        style={{
          backgroundColor: 'var(--color-grey5)',
          position: 'relative',
          flexGrow: 1,
          borderRadius: 999,
          height: 3,
        }}
      >
        <Range
          style={{
            position: 'absolute',
            backgroundColor: 'var(--color-warmblue)',
            borderRadius: 999,
            height: '100%'
          }}
        />
      </Track>
      <Thumb
        style={{
          display: 'block',
          width: 16,
          height: 16,
          backgroundColor: 'var(--color-warmblue)',
          boxShadow: '0 2px 10px var(--color-grey5)',
          borderRadius: 10
        }}
      />
    </Root>
  )
}