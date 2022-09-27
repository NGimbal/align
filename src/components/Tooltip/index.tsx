import React, { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react'

import * as RadixTooltip from '@radix-ui/react-tooltip'

interface TooltipProps {
  content: React.ReactNode | string
  side?: 'top' | 'right' | 'bottom' | 'left'
  children?: React.ReactNode,
  style?: CSSProperties,
}

const { Root, Trigger, Content, Arrow } = RadixTooltip

export const Tooltip: FC<TooltipProps> = ({
  content,
  side,
  children,
  style
}) => {

  return (
    <Root delayDuration={10}>
      <Trigger asChild>
        {children}
      </Trigger>
      <Content
        className='tooltip-content'
        portalled={true}
        side={side}
        style={{
          zIndex: 9999,
          ...style
        }}
      >
        {content}
        <Arrow style={{ fill: 'var(--color-warmblue)' }} />
      </Content>
    </Root>
  )
}