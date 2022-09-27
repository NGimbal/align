import React, { FC, CSSProperties } from 'react'
import { Tooltip } from '../Tooltip'

interface ToolbarButtonProps {
  icon?: React.ReactNode
  active?: boolean
  disabled?: boolean
  label?: string
  onClick?: () => void
  tooltip?: string
  style?: CSSProperties
}

export const ToolbarButton = ({
  icon,
  active,
  disabled,
  label,
  onClick,
  tooltip,
  style,
}: ToolbarButtonProps): React.ReactElement => {

  if (tooltip) {
    return (
      <Tooltip content={tooltip} side='top'>
        <button
          disabled={typeof disabled === 'boolean' ? disabled : false}
          className={`toolbar-button ${active ? 'active' : ''}`}
          onClick={onClick}
          type='button'
        >
          <span className='toolbar-icon'>
            {icon && icon}
            {label && label}
          </span>
        </button>
      </Tooltip>
    )
  } else {
    return (
      <button
        disabled={typeof disabled === 'boolean' ? disabled : false}
        className={`toolbar-button ${active ? 'active' : ''}`}
        onClick={onClick}
        type='button'
      >
        <span className='toolbar-icon'>
          {icon && icon}
          {label && label}
        </span>
      </button>
    )
  }
}