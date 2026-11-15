import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "./button"
import { Toaster, toast } from "./sonner"

const meta = {
  title: "UI/Sonner",
  component: Toaster,
  args: {
    position: "bottom-right",
  },
  argTypes: {
    position: {
      control: "select",
      options: ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"],
    },
  },
  decorators: [
    (Story) => (
      <>
        <Story />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => toast("Agendamento criado")}>
            Padrão
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => toast("Agendamento criado", { description: "Quinta, 23 de outubro às 14h" })}
          >
            Com descrição
          </Button>
          <Button type="button" variant="outline" onClick={() => toast.success("Alterações salvas")}>
            Sucesso
          </Button>
          <Button type="button" variant="outline" onClick={() => toast.info("Nova versão disponível")}>
            Info
          </Button>
          <Button type="button" variant="outline" onClick={() => toast.warning("Sessão expirando")}>
            Aviso
          </Button>
          <Button type="button" variant="outline" onClick={() => toast.error("Algo deu errado")}>
            Erro
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
                loading: "Salvando...",
                success: "Salvo",
                error: "Falha ao salvar",
              })
            }
          >
            Promise
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              toast("Agendamento cancelado", {
                action: { label: "Desfazer", onClick: () => toast.success("Agendamento restaurado") },
              })
            }
          >
            Com ação
          </Button>
        </div>
      </>
    ),
  ],
} satisfies Meta<typeof Toaster>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const RichColors: Story = {
  args: { richColors: true },
}
