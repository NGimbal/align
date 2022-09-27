module.exports = (componentName) => ({
  content: `// Generated with util/create-component.js
import React from "react";
import ${componentName} from "./${componentName}";
import { ${componentName}Props } from "./${componentName}.types";

import { Story, Meta } from '@storybook/react';

export default {
    title: "${componentName}",
    component: ${componentName},
} as Meta;

const Template: Story<${componentName}Props> = (args) => <${componentName} {...args} />

export const Default = Template.bind({})

Default.args = {
  foo="bar"
}

`,
  extension: '.stories.tsx'
})