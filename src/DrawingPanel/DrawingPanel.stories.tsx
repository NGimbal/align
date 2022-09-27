import React from 'react'
import { DrawingPanel } from './DrawingPanel'
import { DrawingPanelProps } from './DrawingPanel'

import { Story, Meta } from '@storybook/react'

export default {
  title: 'Drawing Panel',
  component: DrawingPanel,
} as Meta

const Template: Story<DrawingPanelProps> = (args) => <div style={{ display: 'grid', height: '100%' }}> <DrawingPanel {...args} /> </div>

export const Default = Template.bind({})

Default.args = {
  foo:'bar'
}