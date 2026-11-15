import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "./button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"

const meta = {
  title: "UI/Card",
  component: Card,
  argTypes: {
    size: {
      control: "select",
      options: ["default", "sm"],
    },
  },
  render: (args) => (
    <Card {...args} className="w-96">
      <CardHeader>
        <CardTitle>Barbearia Central</CardTitle>
        <CardDescription>Rua das Flores, 123 · Centro</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Corte, barba e tratamentos capilares com hora marcada.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button type="button">Agendar</Button>
        <Button type="button" variant="outline">
          Ver detalhes
        </Button>
      </CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = {
  args: { size: "sm" },
}

export const WithAction: Story = {
  render: (args) => (
    <Card {...args} className="w-96">
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>Você tem 3 mensagens não lidas.</CardDescription>
        <CardAction>
          <Button type="button" size="sm" variant="ghost">
            Marcar como lidas
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Seu agendamento de amanhã foi confirmado.</p>
      </CardContent>
    </Card>
  ),
}

export const WithBorders: Story = {
  render: (args) => (
    <Card {...args} className="w-96">
      <CardHeader className="border-b">
        <CardTitle>Resumo</CardTitle>
        <CardDescription>Agendamentos desta semana</CardDescription>
      </CardHeader>
      <CardContent>
        <p>12 agendamentos confirmados.</p>
      </CardContent>
      <CardFooter className="border-t">
        <Button type="button" variant="link">
          Ver todos
        </Button>
      </CardFooter>
    </Card>
  ),
}
