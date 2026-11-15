import type { Meta, StoryObj } from "@storybook/react-vite"
import { Input } from "./input"

const meta = {
  title: "UI/Input",
  component: Input,
  args: {
    type: "email",
    placeholder: "seu@email.com",
  },
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search", "tel", "url", "date", "file"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithValue: Story = {
  args: { defaultValue: "maria@exemplo.com" },
}

export const Password: Story = {
  args: { type: "password", placeholder: "Senha", defaultValue: "segredo123" },
}

export const File: Story = {
  args: { type: "file", placeholder: undefined },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "email-invalido" },
}
