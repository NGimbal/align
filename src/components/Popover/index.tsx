import React, { FC, useState } from 'react'

import * as RadixPopover from '@radix-ui/react-popover'
import { X } from 'react-bootstrap-icons'

const { Root, Trigger, Anchor, Content, Close, Arrow, } = RadixPopover

interface PopoverProps {
  trigger: React.ReactNode
}

export const Popover: FC<PopoverProps> = ({
  trigger,
  children
}) => {

  return (
    <Root>
      <Trigger
        style={{
          backgroundColor: 'none',
          border: 'none',
          padding: '0',
          margin: '0'
        }}
        asChild
      >
        <Anchor>
          {trigger}
        </Anchor>
      </Trigger>
      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          minWidth: 100,
          minHeight: 100,
          background: 'white',
          padding: 0,
          border: '1px solid var(--color-warmblue)',
          borderRadius: 4
        }}
        side='right'
      >
        <Close asChild>
          <X className='icon-solo-button'
            style={{
              alignSelf: 'flex-end',
            }}
          />
        </Close>
        <Arrow style={{
          fill: 'var(--color-warmblue)',
        }} />
        {children}
      </Content>
    </Root >
  )
}