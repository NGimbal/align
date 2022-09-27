import React, { FC, CSSProperties, useState } from 'react'

interface ColorSwatchButtonProps {
  defaultValue?: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  style?: CSSProperties
}

export const ColorSwatchButton: FC<ColorSwatchButtonProps> = ({
  defaultValue,
  active,
  disabled,
  onClick,
  style
}) => {

  const [color, setColor] = useState<string>(defaultValue ?? '#ffffff')

  return (
    <button
      // @ts-ignore
      className={`color-swatch-button ${active && 'active'}`}
      style={{
        backgroundColor: disabled ? 'var(--color-grey3)' : color,
        ...style
      }}
      disabled={disabled}
      key={color}
      onClick={onClick}
    />
  )
}