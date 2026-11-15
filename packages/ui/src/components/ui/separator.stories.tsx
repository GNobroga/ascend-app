import type { Meta, StoryObj } from "@storybook/react-vite"
import { Separator } from "./separator"

const meta = {
  title: "UI/Separator",
  component: Separator,
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
} satisfies Meta<typeof Separator>

export default meta

type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: (args) => (
    <div className="w-80 text-sm">
      <div className="font-medium">Ascend</div>
      <p className="text-muted-foreground">Agendamentos sem complicação.</p>
      <Separator {...args} className="my-4" />
      <p>Conteúdo abaixo do separador.</p>
    </div>
  ),
}

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="flex h-5 items-center gap-4 text-sm">
      <span>Agenda</span>
      <Separator {...args} />
      <span>Clientes</span>
      <Separator {...args} />
      <span>Serviços</span>
    </div>
  ),
}
