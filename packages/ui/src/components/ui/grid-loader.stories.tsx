import type { Meta, StoryObj } from "@storybook/react-vite"
import { GridLoader } from "./grid-loader"

const meta = {
  title: "UI/GridLoader",
  component: GridLoader,
} satisfies Meta<typeof GridLoader>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      <GridLoader {...args} className="size-5" />
      <GridLoader {...args} />
      <GridLoader {...args} className="size-12" />
    </div>
  ),
}

export const Colors: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      <GridLoader {...args} />
      <GridLoader {...args} className="text-muted-foreground" />
      <GridLoader {...args} className="text-foreground" />
    </div>
  ),
}
