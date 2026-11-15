import type { Meta, StoryObj } from "@storybook/react-vite"
import { PasswordInput } from "./password-input"

const meta = {
  title: "UI/PasswordInput",
  component: PasswordInput,
  args: {
    placeholder: "Senha",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PasswordInput>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithValue: Story = {
  args: { defaultValue: "segredo123" },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "segredo123" },
}

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "123" },
}
