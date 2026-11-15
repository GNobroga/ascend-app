import type { Meta, StoryObj } from "@storybook/react-vite"
import { CircleAlertIcon, InfoIcon } from "lucide-react"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert"
import { Button } from "./button"

const meta = {
  title: "UI/Alert",
  component: Alert,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive"],
    },
  },
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <InfoIcon />
      <AlertTitle>Atualização disponível</AlertTitle>
      <AlertDescription>
        Uma nova versão do app está disponível. Recarregue a página para usar.
      </AlertDescription>
    </Alert>
  ),
} satisfies Meta<typeof Alert>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Destructive: Story = {
  args: { variant: "destructive" },
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <CircleAlertIcon />
      <AlertTitle>Não foi possível entrar</AlertTitle>
      <AlertDescription>E-mail ou senha incorretos.</AlertDescription>
    </Alert>
  ),
}

export const WithoutIcon: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <AlertTitle>Sem ícone</AlertTitle>
      <AlertDescription>O alerta também funciona só com texto.</AlertDescription>
    </Alert>
  ),
}

export const TitleOnly: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <InfoIcon />
      <AlertTitle>Suas alterações foram salvas.</AlertTitle>
    </Alert>
  ),
}

export const WithAction: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <InfoIcon />
      <AlertTitle>Sessão expirando</AlertTitle>
      <AlertDescription>Sua sessão expira em 5 minutos.</AlertDescription>
      <AlertAction>
        <Button type="button" size="xs" variant="outline">
          Renovar
        </Button>
      </AlertAction>
    </Alert>
  ),
}
