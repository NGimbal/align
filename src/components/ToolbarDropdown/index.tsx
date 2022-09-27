import React, { FC, CSSProperties } from 'react'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CheckCircle } from 'react-bootstrap-icons'
import { Tooltip } from '../Tooltip'
import { Separator } from '@radix-ui/react-separator'

interface TooblarDropdownProps {
  options: {
    value: string
    label?: string
    onClick?: () => void
    checked?: boolean
    disabled?: boolean
    keyCut?: string
    icon?: React.ReactNode
  }[][]
  onValueChange?: (val: string) => void
  triggerIcon: React.ReactNode
  tooltip: string
  style?: CSSProperties
}

export const TooblarDropdown: FC<TooblarDropdownProps> = ({
  options,
  onValueChange,
  triggerIcon,
  tooltip,
  style
}) => {

  return (
    <DropdownMenu.Root>
      <Tooltip content={tooltip} side='top'>
        <DropdownMenu.Trigger style={{ ...style, display: 'flex' }} className='toolbar-button'>
          {triggerIcon}
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Content className='dropdown-content'>
        {options.map((group, i, a) =>
          <div key={i}>
            {group.map((o, i) => (
              <DropdownMenu.CheckboxItem
                key={`${o}-${i}`}
                className='dropdown-item'
                onClick={typeof o.onClick === 'function' ?
                  o.onClick :
                  typeof onValueChange === 'function' ?
                    () => onValueChange(o.value) : undefined
                }
                checked={typeof o.checked === 'boolean' && o.checked}
                disabled={typeof o.disabled === 'boolean' && o.disabled}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyItems: 'center',
                    width: 16,
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {typeof o.icon !== 'undefined' ? o.icon :
                    <DropdownMenu.ItemIndicator
                      style={{
                        display: 'flex'
                      }}
                    >
                      <CheckCircle />
                    </DropdownMenu.ItemIndicator>
                  }
                </div>
                {o.label ? o.label : o.value.charAt(0).toUpperCase() + o.value.slice(1)}
                <div
                  style={{
                    marginLeft: 'auto',
                    paddingLeft: 20,
                  }}
                >
                  {o.keyCut}
                </div>
              </DropdownMenu.CheckboxItem>
            ))}
            {(i !== a.length - 1) && <Separator className='separator-02' />}
          </div>
        )}
        <DropdownMenu.Arrow style={{ fill: 'var(--color-warmblue)' }} />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}