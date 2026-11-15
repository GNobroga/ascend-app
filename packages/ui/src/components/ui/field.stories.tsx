import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "./button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field"
import { Input } from "./input"

const meta = {
  title: "UI/Field",
  component: Field,
  argTypes: {
    orientation: {
      control: "select",
      options: ["vertical", "horizontal", "responsive"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Field {...args}>
      <FieldLabel htmlFor="field-email">E-mail</FieldLabel>
      <Input id="field-email" type="email" placeholder="seu@email.com" />
      <FieldDescription>Usaremos para enviar a confirmação do agendamento.</FieldDescription>
    </Field>
  ),
} satisfies Meta<typeof Field>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Horizontal: Story = {
  args: { orientation: "horizontal" },
}

export const Invalid: Story = {
  render: (args) => (
    <Field {...args} data-invalid>
      <FieldLabel htmlFor="field-invalid">E-mail</FieldLabel>
      <Input id="field-invalid" type="email" aria-invalid defaultValue="email-invalido" />
      <FieldError>Informe um e-mail válido.</FieldError>
    </Field>
  ),
}

export const MultipleErrors: Story = {
  render: (args) => (
    <Field {...args} data-invalid>
      <FieldLabel htmlFor="field-password">Senha</FieldLabel>
      <Input id="field-password" type="password" aria-invalid defaultValue="123" />
      <FieldError
        errors={[
          { message: "A senha deve ter pelo menos 8 caracteres." },
          { message: "A senha deve conter pelo menos uma letra." },
          { message: "A senha deve ter pelo menos 8 caracteres." },
        ]}
      />
    </Field>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <Field {...args} data-disabled>
      <FieldLabel htmlFor="field-disabled">E-mail</FieldLabel>
      <Input id="field-disabled" type="email" disabled placeholder="seu@email.com" />
    </Field>
  ),
}

export const WithContent: Story = {
  args: { orientation: "horizontal" },
  render: (args) => (
    <Field {...args}>
      <FieldContent>
        <FieldTitle>Lembretes por e-mail</FieldTitle>
        <FieldDescription>Receba um lembrete um dia antes de cada agendamento.</FieldDescription>
      </FieldContent>
      <Button type="button" variant="outline" size="sm">
        Ativar
      </Button>
    </Field>
  ),
}

export const WithSeparator: Story = {
  render: () => (
    <FieldGroup>
      <FieldSeparator />
      <FieldSeparator>ou continue com</FieldSeparator>
    </FieldGroup>
  ),
}

export const Form: Story = {
  render: () => (
    <form>
      <FieldSet>
        <FieldLegend>Criar conta</FieldLegend>
        <FieldDescription>Preencha seus dados para começar.</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="form-name">Nome</FieldLabel>
            <Input id="form-name" placeholder="Maria Silva" />
          </Field>
          <Field>
            <FieldLabel htmlFor="form-email">E-mail</FieldLabel>
            <Input id="form-email" type="email" placeholder="seu@email.com" />
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="form-password">Senha</FieldLabel>
            <Input id="form-password" type="password" aria-invalid />
            <FieldError>A senha deve ter pelo menos 8 caracteres.</FieldError>
          </Field>
          <Field>
            <Button type="submit">Criar conta</Button>
          </Field>
          <FieldSeparator>ou</FieldSeparator>
          <Field>
            <Button type="button" variant="secondary">
              Continuar com Google
            </Button>
          </Field>
        </FieldGroup>
      </FieldSet>
    </form>
  ),
}
