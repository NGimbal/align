import React, { FC, ReactNode, } from 'react'

import * as RadixContextMenu from '@radix-ui/react-context-menu'

interface ContextMenuProps {
  trigger: ReactNode,
  children?: ReactNode
}

const { Root, Content, Trigger, Item } = RadixContextMenu

export const ContextMenu: FC<ContextMenuProps> = ({
  trigger,
  children
}) => {
  return (
    <Root>
      <Trigger
        asChild
      >
        {trigger}
      </Trigger>
      <Content
        style={{
          backgroundColor: 'var(--color-grey1)',
          borderRadius: 4,
          border: '1px solid var(--color-warmblue)',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minWidth: 160
        }}
      >
        {children}
      </Content>
    </Root>
  )
}