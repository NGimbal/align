import React, { FC, CSSProperties, ReactNode } from 'react'

import * as RadixLabel from '@radix-ui/react-label'

const { Root } = RadixLabel

interface InputLabelProps {
  label: string
  style?: CSSProperties
}

export const InputLabel: FC<InputLabelProps> = ({ label, children, style }) => {

  return (
    <Root style={style} className='input-label'>
      {label}
    </Root>
  )
}